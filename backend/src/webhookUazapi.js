import express from "express";
import { db } from "./db.js";
import { exigirAuth } from "./auth.js";
import { statusConexao } from "./uazapi.js";

export const router = express.Router();

/* Status da conexão do WhatsApp — pra mostrar a bolinha verde/vermelha no painel. */
router.get("/api/uazapi/status", exigirAuth, async (req, res) => {
  try {
    const status = await statusConexao();
    return res.json(status);
  } catch (e) {
    return res.status(502).json({ conectado: false, erro: e.message });
  }
});

/* ---------------------------------------------------------------
   Recebe eventos de mensagem da uazapi. Quando o responsável
   manda uma mensagem (fromMe=false), pausa a régua automática
   pra aquele telefone até um humano liberar de novo.

   Formato real do payload (mapeado a partir de um envio de teste):
   { message: { sender: "<lid>@lid", sender_pn: "<telefone>@s.whatsapp.net",
                chatid: "<telefone>@s.whatsapp.net", isGroup, fromMe, text, senderName },
     chat: { wa_name, wa_contactName, wa_isGroup, ... } }

   O WhatsApp identifica quem manda mensagem em GRUPO por um LID (opaco,
   não é o telefone) — por isso "sender" sozinho não serve. Preferimos
   "sender_pn" (telefone de verdade) e ignoramos mensagens de grupo
   inteiramente (isGroup=true), senão cada participante vira uma
   conversa nova e fictícia.
   --------------------------------------------------------------- */
router.post("/api/uazapi/webhook", express.json(), async (req, res) => {
  // se a uazapi mandar o token da instância no payload, confere (quando presente)
  if (req.body?.token && req.body.token !== process.env.UAZAPI_TOKEN) {
    return res.status(401).send("token invalido");
  }

  const msg = req.body?.message ?? req.body ?? {};
  const chat = req.body?.chat ?? {};
  if (msg.fromMe === true) return res.status(200).send("ok"); // ignora o que a gente mesmo mandou
  if (msg.isGroup === true || chat.wa_isGroup === true) return res.status(200).send("ok"); // sem grupos na inbox

  const jid = msg.sender_pn ?? msg.chatid ?? chat.wa_chatid ?? msg.sender ?? "";
  const telefone = String(jid).replace(/\D/g, "");
  if (!telefone) return res.status(200).send("ok");
  const nomeContato = chat.wa_name || chat.wa_contactName || msg.senderName || undefined;

  try {
    const agora = new Date().toISOString();
    await db.from("conversas").upsert({
      telefone, nome: nomeContato, ultima_resposta: agora, em_atendimento_humano: true,
    }, { onConflict: "telefone" });

    if (msg.text) {
      await db.from("mensagens").insert({
        telefone, direcao: "entrada", tipo: "recebida", corpo: msg.text,
        status: "enviada", criado_em: agora, enviada_em: agora, id_externo: msg.messageid ?? null,
      });
    }
    return res.status(200).send("ok");
  } catch (e) {
    console.error("webhook uazapi:", e);
    return res.status(200).send("ok"); // não devolve erro pra uazapi não ficar reentregando
  }
});
