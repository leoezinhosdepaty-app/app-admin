import express from "express";
import { db } from "./db.js";
import { exigirAuth } from "./auth.js";
import { criarLink } from "./infinitepay.js";

export const router = express.Router();

/* ---------------------------------------------------------------
   Cobrança manual criada pelo painel (equipe autenticada).
   --------------------------------------------------------------- */
router.post("/api/cobrancas", exigirAuth, express.json(), async (req, res) => {
  const { aluno_id, descricao, valor } = req.body ?? {};
  if (!aluno_id || !descricao || !(Number(valor) > 0)) {
    return res.status(400).json({ error: "aluno_id, descricao e valor (> 0) são obrigatórios" });
  }

  const { data: aluno, error: erroAluno } = await db
    .from("alunos")
    .select(`id, nome,
             turmas ( locais ( id, nome ) ),
             responsaveis ( nome, email, telefone )`)
    .eq("id", aluno_id)
    .maybeSingle();
  if (erroAluno) return res.status(400).json({ error: erroAluno.message });
  if (!aluno) return res.status(404).json({ error: "aluno não encontrado" });

  const unidade = aluno.turmas?.locais?.nome;
  const local_id = aluno.turmas?.locais?.id;
  if (!unidade || !local_id) return res.status(400).json({ error: "aluno sem turma/unidade definida" });

  const { data: cob, error: erroCob } = await db.from("cobrancas").insert({
    aluno_id,
    local_id,
    descricao,
    valor: Number(valor),
    vencimento: new Date().toISOString().slice(0, 10),
    status: "aberto",
  }).select().single();
  if (erroCob) return res.status(400).json({ error: erroCob.message });

  try {
    const url = await criarLink({
      id: cob.id, unidade, valor: cob.valor, descricao,
      responsavel_nome: aluno.responsaveis?.nome,
      responsavel_email: aluno.responsaveis?.email,
      responsavel_telefone: aluno.responsaveis?.telefone,
    });
    return res.json({ cobranca: cob, url });
  } catch (e) {
    return res.status(502).json({ error: e.message, cobranca: cob });
  }
});
