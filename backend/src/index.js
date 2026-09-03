import "dotenv/config";
import express from "express";
import cors from "cors";
import cron from "node-cron";
import { router as infinitepayRouter, gerarCobrancasDoMes, reguaInadimplencia } from "./infinitepay.js";
import { router as cobrancasRouter } from "./cobrancas.js";
import { router as convitesRouter } from "./convites.js";
import { router as publicoRouter } from "./publico.js";
import { router as webhookUazapiRouter } from "./webhookUazapi.js";
import { router as eventosRouter } from "./eventos.js";
import { router as professoresRouter } from "./professores.js";
import { processarFila } from "./worker.js";
import { mensagensAniversarioAlunos } from "./aniversarios.js";

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(infinitepayRouter);
app.use(cobrancasRouter);
app.use(convitesRouter);
app.use(publicoRouter);
app.use(webhookUazapiRouter);
app.use(eventosRouter);
app.use(professoresRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

// Rotina automática de cobrança mensal + régua de inadimplência — DESATIVADA por enquanto
// (agosto/2026 rodou pela recorrência antiga da InfinitePay; a rotina daqui só entra em setembro).
// Pra reativar: ROTINA_COBRANCA_ATIVA=true no .env e redeploy.
if (process.env.ROTINA_COBRANCA_ATIVA === "true") {
  cron.schedule("0 7 * * *", () => {
    gerarCobrancasDoMes().catch((e) => console.error("gerarCobrancasDoMes:", e));
  }, { timezone: "America/Sao_Paulo" });
  cron.schedule("0 9 * * *", () => {
    reguaInadimplencia().catch((e) => console.error("reguaInadimplencia:", e));
  }, { timezone: "America/Sao_Paulo" });
} else {
  console.log("Rotina automática de cobrança DESATIVADA (ROTINA_COBRANCA_ATIVA != true)");
}
// processa a fila de WhatsApp a cada minuto (envios manuais/ações continuam funcionando)
cron.schedule("* * * * *", () => {
  processarFila().catch((e) => console.error("processarFila:", e));
});

// mensagem de parabéns pros alunos que fazem aniversário hoje
cron.schedule("0 8 * * *", () => {
  mensagensAniversarioAlunos().catch((e) => console.error("mensagensAniversarioAlunos:", e));
}, { timezone: "America/Sao_Paulo" });

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Backend Leõezinhos rodando na porta ${port}`));
