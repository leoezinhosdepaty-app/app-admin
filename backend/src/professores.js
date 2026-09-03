import express from "express";
import { db } from "./db.js";
import { exigirAuth } from "./auth.js";

export const router = express.Router();
router.use(express.json());

/* Cria (ou reseta) o login do professor — acesso restrito, sem financeiro,
   só enxerga alunos/experimental/eventos/painel e o próprio cadastro. */
router.post("/api/professores/:id/acesso", exigirAuth, async (req, res) => {
  const { email, senha } = req.body ?? {};
  if (!email || !senha) return res.status(400).json({ error: "email e senha são obrigatórios" });
  if (senha.length < 6) return res.status(400).json({ error: "a senha precisa ter pelo menos 6 caracteres" });

  const { data: professor } = await db.from("professores").select("id, nome, user_id").eq("id", req.params.id).maybeSingle();
  if (!professor) return res.status(404).json({ error: "professor não encontrado" });

  if (professor.user_id) {
    // já tem login — só atualiza e-mail/senha
    const { error } = await db.auth.admin.updateUserById(professor.user_id, { email, password: senha });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ ok: true, user_id: professor.user_id });
  }

  const { data: criado, error } = await db.auth.admin.createUser({
    email, password: senha, email_confirm: true,
    app_metadata: { role: "professor", professor_id: professor.id },
  });
  if (error) return res.status(400).json({ error: error.message });

  await db.from("professores").update({ user_id: criado.user.id }).eq("id", professor.id);
  return res.json({ ok: true, user_id: criado.user.id });
});

/* Remove o professor — e o login associado, se houver. */
router.delete("/api/professores/:id", exigirAuth, async (req, res) => {
  const { data: professor } = await db.from("professores").select("user_id").eq("id", req.params.id).maybeSingle();
  if (professor?.user_id) {
    await db.auth.admin.deleteUser(professor.user_id).catch(() => {});
  }
  const { error } = await db.from("professores").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ ok: true });
});
