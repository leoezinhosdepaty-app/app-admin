import express from "express";
import PDFDocument from "pdfkit";
import { db } from "./db.js";
import { exigirAuth } from "./auth.js";

export const router = express.Router();

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
  "agosto", "setembro", "outubro", "novembro", "dezembro"];
const brl = (v) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

/* Relatório de repasse mensal: lista quem pagou a mensalidade num mês de
   referência (pela data de vencimento, não pela data em que foi pago —
   uma cobrança de agosto paga em setembro continua sendo "de agosto"),
   pra unidade mandar pra escola junto com o repasse de 30%. */
router.get("/api/relatorios/repasse", exigirAuth, async (req, res) => {
  const { unidade, mes, ano } = req.query;
  const mesNum = Number(mes);
  const anoNum = Number(ano);
  if (!unidade || !mesNum || !anoNum || mesNum < 1 || mesNum > 12) {
    return res.status(400).json({ error: "unidade, mes (1-12) e ano são obrigatórios" });
  }

  const { data: local, error: erroLocal } = await db
    .from("locais").select("id, nome").eq("nome", unidade).maybeSingle();
  if (erroLocal) return res.status(400).json({ error: erroLocal.message });
  if (!local) return res.status(404).json({ error: `unidade "${unidade}" não encontrada` });

  const inicio = `${anoNum}-${String(mesNum).padStart(2, "0")}-01`;
  const ultimoDia = new Date(anoNum, mesNum, 0).getDate();
  const fim = `${anoNum}-${String(mesNum).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

  const { data: cobrancas, error } = await db
    .from("cobrancas")
    .select(`id, valor, vencimento,
             alunos ( nome, turmas ( dias, horario ), matriculas ( ativa, planos ( nome ) ) )`)
    .eq("local_id", local.id)
    .eq("status", "pago")
    .gte("vencimento", inicio)
    .lte("vencimento", fim)
    .order("vencimento");
  if (error) return res.status(400).json({ error: error.message });

  const percentual = 0.30;
  const buffer = await gerarPdfRepasse({ unidade, mes: mesNum, ano: anoNum, cobrancas: cobrancas ?? [], percentual });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="repasse-${unidade}-${mesNum}-${anoNum}.pdf"`);
  res.send(buffer);
});

export async function gerarPdfRepasse({ unidade, mes, ano, cobrancas, percentual }) {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const pronto = new Promise((resolve) => doc.on("end", resolve));

  const left = doc.page.margins.left;
  const largura = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colValor = 90; // largura reservada pra coluna de valor, alinhada à direita

  const linhaFinal = (bottom = 30) => doc.y > doc.page.height - doc.page.margins.bottom - bottom;

  doc.font("Helvetica-Bold").fontSize(16).fillColor("#122A5C").text("Leõezinhos de Paty");
  doc.font("Helvetica").fontSize(12).fillColor("#122A5C")
    .text(`Relatório de repasse — ${unidade} — ${MESES[mes - 1]}/${ano}`);
  doc.fontSize(9).fillColor("#5C678A")
    .text(`Gerado em ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`);
  doc.moveDown(1.2);

  // agrupa por turma (dias + horário) — mesma organização que já é usada na planilha manual
  const grupos = new Map();
  for (const c of cobrancas) {
    const t = c.alunos?.turmas;
    const chave = t ? `${t.dias} · ${String(t.horario).slice(0, 5)}` : "Sem turma definida";
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(c);
  }

  let total = 0;
  let numero = 1;

  for (const [turma, itens] of grupos) {
    if (linhaFinal(80)) doc.addPage();
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#122A5C").text(`Turma ${turma}`, left, doc.y, { width: largura });
    doc.moveDown(0.3);

    let subtotal = 0;
    for (const c of itens) {
      if (linhaFinal()) doc.addPage();
      const nomeAluno = c.alunos?.nome ?? "—";
      const plano = c.alunos?.matriculas?.find((m) => m.ativa)?.planos?.nome ?? "—";
      const y = doc.y;
      doc.font("Helvetica").fontSize(10).fillColor("#122A5C")
        .text(`${numero}. ${nomeAluno} (${plano})`, left, y, { width: largura - colValor, lineBreak: false });
      doc.text(brl(c.valor), left + largura - colValor, y, { width: colValor, align: "right", lineBreak: false });
      doc.moveDown(0.55);
      subtotal += Number(c.valor);
      numero++;
    }

    if (linhaFinal()) doc.addPage();
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#122A5C")
      .text(`Subtotal (${itens.length} pago${itens.length === 1 ? "" : "s"}): ${brl(subtotal)}`, left, doc.y, { width: largura, align: "right" });
    doc.moveDown(0.8);
    total += subtotal;
  }

  if (cobrancas.length === 0) {
    doc.font("Helvetica").fontSize(11).fillColor("#5C678A")
      .text("Nenhuma mensalidade paga nesse período.", left, doc.y, { width: largura });
  }

  if (linhaFinal(80)) doc.addPage();
  doc.moveDown(0.5);
  doc.moveTo(left, doc.y).lineTo(left + largura, doc.y).strokeColor("#E6E9F2").stroke();
  doc.moveDown(0.6);
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#122A5C")
    .text(`Total arrecadado: ${brl(total)}`, left, doc.y, { width: largura });
  doc.fontSize(13).fillColor("#8C3312")
    .text(`Repasse (${Math.round(percentual * 100)}%) a pagar para ${unidade}: ${brl(total * percentual)}`, left, doc.y, { width: largura });

  doc.end();
  await pronto;
  return Buffer.concat(chunks);
}
