const API = process.env.UAZAPI_URL;
const TOKEN = process.env.UAZAPI_TOKEN;

/* Envia uma mensagem de texto simples via uazapi.
   number: telefone no formato internacional sem "+" (ex: 5524981805511) */
export async function enviarWhatsapp(number, text) {
  const res = await fetch(`${API}/send/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: TOKEN },
    body: JSON.stringify({ number, text }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`uazapi ${res.status}: ${JSON.stringify(json)}`);
  return json; // { id, messageid, status, ... }
}

/* Envia mídia (imagem, vídeo, áudio ou documento) via uazapi.
   type: image | video | document | audio | ptt | sticker … */
export async function enviarMidia(number, { type, file, text, docName }) {
  const res = await fetch(`${API}/send/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: TOKEN },
    body: JSON.stringify({ number, type, file, text, docName }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`uazapi ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

/* Status da conexão do WhatsApp (conectado/desconectado, motivo da última queda). */
export async function statusConexao() {
  const res = await fetch(`${API}/instance/status`, { headers: { token: TOKEN } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`uazapi ${res.status}: ${JSON.stringify(json)}`);
  return {
    conectado: !!json.status?.connected,
    motivo: json.instance?.lastDisconnectReason ?? null,
    desde: json.instance?.lastDisconnect ?? null,
  };
}

/* Registra (ou atualiza) o webhook da instância — "modo simples":
   sem id/action, a uazapi cria ou atualiza automaticamente o único
   webhook da instância. Rodar uma vez (ou sempre que APP_URL mudar). */
export async function configurarWebhook(webhookUrl) {
  const res = await fetch(`${API}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: TOKEN },
    body: JSON.stringify({
      url: webhookUrl,
      enabled: true,
      events: ["messages"],
      excludeMessages: ["wasSentByApi", "fromMeYes"], // evita loop e ignora nossos próprios envios
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`uazapi ${res.status}: ${JSON.stringify(json)}`);
  return json;
}
