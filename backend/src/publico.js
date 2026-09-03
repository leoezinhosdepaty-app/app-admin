import express from "express";
import { db } from "./db.js";
import { criarLink } from "./infinitepay.js";
import { montarTextoContrato, montarTextoParaLeitura, gerarESalvarContrato } from "./contrato.js";

export const router = express.Router();
router.use(express.json());

async function buscarConvite(token) {
  const { data: convite } = await db.from("convites").select("*").eq("token", token).maybeSingle();
  return convite;
}

/* ---------------------------------------------------------------
   Dados pra pré-preencher o formulário certo, + progresso do
   processo (quais etapas já foram concluídas).
   --------------------------------------------------------------- */
router.get("/api/publico/convite/:token", async (req, res) => {
  const convite = await buscarConvite(req.params.token);
  if (!convite) return res.status(404).json({ error: "convite não encontrado" });

  const [{ data: turmas }, { data: planos }] = await Promise.all([
    db.from("turmas").select("id, dias, horario, idade_min, idade_max, locais(id, nome)").eq("ativo", true),
    db.from("planos").select("id, nome, frequencia_semanal, valor").eq("ativo", true),
  ]);

  let aluno = null, experimental = null, anamnese = null, contrato = null;

  if (convite.aluno_id) {
    const { data } = await db.from("alunos")
      .select(`id, nome, nascimento, categoria, tamanho_uniforme, turma_id,
               responsaveis ( nome, rg, cpf, telefone, email, instagram, endereco ),
               matriculas ( plano_id, dia_vencimento, valor_mensalidade, ativa )`)
      .eq("id", convite.aluno_id).maybeSingle();
    aluno = data;
    const { data: anam } = await db.from("anamneses").select("*").eq("aluno_id", convite.aluno_id).maybeSingle();
    anamnese = anam;
    const { data: doc } = await db.from("documentos").select("assinado_em").eq("aluno_id", convite.aluno_id).eq("tipo", "contrato").maybeSingle();
    contrato = doc;
  } else if (convite.experimental_id) {
    const { data } = await db.from("experimentais").select("*").eq("id", convite.experimental_id).maybeSingle();
    experimental = data;
  }

  return res.json({
    tipo: convite.tipo,
    usado_em: convite.usado_em,
    aluno, experimental, anamnese, contrato,
    turmas, planos,
    progresso: {
      matricula: !!aluno,
      anamnese: !!anamnese,
      contrato: !!contrato?.assinado_em,
    },
  });
});

/* ---------------------------------------------------------------
   Aula experimental — cria um lead novo em `experimentais`.
   --------------------------------------------------------------- */
router.post("/api/publico/convite/:token/experimental", async (req, res) => {
  const convite = await buscarConvite(req.params.token);
  if (!convite) return res.status(404).json({ error: "convite não encontrado" });

  const { aluno_nome, aluno_nascimento, responsavel_nome, telefone, email, turma_id, categoria, data_aula } = req.body ?? {};
  if (!aluno_nome || !responsavel_nome || !telefone) {
    return res.status(400).json({ error: "aluno_nome, responsavel_nome e telefone são obrigatórios" });
  }

  const { data, error } = await db.from("experimentais").insert({
    aluno_nome, aluno_nascimento: aluno_nascimento || null, responsavel_nome, telefone, email: email || null,
    turma_id: turma_id || null, categoria: categoria || null, data_aula: data_aula || null, origem: `convite:${convite.token}`,
  }).select().single();
  if (error) return res.status(400).json({ error: error.message });

  await db.from("convites").update({ usado_em: new Date().toISOString() }).eq("id", convite.id);
  return res.json({ experimental: data });
});

/* ---------------------------------------------------------------
   Ficha de matrícula — cria/atualiza responsável + aluno + matrícula.
   --------------------------------------------------------------- */
router.post("/api/publico/convite/:token/matricula", async (req, res) => {
  const convite = await buscarConvite(req.params.token);
  if (!convite) return res.status(404).json({ error: "convite não encontrado" });

  const { responsavel, aluno, turma_id, plano_id, foto_base64 } = req.body ?? {};
  if (!responsavel?.nome || !responsavel?.cpf || !responsavel?.telefone || !aluno?.nome || !aluno?.nascimento || !turma_id || !plano_id) {
    return res.status(400).json({ error: "dados incompletos (responsável, aluno, turma e plano são obrigatórios)" });
  }

  let alunoId = convite.aluno_id;

  if (alunoId) {
    const { data: existente } = await db.from("alunos").select("responsavel_id").eq("id", alunoId).single();
    await db.from("responsaveis").update({
      nome: responsavel.nome, rg: responsavel.rg, cpf: responsavel.cpf, telefone: responsavel.telefone,
      email: responsavel.email, instagram: responsavel.instagram, endereco: responsavel.endereco,
    }).eq("id", existente.responsavel_id);
    await db.from("alunos").update({
      nome: aluno.nome, nascimento: aluno.nascimento, categoria: aluno.categoria,
      tamanho_uniforme: aluno.tamanho_uniforme, turma_id,
    }).eq("id", alunoId);
  } else {
    const { data: respExistente } = await db.from("responsaveis").select("id").eq("cpf", responsavel.cpf).maybeSingle();
    let responsavelId = respExistente?.id;
    if (!responsavelId) {
      const { data: novoResp, error: erroResp } = await db.from("responsaveis").insert({
        nome: responsavel.nome, rg: responsavel.rg, cpf: responsavel.cpf, telefone: responsavel.telefone,
        email: responsavel.email, instagram: responsavel.instagram, endereco: responsavel.endereco,
      }).select().single();
      if (erroResp) return res.status(400).json({ error: erroResp.message });
      responsavelId = novoResp.id;
    }

    const { data: novoAluno, error: erroAluno } = await db.from("alunos").insert({
      responsavel_id: responsavelId, nome: aluno.nome, nascimento: aluno.nascimento,
      categoria: aluno.categoria, tamanho_uniforme: aluno.tamanho_uniforme, turma_id, status: "pendente",
    }).select().single();
    if (erroAluno) return res.status(400).json({ error: erroAluno.message });
    alunoId = novoAluno.id;

    if (convite.experimental_id) {
      await db.from("experimentais").update({ aluno_id: alunoId, situacao: "convertida" }).eq("id", convite.experimental_id);
    }
    await db.from("convites").update({ aluno_id: alunoId }).eq("id", convite.id);
  }

  if (foto_base64) {
    const buffer = Buffer.from(foto_base64.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const { error: erroUpload } = await db.storage.from("alunos")
      .upload(`${alunoId}.jpg`, buffer, { contentType: "image/jpeg", upsert: true });
    if (!erroUpload) {
      const { data: pub } = db.storage.from("alunos").getPublicUrl(`${alunoId}.jpg`);
      await db.from("alunos").update({ foto_url: pub.publicUrl }).eq("id", alunoId);
    }
  }

  const { data: plano } = await db.from("planos").select("valor").eq("id", plano_id).single();
  const { data: matriculaAtiva } = await db.from("matriculas").select("id").eq("aluno_id", alunoId).eq("ativa", true).maybeSingle();
  if (matriculaAtiva) {
    await db.from("matriculas").update({ plano_id, valor_mensalidade: plano.valor }).eq("id", matriculaAtiva.id);
  } else {
    await db.from("matriculas").insert({
      aluno_id: alunoId, plano_id, dia_vencimento: 15, valor_mensalidade: plano.valor,
    });
  }

  if (convite.tipo === "matricula") {
    await db.from("convites").update({ usado_em: new Date().toISOString() }).eq("id", convite.id);
  }
  return res.json({ aluno_id: alunoId });
});

/* ---------------------------------------------------------------
   Anamnese
   --------------------------------------------------------------- */
router.post("/api/publico/convite/:token/anamnese", async (req, res) => {
  const convite = await buscarConvite(req.params.token);
  if (!convite) return res.status(404).json({ error: "convite não encontrado" });
  if (!convite.aluno_id) return res.status(400).json({ error: "ainda não há aluno vinculado a este convite" });

  const {
    doenca_preexistente, problema_fisico, condicao_neurologica, remedio_controlado,
    plano_saude, cartao_sus, contato_emergencia, autoriza_medico,
  } = req.body ?? {};

  const { error } = await db.from("anamneses").upsert({
    aluno_id: convite.aluno_id, doenca_preexistente, problema_fisico, condicao_neurologica,
    remedio_controlado, plano_saude, cartao_sus, contato_emergencia, autoriza_medico,
    preenchida_em: new Date().toISOString(),
  }, { onConflict: "aluno_id" });
  if (error) return res.status(400).json({ error: error.message });

  if (convite.tipo === "anamnese") {
    await db.from("convites").update({ usado_em: new Date().toISOString() }).eq("id", convite.id);
  }
  return res.json({ ok: true });
});

/* ---------------------------------------------------------------
   Texto do contrato pra leitura ANTES de assinar (mesmos dados já
   preenchidos, sem gerar PDF nem gravar nada).
   --------------------------------------------------------------- */
router.get("/api/publico/convite/:token/contrato-texto", async (req, res) => {
  const convite = await buscarConvite(req.params.token);
  if (!convite) return res.status(404).json({ error: "convite não encontrado" });
  if (!convite.aluno_id) return res.status(400).json({ error: "ainda não há aluno vinculado a este convite" });

  const { data: aluno } = await db.from("alunos")
    .select(`id, nome, nascimento, categoria,
             turmas ( dias, horario, locais ( id, nome, endereco ) ),
             responsaveis ( nome, rg, cpf, telefone, instagram, endereco ),
             matriculas ( valor_mensalidade, dia_vencimento, ativa, planos ( nome, frequencia_semanal ) )`)
    .eq("id", convite.aluno_id).single();

  const matricula = aluno.matriculas?.find((m) => m.ativa);
  if (!matricula) return res.status(400).json({ error: "aluno sem matrícula ativa" });

  try {
    const texto = montarTextoParaLeitura({
      aluno, responsavel: aluno.responsaveis, turma: aluno.turmas, local: aluno.turmas?.locais,
      plano: matricula.planos, matricula, autorizaImagem: req.query.autoriza_imagem === "true",
    });
    return res.json({ texto });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

/* ---------------------------------------------------------------
   Contrato — renderiza, assina eletronicamente, gera PDF + hash.
   Se for o processo completo, encadeia a 1ª cobrança (taxa + mensalidade).
   --------------------------------------------------------------- */
router.post("/api/publico/convite/:token/contrato", async (req, res) => {
  const convite = await buscarConvite(req.params.token);
  if (!convite) return res.status(404).json({ error: "convite não encontrado" });
  if (!convite.aluno_id) return res.status(400).json({ error: "ainda não há aluno vinculado a este convite" });

  const { nome_assinante, autoriza_imagem } = req.body ?? {};
  if (!nome_assinante?.trim()) return res.status(400).json({ error: "nome do assinante é obrigatório" });

  const { data: aluno } = await db.from("alunos")
    .select(`id, nome, nascimento, categoria,
             turmas ( dias, horario, locais ( id, nome, endereco ) ),
             responsaveis ( nome, rg, cpf, telefone, instagram, endereco ),
             matriculas ( valor_mensalidade, dia_vencimento, ativa, planos ( nome, frequencia_semanal ) )`)
    .eq("id", convite.aluno_id).single();

  const matricula = aluno.matriculas?.find((m) => m.ativa);
  if (!matricula) return res.status(400).json({ error: "aluno sem matrícula ativa" });

  let textoBase;
  try {
    textoBase = montarTextoContrato({
      aluno, responsavel: aluno.responsaveis, turma: aluno.turmas, local: aluno.turmas?.locais,
      plano: matricula.planos, matricula, autorizaImagem: !!autoriza_imagem,
    });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;
  const userAgent = req.headers["user-agent"];

  let salvo;
  try {
    salvo = await gerarESalvarContrato({ aluno, textoBase, ip, userAgent });
  } catch (e) {
    return res.status(500).json({ error: `falha ao gerar PDF: ${e.message}` });
  }

  const { error: erroDoc } = await db.from("documentos").upsert({
    aluno_id: aluno.id, tipo: "contrato", arquivo_url: salvo.caminho,
    assinante_nome: nome_assinante, assinante_cpf: aluno.responsaveis.cpf,
    assinado_em: new Date().toISOString(), ip, user_agent: userAgent, hash_sha256: salvo.hash,
  }, { onConflict: "aluno_id,tipo" });
  if (erroDoc) return res.status(400).json({ error: erroDoc.message });

  const resultado = { contrato_url: salvo.url };

  if (convite.tipo === "processo") {
    const unidade = aluno.turmas?.locais?.nome;
    const local_id = aluno.turmas?.locais?.id;
    const valorTotal = 50 + Number(matricula.valor_mensalidade);
    const descricao = `Matrícula + Mensalidade - ${aluno.nome}`;

    const { data: cob, error: erroCob } = await db.from("cobrancas").insert({
      aluno_id: aluno.id, local_id, descricao, valor: valorTotal,
      vencimento: new Date().toISOString().slice(0, 10), status: "aberto",
    }).select().single();

    if (!erroCob) {
      try {
        const url = await criarLink({
          id: cob.id, unidade, valor: valorTotal, descricao,
          responsavel_nome: aluno.responsaveis.nome,
          responsavel_telefone: aluno.responsaveis.telefone,
        });
        resultado.cobranca_url = url;
      } catch (e) {
        resultado.erro_cobranca = e.message;
      }
    }
  }

  if (["contrato", "processo"].includes(convite.tipo)) {
    await db.from("convites").update({ usado_em: new Date().toISOString() }).eq("id", convite.id);
  }
  return res.json(resultado);
});
