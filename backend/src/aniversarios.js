import { db } from "./db.js";
import { gerarImagemAniversario } from "./aniversarioImagem.js";

// grupo interno do WhatsApp (staff) onde avisamos aniversário — não é o aluno/responsável
const GRUPO_ANIVERSARIO_JID = process.env.UAZAPI_GRUPO_ANIVERSARIO_JID;

/* Manda uma mensagem de parabéns pra quem faz aniversário hoje.
   Só alunos com matrícula de verdade (ativo/inadimplente) — não manda
   pra quem tá só na fase de experimental/pendente. */
export async function mensagensAniversarioAlunos() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  const dia = hoje.getDate();

  const { data: alunos, error } = await db
    .from("alunos")
    .select("id, nome, nascimento, foto_url, status, responsaveis ( nome, telefone )")
    .in("status", ["ativo", "inadimplente"]);
  if (error) { console.error("mensagensAniversarioAlunos:", error); return; }

  const aniversariantes = (alunos ?? []).filter((a) => {
    if (!a.nascimento) return false;
    const [, m, d] = a.nascimento.split("-").map(Number);
    return m === mes && d === dia;
  });

  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();

  for (const a of aniversariantes) {
    if (a.responsaveis?.telefone) {
      const { data: jaEnviada } = await db.from("mensagens")
        .select("id").eq("aluno_id", a.id).eq("tipo", "aniversario").gte("criado_em", inicioHoje).maybeSingle();
      if (!jaEnviada) {
        await db.from("mensagens").insert({
          telefone: a.responsaveis.telefone,
          aluno_id: a.id,
          tipo: "aniversario",
          corpo: `Feliz aniversário, ${a.nome}! 🎉🦁\n\nToda a equipe Leõezinhos de Paty deseja um dia incrível e um ano novo cheio de gols dentro e fora de campo! ⚽💚`,
        });
      }
    }

    if (GRUPO_ANIVERSARIO_JID) {
      await avisarGrupoInterno(a, inicioHoje);
    }
  }
}

/* Avisa o grupo interno da equipe (staff only, aluno não participa) com a
   foto do aluno colada no template de aniversário. Sem foto cadastrada,
   manda só o texto — o worker já sabe fazer isso sozinho (mensagens.midia_url null). */
async function avisarGrupoInterno(a, inicioHoje) {
  const { data: jaAvisado } = await db.from("mensagens")
    .select("id").eq("aluno_id", a.id).eq("tipo", "aniversario_grupo").gte("criado_em", inicioHoje).maybeSingle();
  if (jaAvisado) return;

  let midiaUrl = null;
  if (a.foto_url) {
    try {
      const imagemBuffer = await gerarImagemAniversario(a.foto_url);
      const caminho = `aniversarios/${a.id}-${Date.now()}.jpg`;
      const { error: erroUpload } = await db.storage.from("eventos").upload(caminho, imagemBuffer, {
        contentType: "image/jpeg", upsert: true,
      });
      if (erroUpload) {
        console.error("aniversarios: falha ao subir imagem do grupo:", erroUpload);
      } else {
        midiaUrl = db.storage.from("eventos").getPublicUrl(caminho).data.publicUrl;
      }
    } catch (e) {
      console.error("aniversarios: falha ao gerar imagem do grupo:", e.message);
    }
  }

  await db.from("mensagens").insert({
    telefone: GRUPO_ANIVERSARIO_JID,
    aluno_id: a.id,
    tipo: "aniversario_grupo",
    corpo: `Hoje é aniversário do(a) ${a.nome}! 🎉🦁 Vamos dar os parabéns!`,
    midia_url: midiaUrl,
  });
}
