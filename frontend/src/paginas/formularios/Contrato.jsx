import { useEffect, useState } from "react";
import { NAVY, LIME, SAND, apiPublico } from "../../ui.js";

function renderizarMarkdown(texto) {
  const linhas = texto.split("\n");
  const blocos = [];
  let chave = 0;

  const negrito = (linha) => {
    const partes = linha.split("**");
    return partes.map((parte, i) => (i % 2 === 1 ? <strong key={i}>{parte}</strong> : parte));
  };

  for (const linhaBruta of linhas) {
    const linha = linhaBruta.trim();
    chave += 1;

    if (linha === "---") { blocos.push(<hr key={chave} className="my-3" style={{ borderColor: "#D8DCE8" }} />); continue; }
    if (linha === "") { continue; }
    if (/^\|[-:\s|]+\|$/.test(linha)) continue; // separador de tabela

    if (linha.startsWith("### ")) {
      blocos.push(<p key={chave} className="mt-3 mb-1 text-sm font-bold" style={{ color: NAVY }}>{linha.slice(4)}</p>);
      continue;
    }
    if (linha.startsWith("## ")) {
      blocos.push(<p key={chave} className="mt-4 mb-1 text-base font-bold" style={{ color: NAVY }}>{linha.slice(3)}</p>);
      continue;
    }
    if (linha.startsWith("# ")) {
      blocos.push(<p key={chave} className="mt-4 mb-2 text-lg font-bold" style={{ color: NAVY }}>{linha.slice(2)}</p>);
      continue;
    }
    if (linha.startsWith("|")) {
      const celulas = linha.split("|").map((c) => c.trim()).filter(Boolean);
      blocos.push(
        <p key={chave} className="ml-3 text-sm" style={{ color: NAVY }}>{celulas.join("  —  ")}</p>
      );
      continue;
    }
    if (linha.startsWith(">")) {
      blocos.push(
        <p key={chave} className="ml-3 border-l-2 pl-2 text-sm italic" style={{ borderColor: "#D8DCE8", color: "#5C678A" }}>
          {negrito(linha.replace(/^>\s?/, ""))}
        </p>
      );
      continue;
    }

    blocos.push(<p key={chave} className="mb-1.5 text-sm leading-relaxed" style={{ color: NAVY }}>{negrito(linha)}</p>);
  }
  return blocos;
}

export default function Contrato({ token, aluno, onDone }) {
  const [nome, setNome] = useState("");
  const [leu, setLeu] = useState(false);
  const [autorizaImagem, setAutorizaImagem] = useState(null); // true | false
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const [texto, setTexto] = useState(null);
  const [carregandoTexto, setCarregandoTexto] = useState(true);
  const [erroTexto, setErroTexto] = useState(null);

  useEffect(() => {
    let cancelado = false;
    setCarregandoTexto(true);
    apiPublico("GET", `/api/publico/convite/${token}/contrato-texto`)
      .then((r) => { if (!cancelado) setTexto(r.texto); })
      .catch((e) => { if (!cancelado) setErroTexto(e.message); })
      .finally(() => { if (!cancelado) setCarregandoTexto(false); });
    return () => { cancelado = true; };
  }, [token]);

  const podeAssinar = leu && autorizaImagem !== null && nome.trim().length > 3;

  const assinar = async (e) => {
    e.preventDefault();
    if (!podeAssinar) return;
    setEnviando(true);
    setErro(null);
    try {
      const resultado = await apiPublico("POST", `/api/publico/convite/${token}/contrato`, {
        nome_assinante: nome, autoriza_imagem: autorizaImagem,
      });
      onDone(resultado);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={assinar} className="space-y-4">
      <div>
        <p className="mb-1 text-sm font-semibold" style={{ color: NAVY }}>
          Leia o contrato completo antes de assinar
        </p>
        <div
          className="max-h-96 overflow-y-auto rounded-xl border p-4"
          style={{ background: SAND, borderColor: "#E6E9F2" }}
        >
          {carregandoTexto && <p className="text-sm" style={{ color: "#5C678A" }}>Carregando o texto do contrato…</p>}
          {erroTexto && <p className="text-sm font-semibold" style={{ color: "#8C3312" }}>{erroTexto}</p>}
          {texto && renderizarMarkdown(texto)}
        </div>
      </div>

      <div className="space-y-2 rounded-xl border p-3" style={{ borderColor: "#E6E9F2" }}>
        <p className="text-sm font-semibold" style={{ color: NAVY }}>Autorização de uso de imagem</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="imagem" checked={autorizaImagem === true} onChange={() => setAutorizaImagem(true)} />
          Autorizo o uso da imagem do aluno em redes sociais e materiais da escola
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="imagem" checked={autorizaImagem === false} onChange={() => setAutorizaImagem(false)} />
          Não autorizo
        </label>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={leu} onChange={(e) => setLeu(e.target.checked)} />
        <span>Li e concordo com os termos do contrato acima.</span>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>
          Digite seu nome completo como assinatura
        </span>
        <input required value={nome} onChange={(e) => setNome(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2" }} />
      </label>

      {erro && <p className="text-sm font-semibold" style={{ color: "#8C3312" }}>{erro}</p>}

      <button type="submit" disabled={!podeAssinar || enviando}
        className="w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
        style={{ background: LIME, color: NAVY }}>
        {enviando ? "Assinando…" : "Assinar contrato"}
      </button>
    </form>
  );
}
