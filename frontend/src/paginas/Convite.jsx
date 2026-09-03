import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { NAVY, LIME, SAND, apiPublico } from "../ui.js";
import FichaMatricula from "./formularios/FichaMatricula.jsx";
import Anamnese from "./formularios/Anamnese.jsx";
import Contrato from "./formularios/Contrato.jsx";
import Experimental from "./formularios/Experimental.jsx";

const ETAPAS = [
  { chave: "matricula", label: "Ficha de matrícula" },
  { chave: "anamnese", label: "Anamnese" },
  { chave: "contrato", label: "Contrato" },
];

function Casca({ children }) {
  return (
    <div className="min-h-screen p-4 sm:p-8" style={{ background: SAND }}>
      <div className="mx-auto max-w-xl">
        <img src="/logo-leoezinhos.jpeg" alt="Leõezinhos" className="h-14 w-14" />
        <div className="mt-3 rounded-3xl bg-white p-5 sm:p-6" style={{ boxShadow: "0 1px 2px rgba(14,31,73,.08), 0 8px 24px -18px rgba(14,31,73,.5)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Concluido({ titulo, corpo }) {
  return (
    <div className="py-6 text-center">
      <h2 className="text-xl font-bold" style={{ color: NAVY }}>{titulo}</h2>
      <p className="mt-2 text-sm" style={{ color: "#5C678A" }}>{corpo}</p>
    </div>
  );
}

export default function Convite() {
  const { token } = useParams();
  const [convite, setConvite] = useState(undefined); // undefined=carregando, null=não achado
  const [aba, setAba] = useState("matricula");
  const [feito, setFeito] = useState(false);
  const [cobrancaUrl, setCobrancaUrl] = useState(null);

  const carregar = () => {
    apiPublico("GET", `/api/publico/convite/${token}`)
      .then((dados) => {
        setConvite(dados);
        if (dados.tipo === "processo") {
          const proxima = ETAPAS.find((e) => !dados.progresso[e.chave]);
          setAba(proxima?.chave ?? "contrato");
        }
      })
      .catch(() => setConvite(null));
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [token]);

  if (convite === undefined) return <Casca><p className="text-sm" style={{ color: "#5C678A" }}>Carregando…</p></Casca>;
  if (convite === null) return <Casca><Concluido titulo="Link não encontrado" corpo="Confira se o link foi copiado certinho, ou peça um novo pra escola." /></Casca>;

  if (convite.tipo === "experimental") {
    return (
      <Casca>
        {feito
          ? <Concluido titulo="Recebemos! 🦁" corpo="Em breve alguém da escola confirma o dia e horário com você." />
          : <Experimental token={token} prefill={convite.experimental} turmas={convite.turmas} onDone={() => setFeito(true)} />}
      </Casca>
    );
  }

  if (convite.tipo === "matricula") {
    return (
      <Casca>
        {feito
          ? <Concluido titulo="Ficha recebida! 🦁" corpo="Obrigado por preencher. Qualquer pendência, a escola entra em contato." />
          : <FichaMatricula token={token} prefill={{ responsavel: convite.aluno?.responsaveis, aluno: convite.aluno, experimental: convite.experimental, matricula: convite.aluno?.matriculas?.find((m) => m.ativa) }} turmas={convite.turmas} planos={convite.planos} onDone={() => setFeito(true)} />}
      </Casca>
    );
  }

  if (convite.tipo === "anamnese") {
    return (
      <Casca>
        {feito
          ? <Concluido titulo="Anamnese recebida! 🦁" corpo="Obrigado — essas informações ficam com a equipe da escola." />
          : <Anamnese token={token} prefill={convite.anamnese} onDone={() => setFeito(true)} />}
      </Casca>
    );
  }

  if (convite.tipo === "contrato") {
    return (
      <Casca>
        {feito
          ? <Concluido titulo="Contrato assinado! 🦁" corpo="Obrigado. Uma cópia em PDF fica registrada com a escola." />
          : <Contrato token={token} aluno={convite.aluno} onDone={() => setFeito(true)} />}
      </Casca>
    );
  }

  // tipo === 'processo': wizard de 3 etapas
  if (cobrancaUrl) {
    return (
      <Casca>
        <Concluido titulo="Matrícula concluída! 🦁" corpo="Falta só o pagamento da matrícula pra confirmar tudo. Redirecionando pro pagamento…" />
        <a href={cobrancaUrl} className="mt-4 block w-full rounded-xl py-2.5 text-center text-sm font-semibold" style={{ background: LIME, color: NAVY }}>
          Ir para o pagamento
        </a>
      </Casca>
    );
  }

  return (
    <Casca>
      <div className="mb-5 flex gap-2">
        {ETAPAS.map((e, i) => {
          const concluida = convite.progresso[e.chave];
          const ativa = aba === e.chave;
          return (
            <div key={e.chave} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                style={concluida ? { background: NAVY, color: LIME } : ativa ? { background: LIME, color: NAVY } : { background: "#E6E9F2", color: "#7A85A3" }}>
                {concluida ? "✓" : i + 1}
              </div>
              <span className="text-center text-[10px] font-semibold" style={{ color: ativa ? NAVY : "#7A85A3" }}>{e.label}</span>
            </div>
          );
        })}
      </div>

      {aba === "matricula" && (
        <FichaMatricula
          token={token}
          prefill={{ responsavel: convite.aluno?.responsaveis, aluno: convite.aluno, experimental: convite.experimental, matricula: convite.aluno?.matriculas?.find((m) => m.ativa) }}
          turmas={convite.turmas} planos={convite.planos}
          onDone={() => { carregar(); setAba("anamnese"); }}
        />
      )}
      {aba === "anamnese" && (
        <Anamnese token={token} prefill={convite.anamnese} onDone={() => { carregar(); setAba("contrato"); }} />
      )}
      {aba === "contrato" && (
        <Contrato token={token} aluno={convite.aluno} onDone={(resultado) => {
          if (resultado.cobranca_url) setCobrancaUrl(resultado.cobranca_url);
          else setFeito(true);
        }} />
      )}
    </Casca>
  );
}
