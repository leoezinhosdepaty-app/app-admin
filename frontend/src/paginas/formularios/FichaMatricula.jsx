import { useState } from "react";
import { NAVY, LIME, SAND, apiPublico } from "../../ui.js";
import SeletorFoto from "../../SeletorFoto.jsx";

function blobParaBase64(blob) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = reject;
    leitor.readAsDataURL(blob);
  });
}

const Campo = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>{label}</span>
    {children}
  </label>
);

const input = "w-full rounded-lg border px-3 py-2 text-sm";
const inputStyle = { borderColor: "#E6E9F2" };

export default function FichaMatricula({ token, prefill, turmas, planos, onDone }) {
  const [form, setForm] = useState({
    responsavel_nome: prefill?.responsavel?.nome ?? prefill?.experimental?.responsavel_nome ?? "",
    responsavel_cpf: prefill?.responsavel?.cpf ?? "",
    responsavel_rg: prefill?.responsavel?.rg ?? "",
    responsavel_telefone: prefill?.responsavel?.telefone ?? prefill?.experimental?.telefone ?? "",
    responsavel_email: prefill?.responsavel?.email ?? prefill?.experimental?.email ?? "",
    responsavel_instagram: prefill?.responsavel?.instagram ?? "",
    responsavel_endereco: prefill?.responsavel?.endereco ?? "",
    aluno_nome: prefill?.aluno?.nome ?? prefill?.experimental?.aluno_nome ?? "",
    aluno_nascimento: prefill?.aluno?.nascimento ?? prefill?.experimental?.aluno_nascimento ?? "",
    categoria: prefill?.aluno?.categoria ?? prefill?.experimental?.categoria ?? "",
    tamanho_uniforme: prefill?.aluno?.tamanho_uniforme ?? "",
    turma_id: prefill?.aluno?.turma_id ?? prefill?.experimental?.turma_id ?? "",
    plano_id: prefill?.matricula?.plano_id ?? "",
  });
  const [fotoBlob, setFotoBlob] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const { aluno_id } = await apiPublico("POST", `/api/publico/convite/${token}/matricula`, {
        responsavel: {
          nome: form.responsavel_nome, cpf: form.responsavel_cpf, rg: form.responsavel_rg,
          telefone: form.responsavel_telefone, email: form.responsavel_email,
          instagram: form.responsavel_instagram, endereco: form.responsavel_endereco,
        },
        aluno: {
          nome: form.aluno_nome, nascimento: form.aluno_nascimento,
          categoria: form.categoria, tamanho_uniforme: form.tamanho_uniforme,
        },
        turma_id: form.turma_id, plano_id: form.plano_id,
        foto_base64: fotoBlob ? await blobParaBase64(fotoBlob) : undefined,
      });
      onDone(aluno_id);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-4">
      <h3 className="font-bold" style={{ color: NAVY }}>Dados do responsável</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Nome completo"><input required className={input} style={inputStyle} value={form.responsavel_nome} onChange={set("responsavel_nome")} /></Campo>
        <Campo label="CPF"><input required className={input} style={inputStyle} value={form.responsavel_cpf} onChange={set("responsavel_cpf")} /></Campo>
        <Campo label="RG"><input className={input} style={inputStyle} value={form.responsavel_rg} onChange={set("responsavel_rg")} /></Campo>
        <Campo label="Celular (WhatsApp)"><input required className={input} style={inputStyle} value={form.responsavel_telefone} onChange={set("responsavel_telefone")} /></Campo>
        <Campo label="E-mail"><input type="email" className={input} style={inputStyle} value={form.responsavel_email} onChange={set("responsavel_email")} /></Campo>
        <Campo label="Instagram"><input className={input} style={inputStyle} value={form.responsavel_instagram} onChange={set("responsavel_instagram")} /></Campo>
        <Campo label="Endereço"><input className={input} style={inputStyle} value={form.responsavel_endereco} onChange={set("responsavel_endereco")} /></Campo>
      </div>

      <h3 className="font-bold" style={{ color: NAVY }}>Dados do(a) aluno(a)</h3>
      <Campo label="Foto do rosto do(a) aluno(a)">
        <SeletorFoto onConfirmar={setFotoBlob} cor={NAVY} />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Nome completo"><input required className={input} style={inputStyle} value={form.aluno_nome} onChange={set("aluno_nome")} /></Campo>
        <Campo label="Data de nascimento"><input required type="date" className={input} style={inputStyle} value={form.aluno_nascimento} onChange={set("aluno_nascimento")} /></Campo>
        <Campo label="Categoria (se souber)"><input className={input} style={inputStyle} value={form.categoria} onChange={set("categoria")} placeholder="Sub 9" /></Campo>
        <Campo label="Tamanho do uniforme"><input className={input} style={inputStyle} value={form.tamanho_uniforme} onChange={set("tamanho_uniforme")} placeholder="8, 10, P, M..." /></Campo>
        <Campo label="Turma">
          <select required className={input} style={inputStyle} value={form.turma_id} onChange={set("turma_id")}>
            <option value="">Selecione</option>
            {turmas?.map((t) => (
              <option key={t.id} value={t.id}>{t.locais?.nome} · {t.dias} · {String(t.horario).slice(0, 5)}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Plano">
          <select required className={input} style={inputStyle} value={form.plano_id} onChange={set("plano_id")}>
            <option value="">Selecione</option>
            {planos?.map((p) => (
              <option key={p.id} value={p.id}>{p.nome} — R$ {Number(p.valor).toFixed(2)} ({p.frequencia_semanal}x/semana)</option>
            ))}
          </select>
        </Campo>
      </div>

      {erro && <p className="text-sm font-semibold" style={{ color: "#8C3312" }}>{erro}</p>}

      <button type="submit" disabled={enviando}
        className="w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
        style={{ background: LIME, color: NAVY }}>
        {enviando ? "Enviando…" : "Continuar"}
      </button>
    </form>
  );
}
