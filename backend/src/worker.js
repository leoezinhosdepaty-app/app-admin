import { db } from "./db.js";
import { enviarWhatsapp, enviarMidia } from "./uazapi.js";

const MAX_TENTATIVAS = 3;
const LOTE = 5; // quantas mensagens processa por tick
const JANELA_ATENDIMENTO_HORAS = 6; // por quanto tempo a fila fica pausada depois de uma resposta humana

// espaçamento entre disparos — variável (não é sempre o mesmo intervalo) pra não
// parecer robô e arriscar bloqueio do número no WhatsApp.
const ESPACO_MIN_MS = 4000;
const ESPACO_MAX_MS = 22000;

function espera(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function esperaAleatoria() { return espera(ESPACO_MIN_MS + Math.random() * (ESPACO_MAX_MS - ESPACO_MIN_MS)); }

/* Deduz o tipo de mídia da uazapi a partir da extensão do arquivo. */
function tipoMidia(url) {
  const ext = url.split(".").pop()?.toLowerCase().split("?")[0];
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "image";
  if (["mp4"].includes(ext)) return "video";
  return "document";
}

function dentroDaJanela() {
  const hora = Number(new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false,
  }).format(new Date()));
  return hora >= 8 && hora < 21;
}

export async function processarFila() {
  if (!dentroDaJanela()) return;

  const { data: pendentes, error } = await db.from("mensagens")
    .select("*")
    .eq("status", "na_fila")
    .lte("agendada_para", new Date().toISOString())
    .order("agendada_para", { ascending: true })
    .limit(LOTE);
  if (error) { console.error("processarFila:", error); return; }

  for (const m of pendentes ?? []) {
    const { data: conversa } = await db.from("conversas").select("em_atendimento_humano, ultima_resposta").eq("telefone", m.telefone).maybeSingle();
    const horasDesdeResposta = conversa?.ultima_resposta ? (Date.now() - new Date(conversa.ultima_resposta).getTime()) / 3600000 : Infinity;
    if (conversa?.em_atendimento_humano && horasDesdeResposta < JANELA_ATENDIMENTO_HORAS) continue; // pausado — resposta humana recente

    // trava a mensagem antes de esperar, pra um tick seguinte não pegar ela de novo
    const { data: travada, error: erroTrava } = await db.from("mensagens").update({ status: "enviando" })
      .eq("id", m.id).eq("status", "na_fila").select().maybeSingle();
    if (erroTrava) { console.error("processarFila (travar mensagem):", erroTrava); continue; }
    if (!travada) continue; // outro processo já pegou essa mensagem

    await esperaAleatoria();

    try {
      const resultado = m.midia_url
        ? await enviarMidia(m.telefone, { type: tipoMidia(m.midia_url), file: m.midia_url, text: m.corpo })
        : await enviarWhatsapp(m.telefone, m.corpo);
      await db.from("mensagens").update({
        status: "enviada", enviada_em: new Date().toISOString(), id_externo: resultado.messageid ?? resultado.id ?? null,
      }).eq("id", m.id);
    } catch (e) {
      const tentativas = (m.tentativas ?? 0) + 1;
      await db.from("mensagens").update({
        tentativas,
        status: tentativas >= MAX_TENTATIVAS ? "falhou" : "na_fila",
        erro: e.message,
      }).eq("id", m.id);
    }
  }
}
