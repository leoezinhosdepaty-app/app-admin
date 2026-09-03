import { useState } from "react";
import { NAVY, LIME, apiPublico } from "../../ui.js";

const input = "w-full rounded-lg border px-3 py-2 text-sm";
const inputStyle = { borderColor: "#E6E9F2" };

export default function Experimental({ token, prefill, turmas, onDone }) {
  const [form, setForm] = useState({
    aluno_nome: "",
    aluno_nascimento: "",
    responsavel_nome: prefill?.responsavel_nome ?? "",
    telefone: prefill?.telefone ?? "",
    email: prefill?.email ?? "",
    turma_id: "",
    categoria: "",
    data_aula: "",
  });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await apiPublico("POST", `/api/publico/convite/${token}/experimental`, form);
      onDone();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>Nome do(a) aluno(a)</span>
        <input required className={input} style={inputStyle} value={form.aluno_nome} onChange={set("aluno_nome")} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>Data de nascimento</span>
        <input type="date" className={input} style={inputStyle} value={form.aluno_nascimento} onChange={set("aluno_nascimento")} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>Nome do responsável</span>
        <input required className={input} style={inputStyle} value={form.responsavel_nome} onChange={set("responsavel_nome")} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>Celular (WhatsApp)</span>
        <input required className={input} style={inputStyle} value={form.telefone} onChange={set("telefone")} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>E-mail</span>
        <input type="email" className={input} style={inputStyle} value={form.email} onChange={set("email")} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>Turma de interesse</span>
        <select className={input} style={inputStyle} value={form.turma_id} onChange={set("turma_id")}>
          <option value="">Selecione</option>
          {turmas?.map((t) => (
            <option key={t.id} value={t.id}>{t.locais?.nome} · {t.dias} · {String(t.horario).slice(0, 5)}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>Dia e horário que pretende ir</span>
        <input type="datetime-local" className={input} style={inputStyle} value={form.data_aula} onChange={set("data_aula")} />
      </label>

      {erro && <p className="text-sm font-semibold" style={{ color: "#8C3312" }}>{erro}</p>}

      <button type="submit" disabled={enviando}
        className="w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
        style={{ background: LIME, color: NAVY }}>
        {enviando ? "Enviando…" : "Agendar aula experimental"}
      </button>
    </form>
  );
}
