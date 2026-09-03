/* =============================================================
   Integração InfinitePay — App Pricila Pereira
   -------------------------------------------------------------
   Três contas, um código: o handle (a "infinite tag" de cada
   conta) é escolhido pela unidade do aluno — INSA, MPAC ou karatê.
   ============================================================= */

import express from "express";
import { db } from "./db.js";

const API = "https://api.checkout.infinitepay.io/links";

const HANDLES = {
  INSA: process.env.INFINITEPAY_HANDLE_INSA,
  MPAC: process.env.INFINITEPAY_HANDLE_MPAC,
  KARATE: process.env.INFINITEPAY_HANDLE_KARATE,
};

/* ---------------------------------------------------------------
   Chamada crua da API de checkout da InfinitePay. Reaproveitada
   tanto pra cobrança de aluno (com conciliação via order_nsu)
   quanto pra links avulsos (ex: evento) que não têm baixa automática.
   --------------------------------------------------------------- */
async function chamarInfinitePay(body) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`InfinitePay ${res.status}: ${await res.text()}`);
  const { url } = await res.json();
  return url;
}

/* ---------------------------------------------------------------
   1) Criar o link de uma cobrança
   Valores vão em CENTAVOS. order_nsu é a chave da conciliação:
   é ele que volta no webhook e diz de quem foi o pagamento.
   --------------------------------------------------------------- */
export async function criarLink(cobranca) {
  const handle = HANDLES[cobranca.unidade];
  if (!handle) throw new Error(`Sem handle configurado para ${cobranca.unidade}`);

  const url = await chamarInfinitePay({
    handle,
    order_nsu: cobranca.id,                                  // uuid da cobrança no seu banco
    redirect_url: `${process.env.APP_URL}/pagamento/obrigado`,
    webhook_url: `${process.env.APP_URL}/api/infinitepay/webhook?s=${process.env.WEBHOOK_SECRET}`,
    customer: {
      name: cobranca.responsavel_nome,
      email: cobranca.responsavel_email ?? undefined,
      phone_number: cobranca.responsavel_telefone ?? undefined,
    },
    items: [{
      quantity: 1,
      price: Math.round(Number(cobranca.valor) * 100),
      description: cobranca.descricao,                        // "Mensalidade 09/2026 - Arthur Nogueira"
    }],
  });

  await db.from("cobrancas").update({ link_pagamento: url }).eq("id", cobranca.id);
  return url;
}

/* ---------------------------------------------------------------
   Link avulso, sem cobrança/conciliação por trás (ex: evento
   pago — o mesmo link é compartilhado com todo mundo que for).
   --------------------------------------------------------------- */
export async function gerarLinkGenerico({ unidade, valor, descricao }) {
  const handle = HANDLES[unidade];
  if (!handle) throw new Error(`Sem handle configurado para ${unidade}`);

  return chamarInfinitePay({
    handle,
    redirect_url: `${process.env.APP_URL}/pagamento/obrigado`,
    items: [{ quantity: 1, price: Math.round(Number(valor) * 100), description: descricao }],
  });
}

/* ---------------------------------------------------------------
   2) Rotina mensal — gera as cobranças do mês seguinte
   Roda todo dia; cria a cobrança 7 dias antes do vencimento
   de cada aluno, sem duplicar.
   --------------------------------------------------------------- */
export async function gerarCobrancasDoMes() {
  const { data: matriculas, error } = await db
    .from("matriculas")
    .select(`id, dia_vencimento, valor_mensalidade,
             alunos!inner ( id, nome, bolsista, status,
                            turmas ( locais ( nome, id ) ),
                            responsaveis ( nome, email, telefone ) )`)
    .eq("ativa", true);
  if (error) throw error;

  const hoje = new Date();
  const criadas = [];

  for (const m of matriculas) {
    const a = m.alunos;
    if (a.status === "inativo") continue;

    // vencimento deste mês; se já passou, o do mês que vem
    let venc = new Date(hoje.getFullYear(), hoje.getMonth(), m.dia_vencimento);
    if (venc < hoje) venc = new Date(hoje.getFullYear(), hoje.getMonth() + 1, m.dia_vencimento);

    const faltam = (venc - hoje) / 86400000;
    if (faltam > 7) continue;                                  // ainda não é hora

    const ref = `${String(venc.getMonth() + 1).padStart(2, "0")}/${venc.getFullYear()}`;
    const descricao = `Mensalidade ${ref} - ${a.nome}`;

    // não duplica
    const { data: existe } = await db.from("cobrancas")
      .select("id").eq("aluno_id", a.id).eq("descricao", descricao).maybeSingle();
    if (existe) continue;

    const unidade = a.turmas?.locais?.nome ?? "INSA";
    const bolsista = a.bolsista;

    const { data: cob, error: e2 } = await db.from("cobrancas").insert({
      aluno_id: a.id,
      local_id: a.turmas?.locais?.id,
      descricao,
      valor: bolsista ? 0 : m.valor_mensalidade,
      vencimento: venc.toISOString().slice(0, 10),
      status: bolsista ? "isento" : "aberto",
    }).select().single();
    if (e2) { console.error(e2); continue; }

    if (bolsista) { criadas.push({ ...cob, isento: true }); continue; }

    const url = await criarLink({
      id: cob.id, unidade, valor: cob.valor, descricao,
      responsavel_nome: a.responsaveis?.nome,
      responsavel_email: a.responsaveis?.email,
      responsavel_telefone: a.responsaveis?.telefone,
    });

    // enfileira o WhatsApp com o link
    await db.from("mensagens").insert({
      telefone: a.responsaveis.telefone,
      aluno_id: a.id,
      tipo: "cobranca_mensalidade",
      corpo: `Oi, ${a.responsaveis.nome}! 🦁\n\nA mensalidade do(a) ${a.nome} vence dia ${m.dia_vencimento}.\n` +
             `Valor: R$ ${Number(cob.valor).toFixed(2).replace(".", ",")}\n\n` +
             `Pode pagar no Pix ou cartão por aqui:\n${url}\n\nQualquer dúvida é só chamar. Até a próxima aula! ⚽`,
      agendada_para: new Date().toISOString(),
    });

    criadas.push(cob);
  }
  return criadas;
}

/* ---------------------------------------------------------------
   3) Webhook — baixa automática
   Responda 200 rápido. Se responder 400, a InfinitePay reenvia.
   --------------------------------------------------------------- */
export const router = express.Router();

router.post("/api/infinitepay/webhook", express.json(), async (req, res) => {
  if (req.query.s !== process.env.WEBHOOK_SECRET) return res.status(401).send("nao autorizado");

  const { order_nsu, transaction_nsu, paid_amount, receipt_url, capture_method } = req.body ?? {};
  console.log(`webhook infinitepay recebido: order_nsu=${order_nsu} transaction_nsu=${transaction_nsu} paid_amount=${paid_amount}`);
  if (!order_nsu) return res.status(400).send("sem order_nsu");

  try {
    const { data: cob } = await db.from("cobrancas")
      .select("id, aluno_id, valor, status").eq("id", order_nsu).maybeSingle();

    if (!cob) { console.warn(`webhook infinitepay: cobranca ${order_nsu} não encontrada`); return res.status(400).send("cobranca desconhecida"); }   // força reenvio
    if (cob.status === "pago") return res.status(200).send("ok");     // idempotente

    await db.from("cobrancas").update({
      status: "pago",
      pago_em: new Date().toISOString().slice(0, 10),
      id_externo: transaction_nsu,
      comprovante_url: receipt_url,
      metodo: capture_method,
    }).eq("id", cob.id);

    // cancela lembretes de inadimplência ainda na fila
    await db.from("mensagens").update({ status: "cancelada" })
      .eq("aluno_id", cob.aluno_id).eq("status", "na_fila").like("tipo", "inadimplencia%");

    // se estava suspenso por atraso, reativa
    await db.from("alunos").update({ status: "ativo" })
      .eq("id", cob.aluno_id).eq("status", "inadimplente");

    // confere divergência de valor sem travar a baixa
    if (paid_amount && Math.abs(paid_amount / 100 - Number(cob.valor)) > 0.01) {
      console.warn(`Valor divergente na cobrança ${cob.id}: pago ${paid_amount / 100}, esperado ${cob.valor}`);
    }

    console.log(`webhook infinitepay: cobrança ${cob.id} marcada como paga`);
    return res.status(200).send("ok");
  } catch (e) {
    console.error(e);
    return res.status(400).send("erro");     // reenvio automático
  }
});

/* ---------------------------------------------------------------
   4) Régua de inadimplência — roda 1x por dia
   --------------------------------------------------------------- */
export async function reguaInadimplencia() {
  const { data: vencidas } = await db
    .from("cobrancas")
    .select("id, valor, vencimento, link_pagamento, alunos ( id, nome, responsaveis ( nome, telefone ) )")
    .in("status", ["aberto", "vencido"])
    .lt("vencimento", new Date().toISOString().slice(0, 10));

  for (const c of vencidas ?? []) {
    const dias = Math.floor((Date.now() - new Date(c.vencimento)) / 86400000);
    if (![1, 5, 10].includes(dias)) continue;

    await db.from("cobrancas").update({ status: "vencido" }).eq("id", c.id);
    if (dias >= 5) {
      await db.from("alunos").update({ status: "inadimplente" }).eq("id", c.alunos.id);
    }

    const textos = {
      1: `Oi, ${c.alunos.responsaveis.nome}! Passando só pra lembrar que a mensalidade do(a) ${c.alunos.nome} venceu ontem — deve ter passado batido. 🦁 Se já pagou, pode ignorar:\n${c.link_pagamento}`,
      5: `Oi, ${c.alunos.responsaveis.nome}! A mensalidade do(a) ${c.alunos.nome} está com 5 dias de atraso. Pode regularizar por aqui:\n${c.link_pagamento}`,
      10: `Oi, ${c.alunos.responsaveis.nome}! A mensalidade do(a) ${c.alunos.nome} está com 10 dias de atraso. Pelo contrato, após 30 dias de inadimplência o aluno fica suspenso das atividades até a quitação. Vamos resolver antes disso?\n${c.link_pagamento}`,
    };

    await db.from("mensagens").insert({
      telefone: c.alunos.responsaveis.telefone,
      aluno_id: c.alunos.id,
      tipo: `inadimplencia_d${dias}`,
      corpo: textos[dias],
      agendada_para: new Date().toISOString(),
    });
  }
}
