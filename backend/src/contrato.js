import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import { db } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, "..", "templates", "contrato-leoezinhos.md");

/* Dados fixos por unidade — vêm da tabela "Valores das variáveis por local"
   do template. Karatê não está coberto pelo template ainda. */
const DADOS_UNIDADE = {
  INSA: {
    contratada_nome: "Academia de Futebol Leõezinhos de Paty",
    contratada_cnpj: "64.533.662/0001-00",
    contratada_endereco: "Rua Cap. Zenóbio da Costa, 394 — Centro, Paty do Alferes/RJ, 26950-000",
    comarca: "Paty do Alferes/RJ",
  },
  MPAC: {
    contratada_nome: "Academia de Futebol Leõezinhos do MPAC",
    contratada_cnpj: "64.533.662/0001-00",
    contratada_endereco: "R. Manoel Guilherme Barbosa, 520 — Centro, Miguel Pereira/RJ, 26900-000",
    comarca: "Miguel Pereira/RJ",
  },
};

const REPRESENTANTE = { nome: "Priscila Pereira", cref: "" };

function merge(template, dados) {
  let texto = template;
  for (const [chave, valor] of Object.entries(dados)) {
    texto = texto.replaceAll(`{{${chave}}}`, valor ?? "—");
  }
  return texto;
}

/* Monta o texto final do contrato (sem o hash ainda — ele é calculado
   sobre esta versão e só depois inserido no PDF). */
export function montarTextoContrato({ aluno, responsavel, turma, local, plano, matricula, autorizaImagem }) {
  const unidade = DADOS_UNIDADE[local?.nome];
  if (!unidade) throw new Error(`Contrato não configurado para a unidade "${local?.nome}"`);

  let template = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  // corta a seção de referência interna (não sou advogado / valores por local) — não vai pro contrato do cliente
  const corte = template.indexOf("## Valores das variáveis por local");
  if (corte !== -1) template = template.slice(0, corte);
  // remove a nota interna do topo do template (instrução pra quem edita o .md, não é texto de contrato)
  template = template.replace(/\*\*Template único.*?\n\n/s, "");

  const hoje = new Date();

  const dados = {
    ...unidade,
    aluno_nome: aluno.nome,
    aluno_nascimento: aluno.nascimento ? new Date(aluno.nascimento).toLocaleDateString("pt-BR") : "—",
    responsavel_nome: responsavel.nome,
    responsavel_rg: responsavel.rg,
    responsavel_cpf: responsavel.cpf,
    responsavel_telefone: responsavel.telefone,
    responsavel_instagram: responsavel.instagram,
    responsavel_endereco: responsavel.endereco,
    local_nome: unidade === DADOS_UNIDADE.INSA ? "Instituto Nossa Senhora Aparecida" : "Miguel Pereira Atlético Clube",
    local_endereco: local.endereco,
    turma_dias: turma?.dias ?? "—",
    turma_horario: turma?.horario ? String(turma.horario).slice(0, 5) : "—",
    categoria: aluno.categoria ?? "—",
    plano_nome: plano.nome,
    plano_frequencia: plano.frequencia_semanal,
    plano_valor: Number(matricula.valor_mensalidade).toFixed(2).replace(".", ","),
    dia_vencimento: matricula.dia_vencimento,
    data_fim_vigencia: "12 (doze) meses da data de assinatura, renovando-se automaticamente por períodos iguais salvo rescisão",
    autoriza_imagem: autorizaImagem ? "AUTORIZA" : "NÃO AUTORIZA",
    cidade: unidade.comarca.split("/")[0],
    data_assinatura: hoje.toLocaleDateString("pt-BR"),
    professor_nome: REPRESENTANTE.nome,
    professor_cref: REPRESENTANTE.cref || "—",
    assinatura_datahora: hoje.toLocaleString("pt-BR"),
    assinatura_ip: "{{__IP__}}",
    assinatura_useragent: "{{__UA__}}",
    documento_hash: "{{__HASH__}}",
  };

  let texto = merge(template, dados)
    .replace("☐ Autorizo o uso de imagem  ☐ Não autorizo o uso de imagem",
      autorizaImagem ? "[X] Autorizo o uso de imagem   [ ] Não autorizo o uso de imagem"
        : "[ ] Autorizo o uso de imagem   [X] Não autorizo o uso de imagem");

  return texto;
}

/* Versão pra leitura ANTES de assinar — mesmo texto, mas sem a seção
   "Registro da assinatura eletrônica" (que fala de um evento que ainda
   não aconteceu) e sem os placeholders de IP/hash. */
export function montarTextoParaLeitura(dadosContrato) {
  const texto = montarTextoContrato(dadosContrato);
  const corte = texto.indexOf("### Registro da assinatura eletrônica");
  return (corte !== -1 ? texto.slice(0, corte) : texto).replace(/`/g, "");
}

/* Substitui os placeholders de assinatura (IP, user-agent, hash) depois
   que o texto canônico (sem hash) já foi hasheado. */
function finalizarTexto(texto, { ip, userAgent, hash }) {
  return texto
    .replace("{{__IP__}}", ip ?? "—")
    .replace("{{__UA__}}", userAgent ?? "—")
    .replace("{{__HASH__}}", hash);
}

function renderMarkdownPdf(doc, texto) {
  const linhas = texto.split("\n");
  for (const linhaBruta of linhas) {
    const linha = linhaBruta.replace(/`/g, "");

    if (linha.trim() === "---") { doc.moveDown(0.4); continue; }
    if (linha.trim() === "") { doc.moveDown(0.5); continue; }

    if (linha.startsWith("# ")) {
      doc.font("Helvetica-Bold").fontSize(15).text(linha.slice(2)).moveDown(0.4);
      continue;
    }
    if (linha.startsWith("## ")) {
      doc.font("Helvetica-Bold").fontSize(12).text(linha.slice(3)).moveDown(0.3);
      continue;
    }
    if (linha.startsWith("### ")) {
      doc.font("Helvetica-Bold").fontSize(10.5).text(linha.slice(4)).moveDown(0.2);
      continue;
    }
    if (/^\|[-:\s|]+\|$/.test(linha.trim())) continue; // separador de tabela
    if (linha.startsWith("|")) {
      const celulas = linha.split("|").map((c) => c.trim()).filter(Boolean);
      if (celulas.length) {
        doc.font("Helvetica").fontSize(9.5).text(celulas.join("  —  "), { indent: 12 }).moveDown(0.15);
      }
      continue;
    }
    if (linha.startsWith(">")) {
      doc.font("Helvetica-Oblique").fontSize(9.5).text(linha.replace(/^>\s?/, ""), { indent: 12 }).moveDown(0.2);
      continue;
    }

    // negrito inline **texto**
    const partes = linha.split("**");
    doc.fontSize(9.5);
    partes.forEach((parte, i) => {
      doc.font(i % 2 === 1 ? "Helvetica-Bold" : "Helvetica")
        .text(parte, { continued: i < partes.length - 1 });
    });
    doc.moveDown(0.25);
  }
}

/* Gera o PDF final, calcula o hash SHA-256 (sobre o texto sem o próprio
   hash), sobe pro bucket "documentos" e retorna { url, hash, path }. */
export async function gerarESalvarContrato({ aluno, textoBase, ip, userAgent }) {
  const hash = crypto.createHash("sha256").update(textoBase).digest("hex");
  const textoFinal = finalizarTexto(textoBase, { ip, userAgent, hash });

  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const pronto = new Promise((resolve) => doc.on("end", resolve));
  renderMarkdownPdf(doc, textoFinal);
  doc.end();
  await pronto;
  const buffer = Buffer.concat(chunks);

  const caminho = `contratos/${aluno.id}-${Date.now()}.pdf`;
  const { error } = await db.storage.from("documentos").upload(caminho, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw error;

  const { data: assinada, error: erroUrl } = await db.storage
    .from("documentos").createSignedUrl(caminho, 60 * 60 * 24 * 7); // 7 dias
  if (erroUrl) throw erroUrl;

  return { caminho, hash, url: assinada.signedUrl };
}
