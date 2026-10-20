import { db } from "./db.js";

const normalizarTelefone = (t) => {
  const d = String(t ?? "").replace(/\D/g, "");
  return d.length === 10 || d.length === 11 ? `55${d}` : d;
};

/* Marca o contato como Oportunidade (tela Oportunidades = conversas com oportunidade=true).
   Usado quando alguém agenda uma aula experimental: é um interessado que ainda não é aluno.
   Reaproveita a conversa se já existir (casa pelos 8 últimos dígitos, por causa do 55 e do
   9º dígito); senão cria. */
export async function marcarOportunidade(telefone, nome) {
  const tel = normalizarTelefone(telefone);
  if (tel.length < 10) return;
  const { data: existentes } = await db.from("conversas").select("telefone, nome").like("telefone", `%${tel.slice(-8)}`);
  const existente = existentes?.[0];
  if (existente) {
    await db.from("conversas").update({ oportunidade: true, ...(existente.nome ? {} : { nome }) }).eq("telefone", existente.telefone);
  } else {
    await db.from("conversas").insert({ telefone: tel, nome, oportunidade: true });
  }
}
