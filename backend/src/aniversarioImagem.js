import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, "..", "templates", "aniversario-template.jpg");

// posição do círculo "SUA FOTO AQUI" dentro do template — medida por varredura de
// pixels (não visualmente): a estimativa visual anterior (792,787,r=188) estava
// errada, o círculo de verdade fica bem mais pra baixo/esquerda e é bem maior
// (ver medir-circulo.mjs). Confirmado contra as 4 bordas cardeais do anel dourado.
const CENTRO_X = 744;
const CENTRO_Y = 837;
const RAIO = 262;
const DIAMETRO = RAIO * 2;

// não temos detecção de rosto (evita depender de libs nativas pesadas no servidor) —
// em vez disso, aproxima o centro da foto (onde o rosto costuma estar em fotos de
// cadastro/perfil) e corta mais embaixo (corpo/fundo) do que em cima (testa).
const ZOOM = 1.55;

/* Baixa a foto do aluno, recorta em círculo (com zoom aproximando o rosto) e
   cola em cima do template de aniversário. Retorna um Buffer JPEG pronto pra enviar. */
export async function gerarImagemAniversario(fotoUrl) {
  const respFoto = await fetch(fotoUrl);
  if (!respFoto.ok) throw new Error(`falha ao baixar foto do aluno: ${respFoto.status}`);
  const fotoBuffer = Buffer.from(await respFoto.arrayBuffer());

  const ladoZoom = Math.round(DIAMETRO * ZOOM);
  // "attention" faz o sharp escolher a região mais detalhada da foto (geralmente o
  // rosto, por ter mais contraste/textura) em vez de simplesmente cortar do centro —
  // sem precisar de uma lib de detecção facial de verdade
  const fotoZoom = await sharp(fotoBuffer)
    .resize(ladoZoom, ladoZoom, { fit: "cover", position: sharp.strategy.attention })
    .toBuffer();
  const sobra = ladoZoom - DIAMETRO;
  const fotoRecortada = await sharp(fotoZoom)
    .extract({ left: Math.round(sobra / 2), top: Math.round(sobra / 2), width: DIAMETRO, height: DIAMETRO })
    .toBuffer();

  // desfoca gradualmente as bordas (vinheta) pra disfarçar o fundo que sobra fora do
  // rosto, sem precisar saber exatamente onde o rosto está — o centro fica nítido
  const fotoBorrada = await sharp(fotoRecortada).blur(14).toBuffer();
  const gradienteSvg = `<svg width="${DIAMETRO}" height="${DIAMETRO}">
    <defs>
      <radialGradient id="g" cx="50%" cy="50%" r="50%">
        <stop offset="45%" stop-color="#fff" stop-opacity="0"/>
        <stop offset="100%" stop-color="#fff" stop-opacity="1"/>
      </radialGradient>
    </defs>
    <rect width="${DIAMETRO}" height="${DIAMETRO}" fill="url(#g)"/>
  </svg>`;
  const bordaBorrada = await sharp(fotoBorrada)
    .composite([{ input: Buffer.from(gradienteSvg), blend: "dest-in" }])
    .png()
    .toBuffer();
  const fotoComVinheta = await sharp(fotoRecortada)
    .composite([{ input: bordaBorrada, blend: "over" }])
    .toBuffer();

  const mascaraSvg = `<svg width="${DIAMETRO}" height="${DIAMETRO}"><circle cx="${RAIO}" cy="${RAIO}" r="${RAIO}" fill="#fff"/></svg>`;

  const fotoCircular = await sharp(fotoComVinheta)
    .composite([{ input: Buffer.from(mascaraSvg), blend: "dest-in" }])
    .png()
    .toBuffer();

  return sharp(TEMPLATE_PATH)
    .composite([{ input: fotoCircular, left: CENTRO_X - RAIO, top: CENTRO_Y - RAIO }])
    .jpeg({ quality: 90 })
    .toBuffer();
}

export const TEMPLATE_EXISTE = fs.existsSync(TEMPLATE_PATH);
