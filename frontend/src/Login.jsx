import { useState } from "react";
import { supabase } from "./App";

const NAVY = "#122A5C";
const LIME = "#F0B429";
const SAND = "#F4F2EC";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) setErro(error.message);
    setEnviando(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: SAND }}>
      <form onSubmit={entrar} className="w-full max-w-sm rounded-3xl bg-white p-6"
        style={{ boxShadow: "0 1px 2px rgba(14,31,73,.08), 0 8px 24px -18px rgba(14,31,73,.5)" }}>
        <img src="/logo-leoezinhos.png" alt="Leõezinhos" className="mx-auto mb-3 h-20 w-auto" />
        <h1 className="mt-1 text-center text-xl font-bold" style={{ color: NAVY }}>Gestão Priscila Pereira</h1>
        <p className="mb-6 text-center text-sm" style={{ color: "#5C678A" }}>Leõezinhos · Futebol</p>

        <label className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>E-mail</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoFocus
          className="mb-3 w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2" }} />

        <label className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>Senha</label>
        <input value={senha} onChange={(e) => setSenha(e.target.value)} type="password" required
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2" }} />

        {erro && <p className="mb-3 text-xs font-semibold" style={{ color: "#8C3312" }}>{erro}</p>}

        <button type="submit" disabled={enviando}
          className="w-full rounded-xl py-2 text-sm font-semibold disabled:opacity-50"
          style={{ background: LIME, color: NAVY }}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
