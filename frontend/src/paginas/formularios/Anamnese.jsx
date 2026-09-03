import { useState } from "react";
import { NAVY, LIME, apiPublico } from "../../ui.js";

const Campo = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>{label}</span>
    {children}
  </label>
);

const input = "w-full rounded-lg border px-3 py-2 text-sm";
const textarea = "w-full rounded-lg border px-3 py-2 text-sm min-h-20";
const inputStyle = { borderColor: "#E6E9F2" };

export default function Anamnese({ token, prefill, onDone }) {
  const [form, setForm] = useState({
    doenca_preexistente: prefill?.doenca_preexistente ?? "",
    problema_fisico: prefill?.problema_fisico ?? "",
    condicao_neurologica: prefill?.condicao_neurologica ?? "",
    remedio_controlado: prefill?.remedio_controlado ?? "",
    plano_saude: prefill?.plano_saude ?? "",
    cartao_sus: prefill?.cartao_sus ?? "",
    contato_emergencia: prefill?.contato_emergencia ?? "",
    autoriza_medico: prefill?.autoriza_medico ?? false,
  });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    if (!form.autoriza_medico) { setErro("É preciso autorizar o atendimento médico de urgência pra continuar."); return; }
    setEnviando(true);
    setErro(null);
    try {
      await apiPublico("POST", `/api/publico/convite/${token}/anamnese`, form);
      onDone();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-4">
      <p className="text-sm" style={{ color: "#5C678A" }}>
        Essas informações ajudam a gente a cuidar melhor do(a) aluno(a) durante as atividades.
      </p>

      <Campo label="Doença pré-existente"><textarea className={textarea} style={inputStyle} value={form.doenca_preexistente} onChange={set("doenca_preexistente")} placeholder="Se não houver, escreva 'nenhuma'" /></Campo>
      <Campo label="Problema físico / limitação"><textarea className={textarea} style={inputStyle} value={form.problema_fisico} onChange={set("problema_fisico")} /></Campo>
      <Campo label="Condição neurológica"><textarea className={textarea} style={inputStyle} value={form.condicao_neurologica} onChange={set("condicao_neurologica")} /></Campo>
      <Campo label="Remédio de uso controlado"><input className={input} style={inputStyle} value={form.remedio_controlado} onChange={set("remedio_controlado")} /></Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Plano de saúde"><input className={input} style={inputStyle} value={form.plano_saude} onChange={set("plano_saude")} /></Campo>
        <Campo label="Cartão SUS"><input className={input} style={inputStyle} value={form.cartao_sus} onChange={set("cartao_sus")} /></Campo>
      </div>
      <Campo label="Contato de emergência (nome e telefone)"><input required className={input} style={inputStyle} value={form.contato_emergencia} onChange={set("contato_emergencia")} /></Campo>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={!!form.autoriza_medico}
          onChange={(e) => setForm((f) => ({ ...f, autoriza_medico: e.target.checked }))} />
        <span>Autorizo o atendimento médico de urgência ao aluno em caso de necessidade.</span>
      </label>

      {erro && <p className="text-sm font-semibold" style={{ color: "#8C3312" }}>{erro}</p>}

      <button type="submit" disabled={enviando}
        className="w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
        style={{ background: LIME, color: NAVY }}>
        {enviando ? "Enviando…" : "Continuar"}
      </button>
    </form>
  );
}
