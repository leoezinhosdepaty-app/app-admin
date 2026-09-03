import { db } from "./db.js";

/* Manda uma mensagem de parabéns pra quem faz aniversário hoje.
   Só alunos com matrícula de verdade (ativo/inadimplente) — não manda
   pra quem tá só na fase de experimental/pendente. */
export async function mensagensAniversarioAlunos() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  const dia = hoje.getDate();

  const { data: alunos, error } = await db
    .from("alunos")
    .select("id, nome, nascimento, status, responsaveis ( nome, telefone )")
    .in("status", ["ativo", "inadimplente"]);
  if (error) { console.error("mensagensAniversarioAlunos:", error); return; }

  const aniversariantes = (alunos ?? []).filter((a) => {
    if (!a.nascimento) return false;
    const [, m, d] = a.nascimento.split("-").map(Number);
    return m === mes && d === dia;
  });

  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();

  for (const a of aniversariantes) {
    if (!a.responsaveis?.telefone) continue;

    const { data: jaEnviada } = await db.from("mensagens")
      .select("id").eq("aluno_id", a.id).eq("tipo", "aniversario").gte("criado_em", inicioHoje).maybeSingle();
    if (jaEnviada) continue;

    await db.from("mensagens").insert({
      telefone: a.responsaveis.telefone,
      aluno_id: a.id,
      tipo: "aniversario",
      corpo: `Feliz aniversário, ${a.nome}! 🎉🦁\n\nToda a equipe Leõezinhos de Paty deseja um dia incrível e um ano novo cheio de gols dentro e fora de campo! ⚽💚`,
    });
  }
}
