import express from "express";
import { db } from "./db.js";
import { exigirAuth } from "./auth.js";
import { gerarLinkGenerico } from "./infinitepay.js";

export const router = express.Router();

router.post("/api/eventos/:id/link", exigirAuth, express.json(), async (req, res) => {
  const { data: evento } = await db.from("eventos")
    .select("id, nome, valor, locais ( nome )").eq("id", req.params.id).maybeSingle();
  if (!evento) return res.status(404).json({ error: "evento não encontrado" });
  if (!(Number(evento.valor) > 0)) return res.status(400).json({ error: "defina um valor pro evento antes de gerar o link" });

  const unidade = evento.locais?.nome;
  if (!unidade) return res.status(400).json({ error: "evento sem local definido — não dá pra saber qual conta usar" });

  try {
    const url = await gerarLinkGenerico({ unidade, valor: evento.valor, descricao: evento.nome });
    await db.from("eventos").update({ link_pagamento: url }).eq("id", evento.id);
    return res.json({ url });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
});
