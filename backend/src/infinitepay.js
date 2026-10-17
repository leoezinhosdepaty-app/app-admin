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
const dataIso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* "Matrícula + Mensalidade" já inclui a mensalidade do primeiro ciclo: ela cobre
   até o primeiro vencimento que cai em/depois do dia do pagamento. Sem isso o
   gerador cobrava de novo logo em seguida (família pagou e recebeu cobrança). */
export async function vencimentoCobertoPelaMatricula(alunoId, diaVencimento) {
  const { data: pagas } = await db.from("cobrancas")
    .select("pago_em, vencimento")
    .eq("aluno_id", alunoId).eq("status", "pago").ilike("descricao", "Matrícula + Mensalidade%");
  let coberto = null;
  for (const p of pagas ?? []) {
    const [y, mo, d] = (p.pago_em ?? p.vencimento).slice(0, 10).split("-").map(Number);
    let primeiro = new Date(y, mo - 1, diaVencimento);
    if (primeiro < new Date(y, mo - 1, d)) primeiro = new Date(y, mo, diaVencimento);
    const iso = dataIso(primeiro);
    if (!coberto || iso > coberto) coberto = iso;
  }
  return coberto;
}

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
    let cobCriada = null; // pra desfazer se o link falhar (um aluno com erro não pode travar os outros)

    try {
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

      const bolsista = a.bolsista;

      if (!bolsista && !(Number(m.valor_mensalidade) > 0)) {
        console.warn(`gerarCobrancasDoMes: ${a.nome} sem valor de mensalidade (R$0) e não é bolsista — pulado`);
        continue;
      }

      // mês já coberto por uma "Matrícula + Mensalidade" paga
      if (!bolsista) {
        const coberto = await vencimentoCobertoPelaMatricula(a.id, m.dia_vencimento);
        if (coberto && dataIso(venc) <= coberto) continue;
      }

      const unidade = a.turmas?.locais?.nome ?? "INSA";

      const { data: cob, error: e2 } = await db.from("cobrancas").insert({
        aluno_id: a.id,
        local_id: a.turmas?.locais?.id,
        descricao,
        valor: bolsista ? 0 : m.valor_mensalidade,
        vencimento: dataIso(venc),
        status: bolsista ? "isento" : "aberto",
      }).select().single();
      if (e2) { console.error(e2); continue; }
      cobCriada = cob;

      if (bolsista) { criadas.push({ ...cob, isento: true }); cobCriada = null; continue; }

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
      cobCriada = null;
    } catch (e) {
      console.error(`gerarCobrancasDoMes: falhou pra ${a.nome}:`, e.message);
      // cobrança criada sem link nem mensagem fica órfã e o "não duplica" a esconderia
      // pra sempre — apaga pra tentar de novo no próximo ciclo
      if (cobCriada) await db.from("cobrancas").delete().eq("id", cobCriada.id);
    }
  }
  return criadas;
}

/* ---------------------------------------------------------------
   3) Webhook — baixa automática
   Responda 200 rápido. Se responder 400, a InfinitePay reenvia.
   --------------------------------------------------------------- */
export const router = express.Router();

// data de hoje no Brasil — toISOString() dá o dia UTC e jogava pra "amanhã"
// quem pagava depois das 21h
const hojeBR = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

async function registrarBaixa(cob, { transaction_nsu, receipt_url, capture_method }, paid_amount) {
  await db.from("cobrancas").update({
    status: "pago",
    pago_em: hojeBR(),
    id_externo: transaction_nsu,
    comprovante_url: receipt_url,
    metodo: capture_method,
  }).eq("id", cob.id);

  // cancela cobrança/lembretes de atraso ainda na fila (a mensagem de cobrança do mês
  // também: ela pode ficar horas na fila e sair depois de a família já ter pago)
  await db.from("mensagens").update({ status: "cancelada" })
    .eq("aluno_id", cob.aluno_id).eq("status", "na_fila")
    .or("tipo.like.inadimplencia%,tipo.eq.cobranca_mensalidade");

  // se estava suspenso por atraso, reativa
  await db.from("alunos").update({ status: "ativo" })
    .eq("id", cob.aluno_id).eq("status", "inadimplente");

  // confere divergência de valor sem travar a baixa
  if (paid_amount && Math.abs(paid_amount / 100 - Number(cob.valor)) > 0.01) {
    console.warn(`Valor divergente na cobrança ${cob.id}: pago ${paid_amount / 100}, esperado ${cob.valor}`);
  }
}

router.post("/api/infinitepay/webhook", express.json(), async (req, res) => {
  if (req.query.s !== process.env.WEBHOOK_SECRET) return res.status(401).send("nao autorizado");

  const { order_nsu, transaction_nsu, paid_amount, receipt_url, capture_method } = req.body ?? {};
  console.log(`webhook infinitepay recebido: order_nsu=${order_nsu} transaction_nsu=${transaction_nsu} paid_amount=${paid_amount}`);
  if (!order_nsu) return res.status(400).send("sem order_nsu");

  try {
    const { data: cob } = await db.from("cobrancas")
      .select("id, aluno_id, valor, status, id_externo").eq("id", order_nsu).maybeSingle();

    if (!cob) { console.warn(`webhook infinitepay: cobranca ${order_nsu} não encontrada`); return res.status(400).send("cobranca desconhecida"); }   // força reenvio

    const dados = { transaction_nsu, receipt_url, capture_method };

    // link de uma cobrança que a equipe cancelou (ex.: duplicada): se o aluno tem outra
    // cobrança aberta de valor compatível, é ela que fica paga — senão ela ficaria em
    // aberto e a cancelada é que viraria "paga"
    if (cob.status === "cancelado") {
      const { data: abertas } = await db.from("cobrancas").select("id, aluno_id, valor, vencimento")
        .eq("aluno_id", cob.aluno_id).in("status", ["aberto", "vencido"]).order("vencimento");
      const alvo = (abertas ?? []).find((c) => !paid_amount || Math.abs(paid_amount / 100 - Number(c.valor)) <= 11);
      if (alvo) {
        await registrarBaixa(alvo, dados, paid_amount);
        console.log(`webhook infinitepay: pagamento em link cancelado (${cob.id}) aplicado à cobrança aberta ${alvo.id}`);
        return res.status(200).send("ok");
      }
    }

    if (cob.status === "pago") {
      if (!cob.id_externo) {
        // foi marcada como paga na mão antes de o pagamento cair — só completa o comprovante
        await db.from("cobrancas").update({ id_externo: transaction_nsu, comprovante_url: receipt_url, metodo: capture_method }).eq("id", cob.id);
        return res.status(200).send("ok");
      }
      if (!transaction_nsu || transaction_nsu === cob.id_externo) return res.status(200).send("ok");   // reenvio da mesma transação

      // OUTRA transação num link que já estava pago: a família reaproveitou o link de um
      // mês anterior (aconteceu em 01/10). Antes isso era descartado em silêncio e o mês
      // novo ficava "em aberto" mesmo pago — agora vai pra cobrança aberta desse aluno.
      const { data: abertas } = await db.from("cobrancas").select("id, aluno_id, valor, vencimento")
        .eq("aluno_id", cob.aluno_id).in("status", ["aberto", "vencido"]).order("vencimento");
      const alvo = (abertas ?? []).find((c) => !paid_amount || Math.abs(paid_amount / 100 - Number(c.valor)) <= 11);
      if (alvo) {
        await registrarBaixa(alvo, dados, paid_amount);
        console.log(`webhook infinitepay: pagamento em link já pago (${cob.id}) aplicado à cobrança aberta ${alvo.id}`);
      } else {
        console.warn(`webhook infinitepay: PAGAMENTO EXTRA na cobrança já paga ${cob.id} (transação ${transaction_nsu}, R$${(paid_amount ?? 0) / 100}) e o aluno não tem cobrança aberta pra aplicar — conferir com a família`);
      }
      return res.status(200).send("ok");
    }

    await registrarBaixa(cob, dados, paid_amount);
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
    .select("id, valor, vencimento, link_pagamento, alunos ( id, nome, status, responsaveis ( nome, telefone ) )")
    .in("status", ["aberto", "vencido"])
    .lt("vencimento", new Date().toISOString().slice(0, 10));

  for (const c of vencidas ?? []) {
    try {
      const dias = Math.floor((Date.now() - new Date(c.vencimento)) / 86400000);
      if (![1, 5, 10].includes(dias)) continue;

      // aluno que saiu não recebe lembrete — e, principalmente, não pode ser
      // "reativado" como inadimplente (a baixa depois o devolvia como ativo)
      if (c.alunos.status === "inativo") continue;
      if (!c.alunos.responsaveis?.telefone) { console.warn(`reguaInadimplencia: ${c.alunos.nome} sem telefone do responsável`); continue; }

      await db.from("cobrancas").update({ status: "vencido" }).eq("id", c.id);
      if (dias >= 5) {
        await db.from("alunos").update({ status: "inadimplente" }).eq("id", c.alunos.id);
      }

      const nome = c.alunos.responsaveis.nome;
      const link = c.link_pagamento ? `\n${c.link_pagamento}` : "";
      const textos = {
        1: `Oi, ${nome}! Passando só pra lembrar que a mensalidade do(a) ${c.alunos.nome} venceu ontem — deve ter passado batido. 🦁 Se já pagou, pode ignorar:${link}`,
        5: `Oi, ${nome}! A mensalidade do(a) ${c.alunos.nome} está com 5 dias de atraso. Pode regularizar por aqui:${link}`,
        10: `Oi, ${nome}! A mensalidade do(a) ${c.alunos.nome} está com 10 dias de atraso. Pelo contrato, após 30 dias de inadimplência o aluno fica suspenso das atividades até a quitação. Vamos resolver antes disso?${link}`,
      };

      await db.from("mensagens").insert({
        telefone: c.alunos.responsaveis.telefone,
        aluno_id: c.alunos.id,
        tipo: `inadimplencia_d${dias}`,
        corpo: textos[dias],
        agendada_para: new Date().toISOString(),
      });
    } catch (e) {
      console.error(`reguaInadimplencia: falhou na cobrança ${c.id}:`, e.message);
    }
  }
}
