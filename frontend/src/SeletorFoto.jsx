import { useRef, useState } from "react";

const SAIDA = 480; // px do lado do quadrado exportado

function pontoDoEvento(e) {
  if (e.touches?.[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

/* Modal de recorte: arrasta pra posicionar, controle deslizante pra dar zoom.
   Sempre corta um quadrado (bom pra foto de rosto). */
function ModalRecorte({ src, fechar, onConfirmar, cor }) {
  const QUADRO = 260;
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const arrastando = useRef(false);
  const ultimo = useRef({ x: 0, y: 0 });
  const imgRef = useRef(null);
  const [dimensoes, setDimensoes] = useState(null); // { largura, altura } naturais

  const iniciar = (e) => {
    arrastando.current = true;
    ultimo.current = pontoDoEvento(e);
  };
  const mover = (e) => {
    if (!arrastando.current) return;
    const p = pontoDoEvento(e);
    setPos((v) => ({ x: v.x + (p.x - ultimo.current.x), y: v.y + (p.y - ultimo.current.y) }));
    ultimo.current = p;
  };
  const parar = () => { arrastando.current = false; };

  const escalaBase = dimensoes ? QUADRO / Math.min(dimensoes.largura, dimensoes.altura) : 1;
  const escala = escalaBase * zoom;

  const confirmar = () => {
    const img = imgRef.current;
    if (!img || !dimensoes) return;
    const canvas = document.createElement("canvas");
    canvas.width = SAIDA;
    canvas.height = SAIDA;
    const ctx = canvas.getContext("2d");
    const fatorSaida = SAIDA / QUADRO;
    const escalaFinal = escala * fatorSaida;
    const largura = dimensoes.largura * escalaFinal;
    const altura = dimensoes.altura * escalaFinal;
    const x = (SAIDA - largura) / 2 + pos.x * fatorSaida;
    const y = (SAIDA - altura) / 2 + pos.y * fatorSaida;
    ctx.drawImage(img, x, y, largura, altura);
    canvas.toBlob((blob) => { if (blob) onConfirmar(blob); }, "image/jpeg", 0.9);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(14,31,73,.6)" }}>
      <div className="w-full max-w-xs rounded-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <p className="mb-3 text-center text-sm font-semibold" style={{ color: cor }}>Ajuste a foto do rosto</p>
        <div
          className="relative mx-auto overflow-hidden rounded-full select-none"
          style={{ width: QUADRO, height: QUADRO, background: "#E6E9F2", cursor: arrastando.current ? "grabbing" : "grab", touchAction: "none" }}
          onMouseDown={iniciar} onMouseMove={mover} onMouseUp={parar} onMouseLeave={parar}
          onTouchStart={iniciar} onTouchMove={mover} onTouchEnd={parar}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => setDimensoes({ largura: e.target.naturalWidth, altura: e.target.naturalHeight })}
            style={dimensoes ? {
              position: "absolute",
              left: "50%", top: "50%",
              width: dimensoes.largura * escala, height: dimensoes.altura * escala,
              transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
            } : { display: "none" }}
          />
        </div>
        <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
          className="mt-4 w-full" />
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={confirmar} disabled={!dimensoes}
            className="flex-1 rounded-xl py-2 text-sm font-semibold disabled:opacity-50" style={{ background: cor, color: "#fff" }}>
            Usar essa foto
          </button>
          <button type="button" onClick={fechar} className="rounded-xl border px-4 py-2 text-sm font-semibold" style={{ color: cor, borderColor: "#E6E9F2" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/* Campo de foto reutilizável: mostra a foto atual (ou um círculo vazio),
   deixa escolher um arquivo e recortar antes de confirmar.
   onConfirmar recebe o Blob JPEG já recortado (quadrado). */
export default function SeletorFoto({ fotoUrl, onConfirmar, cor = "#122A5C" }) {
  const [origem, setOrigem] = useState(null); // object URL do arquivo escolhido, enquanto recorta
  const [preview, setPreview] = useState(fotoUrl ?? null);
  const inputRef = useRef(null);

  const escolherArquivo = (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setOrigem(URL.createObjectURL(arquivo));
  };

  const confirmarRecorte = (blob) => {
    const url = URL.createObjectURL(blob);
    setPreview(url);
    setOrigem(null);
    onConfirmar(blob);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full" style={{ background: "#E6E9F2" }}>
        {preview && <img src={preview} alt="Foto do aluno" className="h-full w-full object-cover" />}
      </div>
      <div>
        <button type="button" onClick={() => inputRef.current?.click()}
          className="rounded-xl border px-3 py-1.5 text-xs font-semibold" style={{ color: cor, borderColor: "#E6E9F2" }}>
          {preview ? "Trocar foto" : "Adicionar foto"}
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={escolherArquivo} className="hidden" />
      </div>

      {origem && <ModalRecorte src={origem} fechar={() => setOrigem(null)} onConfirmar={confirmarRecorte} cor={cor} />}
    </div>
  );
}
