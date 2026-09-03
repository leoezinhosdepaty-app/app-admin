import express from "express";
import crypto from "crypto";
import { db } from "./db.js";
import { exigirAuth } from "./auth.js";

export const router = express.Router();

// nome da escola por unidade — usado nas mensagens de boas-vindas
const nomeEscola = (unidade) =>
  unidade === "MPAC" ? "Leõezinhos do MPAC" : unidade === "INSA" ? "Leõezinhos de Paty" : "Leõezinhos";

const MENSAGENS = {
  matricula: ({ nome, url, aluno }) =>
    `Oi, ${nome}! 🦁 Segue o link da ficha de matrícula${aluno ? ` do(a) ${aluno}` : ""}. Pode preencher direto por aqui:\n${url}`,
  anamnese: ({ nome, url, aluno }) =>
    `Oi, ${nome}! Precisamos de algumas informações de saúde${aluno ? ` do(a) ${aluno}` : ""} pra deixar tudo certinho antes do início dos treinos. Preenche por aqui:\n${url}`,
  experimental: ({ nome, url }) =>
    `Oi, ${nome}! Segue o formulário pra agendar a aula experimental. É rapidinho:\n${url}`,
  contrato: ({ nome, url, aluno }) =>
    `Oi, ${nome}! Segue o contrato de matrícula${aluno ? ` do(a) ${aluno}` : ""} pra leitura e assinatura eletrônica:\n${url}`,
  processo: ({ nome, url, aluno, unidade }) =>
    `Oi, ${nome}! 🦁⚽ Que alegria ter ${aluno ? `o(a) ${aluno}` : "você"} com a gente na ${nomeEscola(unidade)}!\n\n` +
    `Vamos finalizar a matrícula — é rapidinho, em 3 passos (ficha, anamnese e contrato):\n${url}\n\nQualquer dúvida, é só chamar!`,
};

router.post("/api/convites", exigirAuth, express.json(), async (req, res) => {
  const { tipo, aluno_id, experimental_id, enviar = true } = req.body ?? {};
  if (!tipo || !["matricula", "anamnese", "experimental", "contrato", "processo"].includes(tipo)) {
    return res.status(400).json({ error: "tipo inválido" });
  }
  if (!aluno_id && !experimental_id && !["experimental", "processo"].includes(tipo)) {
    return res.status(400).json({ error: "aluno_id ou experimental_id é obrigatório" });
  }

  const token = crypto.randomBytes(16).toString("hex");
  const { data: convite, error } = await db.from("convites").insert({
    token, tipo, aluno_id: aluno_id ?? null, experimental_id: experimental_id ?? null,
  }).select().single();
  if (error) return res.status(400).json({ error: error.message });

  const url_publica = `${process.env.FRONTEND_URL}/convite/${token}`;

  // descobre nome do aluno + telefone/nome do responsável + unidade, pra montar a mensagem
  let responsavel = null;
  let alunoNome = null;
  let unidade = null;
  if (aluno_id) {
    const { data } = await db.from("alunos")
      .select("nome, responsaveis(nome, telefone), turmas(locais(nome))").eq("id", aluno_id).maybeSingle();
    responsavel = data?.responsaveis;
    alunoNome = data?.nome;
    unidade = data?.turmas?.locais?.nome;
  } else if (experimental_id) {
    const { data } = await db.from("experimentais")
      .select("responsavel_nome, telefone, aluno_nome, turmas(locais(nome))").eq("id", experimental_id).maybeSingle();
    responsavel = data ? { nome: data.responsavel_nome, telefone: data.telefone } : null;
    alunoNome = data?.aluno_nome;
    unidade = data?.turmas?.locais?.nome;
  }

  if (enviar && responsavel?.telefone) {
    await db.from("mensagens").insert({
      telefone: responsavel.telefone,
      aluno_id: aluno_id ?? null,
      tipo: `convite_${tipo}`,
      corpo: MENSAGENS[tipo]({ nome: responsavel.nome, url: url_publica, aluno: alunoNome, unidade }),
      agendada_para: new Date().toISOString(),
    });
  }

  return res.json({ convite, url_publica, enfileirado: enviar && !!responsavel?.telefone });
});

router.get("/api/alunos/:id/contrato", exigirAuth, async (req, res) => {
  const { data: doc } = await db.from("documentos")
    .select("arquivo_url").eq("aluno_id", req.params.id).eq("tipo", "contrato").maybeSingle();
  if (!doc?.arquivo_url) return res.status(404).json({ error: "sem contrato gerado ainda" });

  // arquivo_url guarda o caminho no bucket; gera uma signed URL nova (a antiga pode ter expirado)
  const { data, error } = await db.storage.from("documentos").createSignedUrl(doc.arquivo_url, 60 * 60);
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ url: data.signedUrl });
});
