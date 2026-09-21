import React, { useEffect, useState, useMemo, useContext, createContext } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  LayoutDashboard, Users, ClipboardList, Wallet, Award, CalendarDays,
  MessageSquare, Search, ArrowRight, AlertCircle, X, Plus, RefreshCw, LogOut,
  FileText, Power, Pencil, Eye, EyeOff, Trash2, KeyRound, Star, Send
} from "lucide-react";
import SeletorFoto from "./SeletorFoto.jsx";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const API_URL = import.meta.env.VITE_API_URL;

async function apiAuth(metodo, path, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${API_URL}${path}`, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Erro ${res.status}`);
  return json;
}
const apiPost = (path, body) => apiAuth("POST", path, body);
const apiGet = (path) => apiAuth("GET", path);

/* ---------- identidade visual (ajustar quando a logo chegar) ---------- */
const NAVY = "#122A5C";
const LIME = "#F0B429";
const SAND = "#F4F2EC";
const CLAY = "#D8683A";

/* ------------------------------ dados ------------------------------ */
function useQuery(chave, montar, deps = []) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const buscar = async () => {
    setCarregando(true);
    const { data, error } = await montar();
    if (error) setErro(error.message);
    else { setDados(data); setErro(null); }
    setCarregando(false);
  };

  useEffect(() => { buscar(); /* eslint-disable-next-line */ }, deps);
  return { dados, erro, carregando, recarregar: buscar };
}

/* Status da conexão do WhatsApp (uazapi) — consultado ao entrar e a cada 2 minutos. */
function useStatusWhatsApp() {
  const [status, setStatus] = useState(null); // null = carregando ainda

  const buscar = async () => {
    try {
      const dados = await apiGet("/api/uazapi/status");
      setStatus(dados);
    } catch (e) {
      setStatus({ conectado: false, erro: e.message });
    }
  };

  useEffect(() => {
    buscar();
    const id = setInterval(buscar, 120000);
    return () => clearInterval(id);
  }, []);

  return status;
}

const StatusWhatsAppContext = createContext(null);
const useStatusWhatsAppContexto = () => useContext(StatusWhatsAppContext);

/* Bolinha + texto — usado na barra lateral (compacto) e como alerta (banner). */
function BolinhaStatusWhatsApp({ compacto }) {
  const status = useStatusWhatsAppContexto();
  if (!status) return null;
  const cor = status.conectado ? "#1F9D55" : "#C0392B";
  if (compacto) {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: compacto === "claro" ? "#fff" : NAVY, opacity: compacto === "claro" ? 0.85 : 1 }}>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cor }} />
        WhatsApp {status.conectado ? "conectado" : "desconectado"}
      </div>
    );
  }
  if (status.conectado) return null;
  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl p-4" style={{ background: "#FBE0D5" }}>
      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cor }} />
      <div>
        <p className="text-sm font-bold" style={{ color: "#8C3312" }}>WhatsApp desconectado</p>
        <p className="text-xs" style={{ color: "#8C3312" }}>
          Nenhuma mensagem automática está saindo (cobrança, convite, lembrete). Escaneie o QR code de novo no painel da uazapi pra reconectar.
        </p>
      </div>
    </div>
  );
}

const qAlunos = () => supabase
  .from("alunos")
  .select(`id, nome, nascimento, categoria, tamanho_uniforme, bolsista, status, observacoes, foto_url,
           responsaveis ( id, nome, telefone, cpf, email ),
           turmas ( id, dias, horario, locais ( id, nome ) ),
           matriculas ( id, plano_id, valor_mensalidade, dia_vencimento, ativa, planos ( nome ) ),
           documentos ( tipo, assinado_em ),
           anamneses ( doenca_preexistente, problema_fisico, condicao_neurologica, remedio_controlado,
                       plano_saude, cartao_sus, contato_emergencia, autoriza_medico, preenchida_em ),
           cobrancas ( status, descricao, valor, vencimento ),
           experimentais ( situacao, data_aula, turmas ( dias, horario, locais ( nome ) ) )`)
  .order("nome");

const qExperimentais = () => supabase
  .from("experimentais")
  .select("*, turmas ( dias, horario, locais ( nome ) )")
  .in("situacao", ["agendada", "compareceu"])
  .order("data_aula", { ascending: true });

const qCobrancas = () => supabase
  .from("cobrancas")
  .select("*, alunos ( nome, responsaveis ( nome, telefone ) ), locais ( nome )")
  .order("vencimento", { ascending: false })
  .limit(200);

const qProfessores = () => supabase
  .from("professores").select("*").eq("ativo", true).order("nome");

const qEventos = () => supabase
  .from("eventos").select("*, locais ( nome )").order("data");

const qTurmasAtivas = () => supabase
  .from("turmas").select("id, dias, horario, locais ( nome )").eq("ativo", true);

const qPlanosAtivos = () => supabase
  .from("planos").select("id, nome, frequencia_semanal, valor").eq("ativo", true).order("valor");

const qLocaisAtivos = () => supabase
  .from("locais").select("id, nome").eq("ativo", true).order("nome");

const qConversas = () => supabase
  .from("conversas").select("*").order("ultima_resposta", { ascending: false, nullsFirst: false });

const qOportunidades = () => supabase
  .from("conversas").select("*").eq("oportunidade", true).order("ultima_resposta", { ascending: false, nullsFirst: false });

const qResponsaveisPorTelefone = () => supabase
  .from("responsaveis").select("id, nome, telefone, alunos ( id, nome )");

const qThread = (telefone) => supabase
  .from("mensagens").select("*").eq("telefone", telefone).order("criado_em", { ascending: true }).limit(200);

const qExperimentaisSemana = () => {
  const hoje = new Date();
  const emUmaSemana = new Date(hoje.getTime() + 7 * 86400000);
  return supabase.from("experimentais").select("*, turmas ( dias, horario, locais ( nome ) )")
    .in("situacao", ["agendada", "compareceu"])
    .gte("data_aula", hoje.toISOString().slice(0, 10))
    .lte("data_aula", emUmaSemana.toISOString())
    .order("data_aula", { ascending: true });
};

const qInadimplentes = () => supabase
  .from("alunos").select("id, nome, responsaveis ( nome, telefone ), cobrancas ( id, descricao, valor, vencimento, status, link_pagamento )")
  .eq("status", "inadimplente");

/* Cria (sem enviar automaticamente pelo backend) um convite frio — sem aluno/experimental
   vinculado — e manda a mensagem com o link direto pelo WhatsApp. Usado em Conversas/Oportunidades. */
async function enviarLinkConvite(tipo, telefone, nomeConversa) {
  const { url_publica } = await apiPost("/api/convites", { tipo, enviar: false });
  const textos = {
    experimental: `Oi${nomeConversa ? `, ${nomeConversa}` : ""}! 🦁 Segue o formulário pra agendar a aula experimental. É rapidinho:\n${url_publica}`,
    processo: `Oi${nomeConversa ? `, ${nomeConversa}` : ""}! 🦁⚽ Vamos matricular! É rapidinho, em 3 passos (ficha, anamnese e contrato):\n${url_publica}`,
  };
  const { error } = await supabase.from("mensagens").insert({
    telefone, direcao: "saida", tipo: `convite_${tipo}`, corpo: textos[tipo], status: "na_fila", agendada_para: new Date().toISOString(),
  });
  if (error) throw error;
}

/* ---------------------------- utilidades ---------------------------- */
// "YYYY-MM-DD" é só uma data, sem hora — nunca passa por new Date() aqui, porque
// isso vira meia-noite UTC e desloca um dia pra trás em fusos negativos (Brasil).
const idade = (nasc) => {
  if (!nasc) return null;
  const [ano, mes, dia] = nasc.slice(0, 10).split("-").map(Number);
  const hoje = new Date();
  let a = hoje.getFullYear() - ano;
  const m = (hoje.getMonth() + 1) - mes;
  if (m < 0 || (m === 0 && hoje.getDate() < dia)) a--;
  return a;
};
const brl = (v) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const dataBr = (d) => {
  if (!d) return "—";
  // "YYYY-MM-DD" puro (sem hora) é só uma data — reformata direto, sem passar por
  // new Date()/toLocaleDateString(), senão vira meia-noite UTC e mostra um dia a menos
  // pra quem está num fuso negativo (Brasil). Datas com hora (timestamps) seguem normal.
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d.split("-").reverse().join("/") : new Date(d).toLocaleDateString("pt-BR");
};
const turmaTxt = (t) => t ? `${t.locais?.nome} · ${t.dias} · ${String(t.horario).slice(0, 5)}` : "Sem turma";

const pendenciasDe = (a) => {
  const p = [];
  if (!a.nascimento) p.push("Data de nascimento");
  if (!a.turmas) p.push("Turma");
  if (!a.categoria) p.push("Categoria");
  if (!a.matriculas?.some((m) => m.ativa)) p.push("Matrícula");
  if (!a.anamneses) p.push("Anamnese");
  if (!a.documentos?.some((d) => d.tipo === "contrato" && d.assinado_em)) p.push("Contrato assinado");
  return p;
};

const STATUS = {
  ativo: { txt: "Ativo", bg: "#DCF3D6", fg: "#1F5B2C" },
  inadimplente: { txt: "Inadimplente", bg: "#FBE0D5", fg: "#8C3312" },
  pendente: { txt: "Matrícula incompleta", bg: "#FFF2C9", fg: "#7A5A00" },
  experimental: { txt: "Experimental", bg: "#E6E9F2", fg: "#334066" },
  inativo: { txt: "Inativo", bg: "#EDEDED", fg: "#666" },
  pago: { txt: "Pago", bg: "#DCF3D6", fg: "#1F5B2C" },
  vencido: { txt: "Vencido", bg: "#FBE0D5", fg: "#8C3312" },
  aberto: { txt: "Em aberto", bg: "#E6E9F2", fg: "#334066" },
  isento: { txt: "Bolsista", bg: "#E8E3F7", fg: "#4A3583" },
  cancelado: { txt: "Cancelado", bg: "#EDEDED", fg: "#666" },
  enviada: { txt: "Enviada", bg: "#DCF3D6", fg: "#1F5B2C" },
  na_fila: { txt: "Na fila", bg: "#FFF2C9", fg: "#7A5A00" },
  falhou: { txt: "Falhou", bg: "#FBE0D5", fg: "#8C3312" },
  agendada: { txt: "Agendada", bg: "#E6E9F2", fg: "#334066" },
  compareceu: { txt: "Compareceu", bg: "#DCF3D6", fg: "#1F5B2C" },
};

const Tag = ({ s }) => {
  const c = STATUS[s] ?? { txt: s, bg: "#E6E9F2", fg: "#334066" };
  return <span className="inline-block rounded-full px-2 py-1 text-xs font-semibold"
    style={{ background: c.bg, color: c.fg }}>{c.txt}</span>;
};

/* ocultar valores financeiros — pra usar o app perto de outras pessoas sem expor R$ */
const OcultarContext = createContext([false, () => {}]);
const useOcultarValores = () => useContext(OcultarContext);

/* perfil do usuário logado — equipe (padrão) ou professor (acesso restrito) */
const PerfilContext = createContext({ role: "staff", professorId: null });
const usePerfil = () => useContext(PerfilContext);
const perfilDe = (sessao) => {
  const meta = sessao?.user?.app_metadata ?? {};
  return { role: meta.role ?? "staff", professorId: meta.professor_id ?? null };
};

const Valor = ({ children }) => {
  const [ocultar] = useOcultarValores();
  const { role } = usePerfil();
  return (ocultar || role === "professor") ? <span style={{ letterSpacing: "1px" }}>R$ ••••</span> : children;
};

const Card = ({ children, className = "", onClick }) => (
  <div className={`rounded-2xl bg-white p-4 ${className}`} onClick={onClick}
    style={{ boxShadow: "0 1px 2px rgba(14,31,73,.08), 0 8px 24px -18px rgba(14,31,73,.5)" }}>{children}</div>
);

const Botao = ({ children, onClick, tom = "lime", icon: Icon, disabled }) => {
  const estilo = tom === "lime" ? { background: LIME, color: NAVY }
    : tom === "navy" ? { background: NAVY, color: "#fff" }
      : { background: "transparent", color: NAVY, border: "1.5px solid #0E1F4922" };
  return (
    <button onClick={onClick} disabled={disabled} style={estilo}
      className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:opacity-90 focus:outline-none focus:ring-2 disabled:opacity-50">
      {Icon && <Icon size={16} />} {children}
    </button>
  );
};

const Estado = ({ carregando, erro, vazio, children, recarregar }) => {
  if (carregando) return <Card><p className="text-sm" style={{ color: "#5C678A" }}>Carregando…</p></Card>;
  if (erro) return (
    <Card>
      <p className="text-sm font-semibold" style={{ color: CLAY }}>Não deu para carregar: {erro}</p>
      <p className="mt-1 text-xs" style={{ color: "#5C678A" }}>
        Confira as chaves no .env e se as policies de RLS foram aplicadas.
      </p>
      <div className="mt-3"><Botao icon={RefreshCw} onClick={recarregar}>Tentar de novo</Botao></div>
    </Card>
  );
  if (vazio) return <Card><p className="text-sm" style={{ color: "#5C678A" }}>Nada por aqui ainda.</p></Card>;
  return children;
};

const Titulo = ({ children, acao }) => (
  <div className="mb-4 flex items-end justify-between gap-3">
    <h2 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>{children}</h2>
    {acao}
  </div>
);

/* ------------------------------ telas ------------------------------ */

function CardExperimentalSemana({ e, recarregar }) {
  const [convertendo, setConvertendo] = useState(false);
  const [aviso, setAviso] = useState(null);

  const converter = async () => {
    setConvertendo(true);
    setAviso(null);
    try {
      await apiPost("/api/convites", { tipo: "processo", experimental_id: e.id });
      setAviso("Link de matrícula enviado!");
      recarregar();
    } catch (err) {
      setAviso(err.message);
    } finally {
      setConvertendo(false);
    }
  };

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl p-2" style={{ background: SAND }}>
      <div className="min-w-0">
        <p className="truncate font-semibold" style={{ color: NAVY }}>{e.aluno_nome}</p>
        <p className="truncate text-xs" style={{ color: "#5C678A" }}>
          {e.data_aula ? new Date(e.data_aula).toLocaleString("pt-BR") : "sem data"} · {turmaTxt(e.turmas)}
        </p>
        {aviso && <p className="text-xs font-semibold" style={{ color: "#1F5B2C" }}>{aviso}</p>}
      </div>
      <Botao tom="ghost" icon={ArrowRight} onClick={converter} disabled={convertendo || !!e.aluno_id}>
        {e.aluno_id ? "Convertido" : convertendo ? "Enviando…" : "Converter em Matrícula"}
      </Botao>
    </li>
  );
}

function Painel({ ir }) {
  const { role } = usePerfil();
  const alunos = useQuery("alunos", qAlunos);
  const cobrancas = useQuery("cobrancas", qCobrancas);
  const experimentaisSemana = useQuery("exp-semana", qExperimentaisSemana);
  const [criandoAluno, setCriandoAluno] = useState(false);

  const lista = alunos.dados ?? [];
  const cobs = cobrancas.dados ?? [];
  const hoje = new Date();
  const aniversariantes = lista.filter((a) => {
    if (!a.nascimento) return false;
    const [, mes, dia] = a.nascimento.slice(0, 10).split("-").map(Number);
    return mes === hoje.getMonth() + 1 && dia === hoje.getDate();
  });
  const emAtraso = cobs.filter((c) => c.status === "vencido" ||
    (c.status === "aberto" && new Date(c.vencimento) < hoje));
  const previsto = lista.filter((a) => a.status === "ativo").reduce((s, a) =>
    s + Number(a.matriculas?.find((m) => m.ativa)?.valor_mensalidade ?? 0), 0);
  const comPendencia = lista.filter((a) => a.status !== "inativo" && pendenciasDe(a).length);

  const metricas = [
    { l: "Alunos ativos", v: lista.filter((a) => a.status === "ativo").length },
    ...(role === "professor" ? [] : [
      { l: "Previsto no mês", v: brl(previsto), dinheiro: true },
      { l: "Em atraso", v: brl(emAtraso.reduce((s, c) => s + Number(c.valor), 0)), dinheiro: true },
    ]),
    { l: "Com pendência", v: comPendencia.length },
  ];

  return (
    <div>
      <Titulo acao={role !== "professor" && <Botao icon={Plus} onClick={() => setCriandoAluno(true)}>Novo Aluno</Botao>}>Painel</Titulo>

      <BolinhaStatusWhatsApp />

      <Estado carregando={alunos.carregando} erro={alunos.erro} recarregar={alunos.recarregar}>
        <>
          {aniversariantes.length > 0 && (
            <div className="mb-4 rounded-2xl p-4" style={{ background: NAVY, color: "#fff" }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: LIME }}>Aniversário hoje</p>
              {aniversariantes.map((a) => (
                <p key={a.id} className="mt-1 text-lg font-semibold">
                  {a.nome} faz {idade(a.nascimento)} anos
                </p>
              ))}
              <div className="mt-3"><Botao onClick={() => ir("mensagens")}>Ver fila de mensagens</Botao></div>
            </div>
          )}

          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {metricas.map((m) => (
              <Card key={m.l}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#7A85A3" }}>{m.l}</p>
                <p className="mt-2 text-xl font-bold" style={{ color: NAVY }}>{m.dinheiro ? <Valor>{m.v}</Valor> : m.v}</p>
              </Card>
            ))}
          </div>

          <Card className="mb-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold" style={{ color: NAVY }}>Aulas experimentais na semana</h3>
              <CalendarDays size={18} style={{ color: CLAY }} />
            </div>
            {(experimentaisSemana.dados ?? []).length === 0 ? (
              <p className="text-sm" style={{ color: "#5C678A" }}>Nenhuma aula experimental agendada pros próximos 7 dias.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {experimentaisSemana.dados.map((e) => (
                  <CardExperimentalSemana key={e.id} e={e} recarregar={experimentaisSemana.recarregar} />
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold" style={{ color: NAVY }}>Precisa de você</h3>
              <AlertCircle size={18} style={{ color: CLAY }} />
            </div>
            {comPendencia.length === 0
              ? <p className="text-sm" style={{ color: "#5C678A" }}>Nenhuma pendência. Cadastro em dia.</p>
              : (
                <ul className="space-y-2 text-sm">
                  {comPendencia.slice(0, 8).map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-3 rounded-xl p-2" style={{ background: SAND }}>
                      <div>
                        <p className="font-semibold" style={{ color: NAVY }}>{a.nome}</p>
                        <p style={{ color: "#5C678A" }}>{pendenciasDe(a).join(" · ")}</p>
                      </div>
                      <button onClick={() => ir("alunos")} className="shrink-0 text-xs font-bold" style={{ color: CLAY }}>Abrir</button>
                    </li>
                  ))}
                </ul>
              )}
            {comPendencia.length > 8 && (
              <p className="mt-2 text-xs" style={{ color: "#5C678A" }}>e mais {comPendencia.length - 8}.</p>
            )}
          </Card>
        </>
      </Estado>

      {criandoAluno && (
        <ModalForm titulo="Novo aluno" fechar={() => setCriandoAluno(false)}
          campos={CAMPOS_NOVO_ALUNO}
          aoSalvar={async (v) => { await criarAlunoNovo(v); alunos.recarregar(); }} />
      )}
    </div>
  );
}

const CAMPOS_NOVO_ALUNO = [
  { chave: "aluno_nome", label: "Nome do aluno", obrigatorio: true },
  { chave: "aluno_nascimento", label: "Data de nascimento", tipo: "date" },
  { chave: "categoria", label: "Categoria" },
  { chave: "responsavel_nome", label: "Nome do responsável", obrigatorio: true },
  { chave: "responsavel_telefone", label: "Telefone do responsável", obrigatorio: true },
  { chave: "responsavel_cpf", label: "CPF do responsável" },
];

async function criarAlunoNovo(v) {
  const { data: existente } = await supabase.from("responsaveis").select("id")
    .eq("telefone", v.responsavel_telefone).maybeSingle();
  let responsavelId = existente?.id;
  if (!responsavelId) {
    const { data: novo, error: e1 } = await supabase.from("responsaveis").insert({
      nome: v.responsavel_nome, telefone: v.responsavel_telefone, cpf: v.responsavel_cpf || null,
    }).select().single();
    if (e1) throw e1;
    responsavelId = novo.id;
  }
  const { error: e2 } = await supabase.from("alunos").insert({
    responsavel_id: responsavelId, nome: v.aluno_nome,
    nascimento: v.aluno_nascimento || null, categoria: v.categoria || null, status: "pendente",
  });
  if (e2) throw e2;
}

const UNIDADES = ["INSA", "MPAC", "KARATE"];

const STATUS_ALUNO_FILTROS = ["Todos", "ativo", "pendente", "inativo"];

function Alunos() {
  const { dados, erro, carregando, recarregar } = useQuery("alunos", qAlunos);
  const [busca, setBusca] = useState("");
  const [local, setLocal] = useState("Todos");
  const [statusFiltro, setStatusFiltro] = useState("ativo");
  const [aberto, setAberto] = useState(null);
  const [criando, setCriando] = useState(false);

  const lista = useMemo(() => (dados ?? []).filter((a) =>
    a.nome?.toLowerCase().includes(busca.toLowerCase()) &&
    (local === "Todos" || a.turmas?.locais?.nome === local) &&
    (statusFiltro === "Todos" || a.status === statusFiltro)
  ), [dados, busca, local, statusFiltro]);

  return (
    <div>
      <Titulo acao={<Botao icon={Plus} onClick={() => setCriando(true)}>Novo aluno</Botao>}>Alunos</Titulo>

      <div className="mb-2 flex flex-wrap gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-3 py-2">
          <Search size={16} style={{ color: "#7A85A3" }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome"
            className="w-full bg-transparent text-sm outline-none" style={{ color: NAVY }} />
        </div>
        {["Todos", ...UNIDADES].map((l) => (
          <button key={l} onClick={() => setLocal(l)} className="rounded-xl px-3 py-2 text-sm font-semibold"
            style={local === l ? { background: NAVY, color: "#fff" } : { background: "#fff", color: NAVY }}>{l}</button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_ALUNO_FILTROS.map((s) => (
          <button key={s} onClick={() => setStatusFiltro(s)} className="rounded-xl px-3 py-2 text-xs font-semibold"
            style={statusFiltro === s ? { background: LIME, color: NAVY } : { background: "#fff", color: "#5C678A" }}>
            {s === "Todos" ? "Todos" : STATUS[s]?.txt ?? s}
          </button>
        ))}
      </div>

      <Estado carregando={carregando} erro={erro} recarregar={recarregar} vazio={lista.length === 0}>
        <div className="space-y-2">
          {lista.map((a) => (
            <Card key={a.id}>
              <button onClick={() => setAberto(a)} className="flex w-full items-center gap-3 text-left">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold"
                  style={{ background: NAVY, color: LIME }}>
                  {a.foto_url ? <img src={a.foto_url} alt="" className="h-full w-full object-cover" /> : a.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold" style={{ color: NAVY }}>{a.nome}</p>
                  <p className="truncate text-xs" style={{ color: "#5C678A" }}>
                    {a.nascimento ? `${idade(a.nascimento)} anos · ` : ""}{a.categoria || "sem categoria"} · {turmaTxt(a.turmas)}
                  </p>
                </div>
                {pendenciasDe(a).length > 0 && <AlertCircle size={16} style={{ color: CLAY }} />}
                <Tag s={a.status} />
              </button>
            </Card>
          ))}
        </div>
      </Estado>

      {aberto && <Ficha a={aberto} fechar={() => setAberto(null)} recarregar={recarregar} />}

      {criando && (
        <ModalForm titulo="Novo aluno" fechar={() => setCriando(false)}
          campos={CAMPOS_NOVO_ALUNO}
          aoSalvar={async (v) => { await criarAlunoNovo(v); recarregar(); }} />
      )}
    </div>
  );
}

const ACOES = [
  { tipo: "processo", label: "Matricular", icon: ArrowRight },
  { tipo: "matricula", label: "Enviar Ficha de Matrícula", icon: FileText },
  { tipo: "anamnese", label: "Enviar Anamnese", icon: ClipboardList },
  { tipo: "experimental", label: "Enviar Form. Aula Experimental", icon: ClipboardList },
  { tipo: "contrato-gerar", label: "Gerar Contrato", icon: FileText },
  { tipo: "contrato", label: "Enviar Contrato", icon: FileText },
  { tipo: "contrato-ver", label: "Ver Contrato", icon: FileText },
];

const ETAPAS_ALUNO = [
  { chave: "ficha", label: "Ficha", feito: (a, mat) => !!mat },
  { chave: "anamnese", label: "Anamnese", feito: (a) => !!a.anamneses },
  { chave: "contrato", label: "Contrato", feito: (a) => !!a.documentos?.some((d) => d.tipo === "contrato" && d.assinado_em) },
  { chave: "pagamento", label: "Pagamento", feito: (a) => a.bolsista || !!a.cobrancas?.some((c) => c.status === "pago") },
];

function ChecklistMatricula({ a, mat }) {
  const { role } = usePerfil();
  const etapas = role === "professor" ? ETAPAS_ALUNO.filter((e) => e.chave !== "pagamento") : ETAPAS_ALUNO;
  return (
    <div className="mb-4 flex gap-2">
      {etapas.map((e) => {
        const concluida = e.feito(a, mat);
        return (
          <div key={e.chave} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
              style={concluida ? { background: NAVY, color: LIME } : { background: "#FBE0D5", color: "#8C3312" }}>
              {concluida ? "✓" : "·"}
            </div>
            <span className="text-center text-[10px] font-semibold" style={{ color: concluida ? NAVY : "#8C3312" }}>
              {concluida ? e.label : `${e.label} pendente`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const CardAcao = ({ titulo, children }) => (
  <div className="rounded-2xl border p-4" style={{ borderColor: "#E6E9F2" }}>
    <p className="mb-2 text-sm font-bold" style={{ color: NAVY }}>{titulo}</p>
    {children}
  </div>
);

function Ficha({ a, fechar, recarregar }) {
  const { role } = usePerfil();
  const mat = a.matriculas?.find((m) => m.ativa);
  const pend = pendenciasDe(a);
  const { dados: turmas } = useQuery("turmas-ativas", qTurmasAtivas);
  const { dados: planos } = useQuery("planos-ativos", qPlanosAtivos);
  const [gerando, setGerando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [descricao, setDescricao] = useState(mat ? `Mensalidade - ${a.nome}` : `Cobrança avulsa - ${a.nome}`);
  const [valor, setValor] = useState(mat ? String(mat.valor_mensalidade) : "");
  const [resultado, setResultado] = useState(null); // { url } | { erro }
  const [enviando, setEnviando] = useState(false);
  const [status, setStatus] = useState(a.status);
  const [aviso, setAviso] = useState(null);
  const [linkContrato, setLinkContrato] = useState(null);
  const [fotoUrl, setFotoUrl] = useState(a.foto_url);
  const [notas, setNotas] = useState(a.observacoes ?? "");
  const [salvandoNotas, setSalvandoNotas] = useState(false);

  const salvarNotas = async () => {
    setSalvandoNotas(true);
    const { error } = await supabase.from("alunos").update({ observacoes: notas || null }).eq("id", a.id);
    setSalvandoNotas(false);
    if (!error) recarregar?.();
  };

  const salvarFoto = async (blob) => {
    const { error: erroUpload } = await supabase.storage.from("alunos")
      .upload(`${a.id}.jpg`, blob, { contentType: "image/jpeg", upsert: true });
    if (erroUpload) { setAviso(erroUpload.message); return; }
    const { data: pub } = supabase.storage.from("alunos").getPublicUrl(`${a.id}.jpg`);
    const urlComVersao = `${pub.publicUrl}?v=${Date.now()}`;
    await supabase.from("alunos").update({ foto_url: urlComVersao }).eq("id", a.id);
    setFotoUrl(urlComVersao);
    recarregar?.();
  };

  const alternarStatus = async () => {
    const novo = status === "ativo" ? "inativo" : "ativo";
    const { error } = await supabase.from("alunos").update({ status: novo }).eq("id", a.id);
    if (!error) { setStatus(novo); recarregar?.(); }
  };

  const apagarAluno = async () => {
    if (!window.confirm(`Apagar ${a.nome}? Isso remove matrícula, anamnese, contrato e cobranças ligadas a ele. Não dá pra desfazer.`)) return;
    const { error } = await supabase.from("alunos").delete().eq("id", a.id);
    if (error) { setAviso(error.message); return; }
    fechar();
    recarregar?.();
  };

  const executarAcao = async (tipo) => {
    if (tipo === "cobranca") { setGerando((v) => !v); return; }
    if (tipo === "editar") { setEditando(true); return; }
    if (tipo === "whatsapp") {
      window.open(`https://wa.me/${a.responsaveis?.telefone}`, "_blank");
      return;
    }
    if (tipo === "contrato-ver") {
      try {
        const { url } = await apiGet(`/api/alunos/${a.id}/contrato`);
        window.open(url, "_blank");
      } catch (e) {
        setAviso(e.message === "sem contrato gerado ainda" ? "Ainda não há contrato gerado pra esse aluno." : e.message);
      }
      return;
    }
    if (tipo === "contrato-gerar") {
      try {
        const { url_publica } = await apiPost("/api/convites", { tipo: "contrato", aluno_id: a.id, enviar: false });
        setLinkContrato(url_publica);
        setAviso(null);
      } catch (e) {
        setAviso(e.message);
      }
      return;
    }
    try {
      await apiPost("/api/convites", { tipo, aluno_id: a.id });
      setAviso("Enviado! A mensagem entrou na fila do WhatsApp.");
    } catch (e) {
      setAviso(e.message);
    }
  };

  const linhas = [
    ["Nascimento", a.nascimento ? `${dataBr(a.nascimento)} · ${idade(a.nascimento)} anos` : "—"],
    ["Categoria", a.categoria || "—"],
    ["Turma", turmaTxt(a.turmas)],
    ["Plano", mat ? <>{mat.planos?.nome} — <Valor>{brl(mat.valor_mensalidade)}</Valor></> : "Sem matrícula ativa"],
    ["Vencimento", mat ? `todo dia ${mat.dia_vencimento}` : "—"],
    ["Bolsista", a.bolsista ? "Sim" : "Não"],
    ["Uniforme", a.tamanho_uniforme || "—"],
    ["Responsável", `${a.responsaveis?.nome ?? "—"} · ${a.responsaveis?.telefone ?? "—"}`],
  ];

  const gerarCobranca = async () => {
    setEnviando(true);
    setResultado(null);
    try {
      const { url } = await apiPost("/api/cobrancas", { aluno_id: a.id, descricao, valor: Number(valor) });
      setResultado({ url });
    } catch (e) {
      setResultado({ erro: e.message });
    } finally {
      setEnviando(false);
    }
  };

  const anamnese = a.anamneses;
  const experimental = a.experimentais?.[0];
  const contrato = a.documentos?.find((d) => d.tipo === "contrato");
  const cobrancasRecentes = [...(a.cobrancas ?? [])]
    .sort((x, y) => new Date(y.vencimento ?? 0) - new Date(x.vencimento ?? 0)).slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      style={{ background: "rgba(14,31,73,.45)" }} onClick={fechar}>
      <div onClick={(e) => e.stopPropagation()}
        className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl sm:p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {role !== "professor" ? (
              <SeletorFoto fotoUrl={fotoUrl} onConfirmar={salvarFoto} cor={NAVY} />
            ) : (
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full" style={{ background: "#E6E9F2" }}>
                {fotoUrl && <img src={fotoUrl} alt="" className="h-full w-full object-cover" />}
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold" style={{ color: NAVY }}>{a.nome}</h3>
              <Tag s={status} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            {role !== "professor" && (
              <>
                <button onClick={() => executarAcao("editar")} aria-label="Editar dados" title="Editar dados"
                  className="rounded-lg p-1.5 hover:opacity-70"><Pencil size={18} style={{ color: NAVY }} /></button>
                <button onClick={() => executarAcao("whatsapp")} aria-label="WhatsApp" title="Abrir WhatsApp"
                  className="rounded-lg p-1.5 hover:opacity-70"><MessageSquare size={18} style={{ color: NAVY }} /></button>
                {["ativo", "inativo"].includes(status) && (
                  <button onClick={alternarStatus} aria-label="Alternar status" title={status === "ativo" ? "Marcar inativo" : "Marcar ativo"}
                    className="rounded-lg p-1.5 hover:opacity-70"><Power size={18} style={{ color: NAVY }} /></button>
                )}
                <button onClick={apagarAluno} aria-label="Apagar aluno" title="Apagar aluno"
                  className="rounded-lg p-1.5 hover:opacity-70"><Trash2 size={18} style={{ color: CLAY }} /></button>
              </>
            )}
            <button onClick={fechar} aria-label="Fechar" className="rounded-lg p-1.5 hover:opacity-70">
              <X size={20} style={{ color: NAVY }} />
            </button>
          </div>
        </div>

        <ChecklistMatricula a={a} mat={mat} />

        {pend.length > 0 && (
          <div className="mb-4 rounded-xl p-3" style={{ background: "#FBE0D5" }}>
            <p className="text-sm font-bold" style={{ color: "#8C3312" }}>Pendências</p>
            <ul className="mt-1 text-sm" style={{ color: "#8C3312" }}>
              {pend.map((p) => <li key={p}>· {p}</li>)}
            </ul>
          </div>
        )}

        {aviso && <p className="mb-3 text-xs font-semibold" style={{ color: NAVY }}>{aviso}</p>}
        {linkContrato && (
          <p className="mb-3 break-all text-xs" style={{ color: "#1F5B2C" }}>
            Link do contrato gerado (não enviado):{" "}
            <a href={linkContrato} target="_blank" rel="noreferrer" className="underline">{linkContrato}</a>
          </p>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-3">
            <CardAcao titulo="Dados">
              <dl className="divide-y" style={{ borderColor: "#E6E9F2" }}>
                {linhas.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-1.5 text-sm">
                    <dt style={{ color: "#5C678A" }}>{k}</dt>
                    <dd className="text-right font-semibold" style={{ color: NAVY }}>{v}</dd>
                  </div>
                ))}
              </dl>
            </CardAcao>

            <CardAcao titulo="Anamnese">
              {!anamnese ? (
                <p className="text-sm" style={{ color: "#5C678A" }}>Ainda não preenchida.</p>
              ) : (
                <dl className="space-y-1.5 text-sm">
                  {[
                    ["Doença pré-existente", anamnese.doenca_preexistente],
                    ["Problema físico", anamnese.problema_fisico],
                    ["Condição neurológica", anamnese.condicao_neurologica],
                    ["Remédio controlado", anamnese.remedio_controlado],
                    ["Plano de saúde", anamnese.plano_saude],
                    ["Cartão SUS", anamnese.cartao_sus],
                    ["Contato de emergência", anamnese.contato_emergencia],
                    ["Autoriza atendimento médico", anamnese.autoriza_medico ? "Sim" : "Não"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <dt style={{ color: "#5C678A" }}>{k}</dt>
                      <dd className="text-right font-semibold" style={{ color: NAVY }}>{v || "—"}</dd>
                    </div>
                  ))}
                  <p className="pt-1 text-xs" style={{ color: "#5C678A" }}>Preenchida em {dataBr(anamnese.preenchida_em)}.</p>
                </dl>
              )}
            </CardAcao>

            {experimental && (
              <CardAcao titulo="Aula experimental">
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-4"><dt style={{ color: "#5C678A" }}>Situação</dt><dd><Tag s={experimental.situacao} /></dd></div>
                  <div className="flex justify-between gap-4">
                    <dt style={{ color: "#5C678A" }}>Data</dt>
                    <dd className="font-semibold" style={{ color: NAVY }}>
                      {experimental.data_aula ? new Date(experimental.data_aula).toLocaleString("pt-BR") : "sem data"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4"><dt style={{ color: "#5C678A" }}>Turma</dt><dd className="font-semibold" style={{ color: NAVY }}>{turmaTxt(experimental.turmas)}</dd></div>
                </dl>
              </CardAcao>
            )}
          </div>

          <div className="space-y-3">
            <CardAcao titulo="Contrato">
              {role !== "professor" && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {ACOES.filter((op) => op.tipo.startsWith("contrato")).map((op) => (
                    <Botao key={op.tipo} tom="ghost" icon={op.icon} onClick={() => executarAcao(op.tipo)}>{op.label}</Botao>
                  ))}
                </div>
              )}
              {contrato?.assinado_em ? (
                <p className="text-xs" style={{ color: "#5C678A" }}>Assinado em {dataBr(contrato.assinado_em)}.</p>
              ) : (
                <p className="text-sm" style={{ color: "#5C678A" }}>Ainda não assinado.</p>
              )}
            </CardAcao>

            {role !== "professor" && (
              <CardAcao titulo="Comunicação">
                <div className="flex flex-wrap gap-2">
                  {ACOES.filter((op) => !op.tipo.startsWith("contrato")).map((op) => (
                    <Botao key={op.tipo} tom="ghost" icon={op.icon} onClick={() => executarAcao(op.tipo)}>{op.label}</Botao>
                  ))}
                </div>
              </CardAcao>
            )}

            <CardAcao titulo="Anotações">
              {role !== "professor" ? (
                <>
                  <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={8}
                    placeholder="Anotações internas sobre o aluno…"
                    className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2", color: NAVY }} />
                  <div className="mt-2">
                    <Botao tom="ghost" onClick={salvarNotas} disabled={salvandoNotas || notas === (a.observacoes ?? "")}>
                      {salvandoNotas ? "Salvando…" : "Salvar"}
                    </Botao>
                  </div>
                </>
              ) : (
                <p className="whitespace-pre-wrap text-sm" style={{ color: NAVY }}>{a.observacoes || "Nenhuma anotação."}</p>
              )}
            </CardAcao>
          </div>
        </div>

        {role !== "professor" && (
          <div className="mt-3">
          <CardAcao titulo="Financeiro">
            <Botao tom="ghost" icon={Wallet} onClick={() => executarAcao("cobranca")}>Gerar Cobrança</Botao>
            {gerando && (
              <div className="mt-3 space-y-2 rounded-xl p-3" style={{ background: SAND }}>
                <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição"
                  className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2" }} />
                <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Valor (R$)" type="number" step="0.01"
                  className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2" }} />
                <Botao tom="navy" onClick={gerarCobranca} disabled={enviando || !valor}>
                  {enviando ? "Gerando…" : "Confirmar cobrança"}
                </Botao>
                {resultado?.url && (
                  <p className="break-all text-xs" style={{ color: "#1F5B2C" }}>
                    Link gerado: <a href={resultado.url} target="_blank" rel="noreferrer" className="underline">{resultado.url}</a>
                  </p>
                )}
                {resultado?.erro && (
                  <p className="text-xs font-semibold" style={{ color: CLAY }}>Erro: {resultado.erro}</p>
                )}
              </div>
            )}
            {cobrancasRecentes.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm">
                {cobrancasRecentes.map((c, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span style={{ color: "#5C678A" }}>{c.descricao} · {dataBr(c.vencimento)}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold" style={{ color: NAVY }}><Valor>{brl(c.valor)}</Valor></span>
                      <Tag s={c.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardAcao>
          </div>
        )}
      </div>

      {editando && (
        <ModalForm titulo="Editar dados do aluno" fechar={() => setEditando(false)}
          campos={[
            { chave: "nome", label: "Nome do aluno", obrigatorio: true, padrao: a.nome },
            { chave: "nascimento", label: "Data de nascimento", tipo: "date", padrao: a.nascimento ?? "" },
            { chave: "categoria", label: "Categoria", padrao: a.categoria ?? "" },
            { chave: "tamanho_uniforme", label: "Tamanho do uniforme", padrao: a.tamanho_uniforme ?? "" },
            {
              chave: "turma_id", label: "Turma", tipo: "select", padrao: a.turmas?.id ?? "",
              opcoes: (turmas ?? []).map((t) => ({ value: t.id, label: `${t.locais?.nome} · ${t.dias} · ${String(t.horario).slice(0, 5)}` })),
            },
            { chave: "bolsista", label: "Bolsista", tipo: "checkbox", padrao: !!a.bolsista },
            {
              chave: "plano_id", label: "Plano", tipo: "select", padrao: mat?.plano_id ?? "",
              opcoes: (planos ?? []).map((p) => ({ value: p.id, label: `${p.nome} — ${brl(p.valor)} (${p.frequencia_semanal}x/semana)` })),
              // preenche o valor da mensalidade sozinho ao trocar o plano — sem isso é fácil
              // esquecer de atualizar o valor e a cobrança sair com R$0 (já aconteceu de verdade)
              aoMudar: (planoId, novosValores) => {
                const plano = (planos ?? []).find((p) => p.id === planoId);
                return plano ? { ...novosValores, valor_mensalidade: String(plano.valor) } : novosValores;
              },
            },
            { chave: "valor_mensalidade", label: "Valor da mensalidade (R$)", tipo: "number", padrao: String(mat?.valor_mensalidade ?? "0") },
            { chave: "dia_vencimento", label: "Dia do vencimento", tipo: "number", padrao: String(mat?.dia_vencimento ?? "15") },
            { chave: "responsavel_nome", label: "Nome do responsável", obrigatorio: true, padrao: a.responsaveis?.nome ?? "" },
            { chave: "responsavel_telefone", label: "Telefone do responsável", obrigatorio: true, padrao: a.responsaveis?.telefone ?? "" },
            { chave: "responsavel_cpf", label: "CPF do responsável", padrao: a.responsaveis?.cpf ?? "" },
            { chave: "responsavel_email", label: "E-mail do responsável", tipo: "email", padrao: a.responsaveis?.email ?? "" },
          ]}
          aoSalvar={async (v) => {
            const { error: e1 } = await supabase.from("alunos").update({
              nome: v.nome, nascimento: v.nascimento || null, categoria: v.categoria || null,
              tamanho_uniforme: v.tamanho_uniforme || null, turma_id: v.turma_id || null, bolsista: v.bolsista,
            }).eq("id", a.id);
            if (e1) throw e1;
            const valorMensalidade = v.valor_mensalidade ? Number(v.valor_mensalidade) : 0;
            if (!v.bolsista && valorMensalidade === 0) {
              const seguir = window.confirm(
                "O valor da mensalidade está R$ 0,00 e o aluno não está marcado como bolsista. " +
                "Isso vai gerar cobranças de R$ 0. Salvar assim mesmo?"
              );
              if (!seguir) throw new Error("Ajuste o valor da mensalidade ou marque como bolsista antes de salvar.");
            }
            const dadosMatricula = {
              plano_id: v.plano_id || null,
              valor_mensalidade: valorMensalidade,
              dia_vencimento: Number(v.dia_vencimento) || 15,
            };
            const { error: e3 } = mat
              ? await supabase.from("matriculas").update(dadosMatricula).eq("id", mat.id)
              : await supabase.from("matriculas").insert({ ...dadosMatricula, aluno_id: a.id, ativa: true });
            if (e3) throw e3;
            if (a.responsaveis?.id) {
              const { error: e2 } = await supabase.from("responsaveis").update({
                nome: v.responsavel_nome, telefone: v.responsavel_telefone,
                cpf: v.responsavel_cpf || null, email: v.responsavel_email || null,
              }).eq("id", a.responsaveis.id);
              if (e2) throw e2;
            }
            recarregar();
            fechar();
          }} />
      )}
    </div>
  );
}

function CardExperimental({ e, recarregar }) {
  const [editando, setEditando] = useState(false);
  const [data, setData] = useState(e.data_aula ? e.data_aula.slice(0, 16) : "");
  const [convertendo, setConvertendo] = useState(false);
  const [aviso, setAviso] = useState(null);

  const salvarData = async () => {
    const { error } = await supabase.from("experimentais").update({ data_aula: data || null }).eq("id", e.id);
    if (!error) { setEditando(false); recarregar(); }
  };

  const converter = async () => {
    setConvertendo(true);
    setAviso(null);
    try {
      await apiPost("/api/convites", { tipo: "processo", experimental_id: e.id });
      setAviso("Link de matrícula enviado! A mensagem já foi pra fila do WhatsApp.");
    } catch (err) {
      setAviso(err.message);
    } finally {
      setConvertendo(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold" style={{ color: NAVY }}>
            {e.aluno_nome}{e.aluno_nascimento ? ` · ${idade(e.aluno_nascimento)} anos` : ""}
          </p>
          {editando ? (
            <div className="mt-1 flex items-center gap-2">
              <input type="datetime-local" value={data} onChange={(ev) => setData(ev.target.value)}
                className="rounded-lg border px-2 py-1 text-xs" style={{ borderColor: "#E6E9F2" }} />
              <button onClick={salvarData} className="text-xs font-bold" style={{ color: "#1F5B2C" }}>Salvar</button>
              <button onClick={() => setEditando(false)} className="text-xs" style={{ color: "#5C678A" }}>Cancelar</button>
            </div>
          ) : (
            <p className="text-xs" style={{ color: "#5C678A" }}>
              {turmaTxt(e.turmas)} · {e.data_aula ? new Date(e.data_aula).toLocaleString("pt-BR") : "sem data"}
              <button onClick={() => setEditando(true)} className="ml-2 align-middle" aria-label="Editar data">
                <Pencil size={12} style={{ color: CLAY, display: "inline" }} />
              </button>
            </p>
          )}
          <p className="text-xs" style={{ color: "#5C678A" }}>{e.responsavel_nome} · {e.telefone}</p>
        </div>
        <Tag s={e.situacao} />
      </div>
      <div className="mt-3">
        <Botao icon={ArrowRight} onClick={converter} disabled={convertendo || !!e.aluno_id}>
          {e.aluno_id ? "Já convertido" : convertendo ? "Enviando…" : "Converter em matrícula"}
        </Botao>
      </div>
      {aviso && <p className="mt-2 text-xs font-semibold" style={{ color: NAVY }}>{aviso}</p>}
    </Card>
  );
}

function Experimentais() {
  const { dados, erro, carregando, recarregar } = useQuery("exp", qExperimentais);
  const { dados: turmas } = useQuery("turmas-ativas", qTurmasAtivas);
  const [criando, setCriando] = useState(false);

  return (
    <div>
      <Titulo acao={<Botao icon={Plus} onClick={() => setCriando(true)}>Nova experimental</Botao>}>Aulas experimentais</Titulo>
      <Estado carregando={carregando} erro={erro} recarregar={recarregar} vazio={(dados ?? []).length === 0}>
        <div className="space-y-2">
          {(dados ?? []).map((e) => <CardExperimental key={e.id} e={e} recarregar={recarregar} />)}
        </div>
      </Estado>

      {criando && (
        <ModalForm titulo="Nova aula experimental" fechar={() => setCriando(false)}
          campos={[
            { chave: "aluno_nome", label: "Nome do aluno", obrigatorio: true },
            { chave: "aluno_nascimento", label: "Data de nascimento", tipo: "date" },
            { chave: "responsavel_nome", label: "Nome do responsável", obrigatorio: true },
            { chave: "telefone", label: "Telefone (WhatsApp)", obrigatorio: true },
            { chave: "email", label: "E-mail", tipo: "email" },
            { chave: "categoria", label: "Categoria" },
            {
              chave: "turma_id", label: "Turma", tipo: "select",
              opcoes: (turmas ?? []).map((t) => ({ value: t.id, label: `${t.locais?.nome} · ${t.dias} · ${String(t.horario).slice(0, 5)}` })),
            },
            { chave: "data_aula", label: "Data da aula", tipo: "datetime-local" },
          ]}
          aoSalvar={async (v) => {
            const { error } = await supabase.from("experimentais").insert({
              aluno_nome: v.aluno_nome, aluno_nascimento: v.aluno_nascimento || null,
              responsavel_nome: v.responsavel_nome, telefone: v.telefone, email: v.email || null,
              categoria: v.categoria || null, turma_id: v.turma_id || null, data_aula: v.data_aula || null,
            });
            if (error) throw error;
            recarregar();
          }} />
      )}
    </div>
  );
}

const STATUS_COBRANCA = ["aberto", "pago", "vencido", "cancelado", "isento"];

function FichaCobranca({ c, fechar, recarregar }) {
  const [descricao, setDescricao] = useState(c.descricao);
  const [valor, setValor] = useState(String(c.valor));
  const [vencimento, setVencimento] = useState(c.vencimento);
  const [status, setStatus] = useState(c.status);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    const acabouDePagar = status === "pago" && c.status !== "pago";
    const { error } = await supabase.from("cobrancas").update({
      descricao, valor: Number(valor), vencimento, status,
      ...(acabouDePagar ? { pago_em: new Date().toISOString().slice(0, 10), metodo: "manual" } : {}),
    }).eq("id", c.id);
    if (error) { setSalvando(false); setErro(error.message); return; }

    if (acabouDePagar) {
      // mesma coisa que o webhook da InfinitePay faria: cancela lembrete de atraso
      // ainda na fila e reativa o aluno, senão ele continua marcado inadimplente
      // pra sempre mesmo já tendo pago (foi exatamente isso que gerou reclamação).
      await supabase.from("mensagens").update({ status: "cancelada" })
        .eq("aluno_id", c.aluno_id).eq("status", "na_fila").like("tipo", "inadimplencia%");
      await supabase.from("alunos").update({ status: "ativo" })
        .eq("id", c.aluno_id).eq("status", "inadimplente");
    }

    setSalvando(false);
    recarregar();
    fechar();
  };

  const apagar = async () => {
    if (!window.confirm(`Apagar a cobrança "${c.descricao}"? Essa ação não pode ser desfeita.`)) return;
    setSalvando(true);
    const { error } = await supabase.from("cobrancas").delete().eq("id", c.id);
    setSalvando(false);
    if (error) { setErro(error.message); return; }
    recarregar();
    fechar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      style={{ background: "rgba(14,31,73,.45)" }} onClick={fechar}>
      <div onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold" style={{ color: NAVY }}>{c.alunos?.nome}</h3>
            <p className="text-xs" style={{ color: "#5C678A" }}>
              Responsável: {c.alunos?.responsaveis?.nome ?? "—"}{c.alunos?.responsaveis?.telefone ? ` · ${c.alunos.responsaveis.telefone}` : ""}
            </p>
          </div>
          <button onClick={fechar} aria-label="Fechar"><X size={20} style={{ color: NAVY }} /></button>
        </div>

        <div className="space-y-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>Descrição</span>
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2" }} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>Valor (R$)</span>
            <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2" }} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>Vencimento</span>
            <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2" }} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2" }}>
              {STATUS_COBRANCA.map((s) => <option key={s} value={s}>{STATUS[s]?.txt ?? s}</option>)}
            </select>
          </label>

          {c.link_pagamento && (
            <p className="text-xs" style={{ color: "#7A5A00" }}>
              ⚠️ Já existe um link de pagamento gerado — mudar o valor aqui não atualiza o link.
            </p>
          )}
          {erro && <p className="text-xs font-semibold" style={{ color: CLAY }}>{erro}</p>}

          <div className="flex gap-2 pt-2">
            <Botao tom="navy" onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</Botao>
            <Botao tom="ghost" onClick={apagar} disabled={salvando}>Apagar</Botao>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardInadimplente({ a }) {
  const cobrancaAberta = a.cobrancas?.find((c) => ["aberto", "vencido"].includes(c.status));
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const enviarCobranca = async () => {
    setEnviando(true);
    setAviso(null);
    try {
      if (!a.responsaveis?.telefone) throw new Error("Responsável sem telefone cadastrado");
      const texto = `Oi, ${a.responsaveis.nome}! A mensalidade do(a) ${a.nome} está em atraso.` +
        (cobrancaAberta?.link_pagamento ? ` Pode regularizar por aqui:\n${cobrancaAberta.link_pagamento}` : " Vamos regularizar?");
      const { error } = await supabase.from("mensagens").insert({
        telefone: a.responsaveis.telefone, direcao: "saida", tipo: "cobranca_manual",
        corpo: texto, status: "na_fila", agendada_para: new Date().toISOString(),
      });
      if (error) throw error;
      setAviso("Enviado pra fila!");
    } catch (e) {
      setAviso(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl p-2" style={{ background: SAND }}>
      <div className="min-w-0">
        <p className="truncate font-semibold" style={{ color: NAVY }}>{a.nome}</p>
        <p className="truncate text-xs" style={{ color: "#5C678A" }}>
          Responsável: {a.responsaveis?.nome ?? "—"}{a.responsaveis?.telefone ? ` · ${a.responsaveis.telefone}` : ""}
        </p>
        <p className="truncate text-xs" style={{ color: "#5C678A" }}>
          {cobrancaAberta ? `${cobrancaAberta.descricao} · venceu ${dataBr(cobrancaAberta.vencimento)}` : "sem cobrança em aberto"}
        </p>
        {aviso && <p className="text-xs font-semibold" style={{ color: "#1F5B2C" }}>{aviso}</p>}
      </div>
      <Botao tom="ghost" icon={Send} onClick={enviarCobranca} disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar Cobrança"}
      </Botao>
    </li>
  );
}

function Financeiro() {
  const { role } = usePerfil();
  const { dados, erro, carregando, recarregar } = useQuery("cob", qCobrancas);
  const inadimplentes = useQuery("inadimplentes", qInadimplentes);
  const [conta, setConta] = useState("Todas");
  const [status, setStatus] = useState("Todos");
  const [venceDe, setVenceDe] = useState("");
  const [venceAte, setVenceAte] = useState("");
  const [aberta, setAberta] = useState(null);

  const lista = (dados ?? []).filter((c) =>
    (conta === "Todas" || c.locais?.nome === conta) &&
    (status === "Todos" || c.status === status) &&
    (!venceDe || c.vencimento >= venceDe) &&
    (!venceAte || c.vencimento <= venceAte)
  );
  const recebido = lista.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0);
  const emAberto = lista.filter((c) => ["aberto", "vencido"].includes(c.status)).reduce((s, c) => s + Number(c.valor), 0);

  return (
    <div>
      <Titulo>Financeiro</Titulo>
      <div className="mb-2 flex flex-wrap gap-2">
        {["Todas", ...UNIDADES].map((c) => (
          <button key={c} onClick={() => setConta(c)} className="rounded-xl px-3 py-2 text-sm font-semibold"
            style={conta === c ? { background: NAVY, color: "#fff" } : { background: "#fff", color: NAVY }}>
            {c === "Todas" ? "Todas as contas" : c}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2", color: NAVY }}>
          <option value="Todos">Todos os status</option>
          {STATUS_COBRANCA.map((s) => <option key={s} value={s}>{STATUS[s]?.txt ?? s}</option>)}
        </select>
        <span className="text-xs" style={{ color: "#7A85A3" }}>Vencimento</span>
        <input type="date" value={venceDe} onChange={(e) => setVenceDe(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2", color: NAVY }} />
        <span className="text-xs" style={{ color: "#7A85A3" }}>até</span>
        <input type="date" value={venceAte} onChange={(e) => setVenceAte(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2", color: NAVY }} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card><p className="text-xs uppercase" style={{ color: "#7A85A3" }}>Recebido</p>
          <p className="mt-1 text-xl font-bold" style={{ color: NAVY }}><Valor>{brl(recebido)}</Valor></p></Card>
        <Card><p className="text-xs uppercase" style={{ color: "#7A85A3" }}>A receber</p>
          <p className="mt-1 text-xl font-bold" style={{ color: CLAY }}><Valor>{brl(emAberto)}</Valor></p></Card>
      </div>

      {role !== "professor" && (
        <Card className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold" style={{ color: NAVY }}>Inadimplentes</h3>
            <AlertCircle size={18} style={{ color: CLAY }} />
          </div>
          {(inadimplentes.dados ?? []).length === 0 ? (
            <p className="text-sm" style={{ color: "#5C678A" }}>Nenhum aluno inadimplente. Tudo em dia.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {inadimplentes.dados.map((a) => <CardInadimplente key={a.id} a={a} />)}
            </ul>
          )}
        </Card>
      )}

      <Estado carregando={carregando} erro={erro} recarregar={recarregar} vazio={lista.length === 0}>
        <div className="space-y-2">
          {lista.map((c) => (
            <Card key={c.id} className="cursor-pointer" onClick={() => setAberta(c)}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold" style={{ color: NAVY }}>{c.alunos?.nome}</p>
                  <p className="text-xs" style={{ color: "#5C678A" }}>
                    Responsável: {c.alunos?.responsaveis?.nome ?? "—"}{c.alunos?.responsaveis?.telefone ? ` · ${c.alunos.responsaveis.telefone}` : ""}
                  </p>
                  <p className="text-xs" style={{ color: "#5C678A" }}>{c.descricao} · vence {dataBr(c.vencimento)} · {c.locais?.nome}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold" style={{ color: NAVY }}><Valor>{brl(c.valor)}</Valor></p>
                  <Tag s={c.status} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Estado>

      {aberta && <FichaCobranca c={aberta} fechar={() => setAberta(null)} recarregar={recarregar} />}
    </div>
  );
}

const CAMPOS_PROFESSOR = (padrao = {}) => [
  { chave: "nome", label: "Nome completo", obrigatorio: true, padrao: padrao.nome },
  { chave: "telefone", label: "Telefone", obrigatorio: true, padrao: padrao.telefone },
  { chave: "endereco", label: "Endereço", padrao: padrao.endereco },
  { chave: "cref", label: "CREF", padrao: padrao.cref },
  { chave: "nascimento", label: "Data de nascimento", tipo: "date", padrao: padrao.nascimento ?? "" },
  { chave: "valor_hora_aula", label: "Valor por aula (R$)", tipo: "number", padrao: String(padrao.valor_hora_aula ?? "0") },
  { chave: "pix", label: "Chave Pix", padrao: padrao.pix },
  { chave: "estagiario", label: "É estagiário(a)", tipo: "checkbox", padrao: !!padrao.estagiario },
  { chave: "faculdade", label: "Faculdade", padrao: padrao.faculdade },
  { chave: "estagio_inicio", label: "Início do estágio obrigatório", tipo: "date", padrao: padrao.estagio_inicio ?? "" },
  { chave: "estagio_fim", label: "Fim do estágio obrigatório", tipo: "date", padrao: padrao.estagio_fim ?? "" },
  { chave: "observacoes", label: "Observações", tipo: "textarea", padrao: padrao.observacoes },
];

function valoresParaProfessor(v) {
  return {
    nome: v.nome, telefone: v.telefone, endereco: v.endereco || null, cref: v.cref || null,
    nascimento: v.nascimento || null, valor_hora_aula: v.valor_hora_aula ? Number(v.valor_hora_aula) : 0,
    pix: v.pix || null,
    estagiario: !!v.estagiario, faculdade: v.faculdade || null,
    estagio_inicio: v.estagio_inicio || null, estagio_fim: v.estagio_fim || null,
    observacoes: v.observacoes || null,
  };
}

function GerarAcessoProfessor({ p, fechar }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  const gerar = async () => {
    setEnviando(true);
    setErro(null);
    try {
      await apiPost(`/api/professores/${p.id}/acesso`, { email, senha });
      setResultado(`Acesso ${p.user_id ? "atualizado" : "criado"}! Passa esse e-mail e senha pro professor — o acesso é restrito (sem financeiro).`);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(14,31,73,.45)" }} onClick={(e) => { e.stopPropagation(); fechar(); }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl bg-white p-5">
        <h3 className="mb-1 text-lg font-bold" style={{ color: NAVY }}>
          {p.user_id ? "Redefinir acesso" : "Gerar acesso"} — {p.nome}
        </h3>
        <p className="mb-3 text-xs" style={{ color: "#5C678A" }}>
          Login restrito: só enxerga Alunos, Experimental, Eventos, Painel (sem financeiro) e o próprio cadastro.
        </p>
        <div className="space-y-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2" }} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>Senha</span>
            <input type="text" value={senha} onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2" }} />
          </label>
          {erro && <p className="text-xs font-semibold" style={{ color: CLAY }}>{erro}</p>}
          {resultado && <p className="text-xs font-semibold" style={{ color: "#1F5B2C" }}>{resultado}</p>}
          <div className="flex gap-2 pt-2">
            <Botao tom="navy" onClick={gerar} disabled={enviando || !email || senha.length < 6}>
              {enviando ? "Gerando…" : "Gerar acesso"}
            </Botao>
            <Botao tom="ghost" onClick={fechar}>Fechar</Botao>
          </div>
        </div>
      </div>
    </div>
  );
}

function Professores() {
  const { role } = usePerfil();
  const { dados, erro, carregando, recarregar } = useQuery("prof", qProfessores);
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [gerandoAcesso, setGerandoAcesso] = useState(null);

  const apagar = async (p) => {
    if (!window.confirm(`Apagar o professor ${p.nome}? Isso também remove o login dele, se houver.`)) return;
    try {
      await apiAuth("DELETE", `/api/professores/${p.id}`);
      recarregar();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div>
      <Titulo acao={role !== "professor" && <Botao icon={Plus} onClick={() => setCriando(true)}>Novo professor</Botao>}>Professores</Titulo>
      <Estado carregando={carregando} erro={erro} recarregar={recarregar} vazio={(dados ?? []).length === 0}>
        <div className="space-y-2">
          {(dados ?? []).map((p) => (
            <Card key={p.id}>
              <div className="flex items-center justify-between gap-2">
                <div className={role !== "professor" ? "cursor-pointer" : ""} onClick={() => role !== "professor" && setEditando(p)}>
                  <p className="font-semibold" style={{ color: NAVY }}>{p.nome}{p.estagiario ? " · Estagiário(a)" : ""}</p>
                  <p className="text-xs" style={{ color: "#5C678A" }}>
                    {p.cref ? `CREF ${p.cref} · ` : ""}{p.telefone} · <Valor>{brl(p.valor_hora_aula)}</Valor>/aula
                    {p.user_id ? " · tem acesso ao app" : ""}
                  </p>
                </div>
                {role !== "professor" && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => setGerandoAcesso(p)} aria-label="Gerar acesso" title="Gerar acesso">
                      <KeyRound size={16} style={{ color: "#7A85A3" }} />
                    </button>
                    <button onClick={() => setEditando(p)} aria-label="Editar" title="Editar">
                      <Pencil size={14} style={{ color: "#7A85A3" }} />
                    </button>
                    <button onClick={() => apagar(p)} aria-label="Apagar" title="Apagar">
                      <Trash2 size={14} style={{ color: CLAY }} />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </Estado>

      {criando && (
        <ModalForm titulo="Novo professor" fechar={() => setCriando(false)}
          campos={CAMPOS_PROFESSOR()}
          aoSalvar={async (v) => {
            const { error } = await supabase.from("professores").insert(valoresParaProfessor(v));
            if (error) throw error;
            recarregar();
          }} />
      )}

      {editando && (
        <ModalForm titulo="Editar professor" fechar={() => setEditando(null)}
          campos={CAMPOS_PROFESSOR(editando)}
          aoSalvar={async (v) => {
            const { error } = await supabase.from("professores").update(valoresParaProfessor(v)).eq("id", editando.id);
            if (error) throw error;
            recarregar();
          }} />
      )}

      {gerandoAcesso && <GerarAcessoProfessor p={gerandoAcesso} fechar={() => { setGerandoAcesso(null); recarregar(); }} />}
    </div>
  );
}

const CAMPOS_EVENTO = (padrao = {}, locais = []) => [
  { chave: "nome", label: "Nome do evento", obrigatorio: true, padrao: padrao.nome },
  { chave: "data", label: "Data e hora", tipo: "datetime-local", obrigatorio: true, padrao: padrao.data ? padrao.data.slice(0, 16) : "" },
  {
    chave: "local_id", label: "Local", tipo: "select", padrao: padrao.local_id ?? "",
    opcoes: locais.map((l) => ({ value: l.id, label: l.nome })),
  },
  { chave: "valor", label: "Valor (R$) — deixe em branco se for gratuito", tipo: "number", padrao: padrao.valor ?? "" },
  { chave: "descricao", label: "Descrição", tipo: "textarea", padrao: padrao.descricao },
];

function CardEvento({ e, recarregar, locais }) {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(null);
  const [link, setLink] = useState(e.link_pagamento);
  const [divulgando, setDivulgando] = useState(false);
  const [editando, setEditando] = useState(false);

  const gerarLink = async () => {
    setGerando(true);
    setErro(null);
    try {
      const { url } = await apiPost(`/api/eventos/${e.id}/link`, {});
      setLink(url);
      recarregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setGerando(false);
    }
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold" style={{ color: NAVY }}>{e.nome}</p>
          <p className="text-xs" style={{ color: "#5C678A" }}>{dataBr(e.data)} · {e.locais?.nome ?? "—"}</p>
        </div>
        {e.valor > 0 && <p className="font-bold" style={{ color: NAVY }}><Valor>{brl(e.valor)}</Valor></p>}
      </div>

      {e.valor > 0 && (
        <div className="mt-3">
          {link ? (
            <p className="break-all text-xs" style={{ color: "#1F5B2C" }}>
              <a href={link} target="_blank" rel="noreferrer" className="underline">{link}</a>
            </p>
          ) : (
            <Botao tom="ghost" icon={Wallet} onClick={gerarLink} disabled={gerando}>
              {gerando ? "Gerando…" : "Gerar link de pagamento"}
            </Botao>
          )}
          {erro && <p className="mt-1 text-xs font-semibold" style={{ color: CLAY }}>{erro}</p>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Botao tom="ghost" icon={MessageSquare} onClick={() => setDivulgando(true)}>Divulgar</Botao>
        <Botao tom="ghost" icon={Pencil} onClick={() => setEditando(true)}>Editar</Botao>
      </div>

      {divulgando && <DivulgarEvento evento={{ ...e, link_pagamento: link }} fechar={() => setDivulgando(false)} />}

      {editando && (
        <ModalForm titulo="Editar evento" fechar={() => setEditando(false)}
          campos={CAMPOS_EVENTO(e, locais ?? [])}
          aoSalvar={async (v) => {
            const { error } = await supabase.from("eventos").update({
              nome: v.nome, data: v.data, local_id: v.local_id || null, descricao: v.descricao || null,
              valor: v.valor ? Number(v.valor) : null,
            }).eq("id", e.id);
            if (error) throw error;
            recarregar();
          }} />
      )}
    </Card>
  );
}

const DESTINATARIOS_OPCOES = [
  { chave: "ativos", label: "Alunos ativos" },
  { chave: "todos", label: "Todos os alunos (ativos e inativos)" },
  { chave: "conversas", label: "Contatos do WhatsApp (Conversas)" },
];

async function buscarTelefonesDestinatarios(chave) {
  if (chave === "conversas") {
    const { data } = await supabase.from("conversas").select("telefone");
    return [...new Set((data ?? []).map((c) => c.telefone).filter(Boolean))];
  }
  let query = supabase.from("alunos").select("responsaveis(telefone)");
  if (chave === "ativos") query = query.eq("status", "ativo");
  const { data } = await query;
  return [...new Set((data ?? []).map((a) => a.responsaveis?.telefone).filter(Boolean))];
}

function DivulgarEvento({ evento, fechar }) {
  const [destinatarios, setDestinatarios] = useState("ativos");
  const [texto, setTexto] = useState(
    `📣 ${evento.nome}!\n\n${dataBr(evento.data)} · ${evento.locais?.nome ?? ""}\n\n` +
    (evento.valor > 0 ? "Garanta sua vaga:\n{{link_pagamento}}" : "")
  );
  const [arquivo, setArquivo] = useState(null);
  const [contagem, setContagem] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    setContagem(null);
    buscarTelefonesDestinatarios(destinatarios).then((tels) => setContagem(tels.length));
    // eslint-disable-next-line
  }, [destinatarios]);

  const enviar = async () => {
    setEnviando(true);
    setErro(null);
    setResultado(null);
    try {
      let midiaUrl = null;
      if (arquivo) {
        const caminho = `${evento.id}/${Date.now()}-${arquivo.name}`;
        const { error: erroUpload } = await supabase.storage.from("eventos").upload(caminho, arquivo);
        if (erroUpload) throw erroUpload;
        const { data } = supabase.storage.from("eventos").getPublicUrl(caminho);
        midiaUrl = data.publicUrl;
      }

      const telefones = await buscarTelefonesDestinatarios(destinatarios);
      const corpo = texto.replaceAll("{{link_pagamento}}", evento.link_pagamento ?? "");
      const agora = new Date().toISOString();
      const linhas = telefones.map((telefone) => ({
        telefone, tipo: "divulgacao_evento", direcao: "saida", status: "na_fila",
        corpo, midia_url: midiaUrl, agendada_para: agora,
      }));
      if (linhas.length) {
        const { error } = await supabase.from("mensagens").insert(linhas);
        if (error) throw error;
      }
      setResultado(`Enviado pra fila! ${linhas.length} contato(s).`);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      style={{ background: "rgba(14,31,73,.45)" }} onClick={(e) => { e.stopPropagation(); fechar(); }}>
      <div onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-bold" style={{ color: NAVY }}>Divulgar: {evento.nome}</h3>
          <button onClick={fechar} aria-label="Fechar"><X size={20} style={{ color: NAVY }} /></button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>
              Texto da divulgação {evento.link_pagamento && "— use {{link_pagamento}} pra incluir o link de pagamento"}
            </span>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)}
              className="min-h-32 w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2" }} />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>Imagem ou arquivo (opcional)</span>
            <input type="file" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2" }} />
          </label>

          <div className="space-y-1.5">
            <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>Enviar para</span>
            {DESTINATARIOS_OPCOES.map((o) => (
              <label key={o.chave} className="flex items-center gap-2 text-sm">
                <input type="radio" name="destinatarios" checked={destinatarios === o.chave} onChange={() => setDestinatarios(o.chave)} />
                {o.label}
              </label>
            ))}
            <p className="text-xs" style={{ color: "#5C678A" }}>
              {contagem === null ? "Contando…" : `${contagem} contato(s) vão receber.`}
            </p>
          </div>

          {erro && <p className="text-xs font-semibold" style={{ color: CLAY }}>{erro}</p>}
          {resultado && <p className="text-xs font-semibold" style={{ color: "#1F5B2C" }}>{resultado}</p>}

          <Botao tom="navy" onClick={enviar} disabled={enviando || !contagem}>
            {enviando ? "Enviando…" : "Enviar divulgação"}
          </Botao>
        </div>
      </div>
    </div>
  );
}

function Eventos() {
  const { dados, erro, carregando, recarregar } = useQuery("ev", qEventos);
  const { dados: locais } = useQuery("locais-ativos", qLocaisAtivos);
  const [criando, setCriando] = useState(false);

  return (
    <div>
      <Titulo acao={<Botao icon={Plus} onClick={() => setCriando(true)}>Novo evento</Botao>}>Eventos</Titulo>
      <Estado carregando={carregando} erro={erro} recarregar={recarregar} vazio={(dados ?? []).length === 0}>
        <div className="space-y-2">
          {(dados ?? []).map((e) => <CardEvento key={e.id} e={e} recarregar={recarregar} locais={locais} />)}
        </div>
      </Estado>

      {criando && (
        <ModalForm titulo="Novo evento" fechar={() => setCriando(false)}
          campos={CAMPOS_EVENTO({}, locais ?? [])}
          aoSalvar={async (v) => {
            const { error } = await supabase.from("eventos").insert({
              nome: v.nome, data: v.data, local_id: v.local_id || null, descricao: v.descricao || null,
              valor: v.valor ? Number(v.valor) : null,
            });
            if (error) throw error;
            recarregar();
          }} />
      )}
    </div>
  );
}

function ModalForm({ titulo, campos, aoSalvar, fechar }) {
  const [valores, setValores] = useState(() => Object.fromEntries(campos.map((c) => [c.chave, c.padrao ?? (c.tipo === "checkbox" ? false : "")])));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const set = (c) => (e) => setValores((v) => {
    const novos = { ...v, [c.chave]: e.target.value };
    return c.aoMudar ? c.aoMudar(e.target.value, novos) : novos;
  });
  const setChecked = (chave) => (e) => setValores((v) => ({ ...v, [chave]: e.target.checked }));

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await aoSalvar(valores);
      fechar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      style={{ background: "rgba(14,31,73,.45)" }} onClick={(e) => { e.stopPropagation(); fechar(); }}>
      <div onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-bold" style={{ color: NAVY }}>{titulo}</h3>
          <button onClick={fechar} aria-label="Fechar"><X size={20} style={{ color: NAVY }} /></button>
        </div>
        <form onSubmit={salvar} className="space-y-3">
          {campos.map((c) => (
            c.tipo === "checkbox" ? (
              <label key={c.chave} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!valores[c.chave]} onChange={setChecked(c.chave)} />
                <span style={{ color: NAVY }}>{c.label}</span>
              </label>
            ) : (
            <label key={c.chave} className="block">
              <span className="mb-1 block text-xs font-semibold" style={{ color: "#5C678A" }}>
                {c.label}{c.obrigatorio && " *"}
              </span>
              {c.tipo === "select" ? (
                <select required={c.obrigatorio} value={valores[c.chave]} onChange={set(c)}
                  className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2" }}>
                  <option value="">Selecione</option>
                  {c.opcoes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : c.tipo === "textarea" ? (
                <textarea value={valores[c.chave]} onChange={set(c)} required={c.obrigatorio}
                  className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2" }} />
              ) : (
                <input required={c.obrigatorio} type={c.tipo ?? "text"} step={c.tipo === "number" ? "0.01" : undefined}
                  value={valores[c.chave]} onChange={set(c)}
                  className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2" }} />
              )}
            </label>
            )
          ))}
          {erro && <p className="text-xs font-semibold" style={{ color: CLAY }}>{erro}</p>}
          <div className="flex gap-2 pt-2">
            <Botao tom="navy" type="submit" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</Botao>
            <Botao tom="ghost" type="button" onClick={fechar}>Cancelar</Botao>
          </div>
        </form>
      </div>
    </div>
  );
}

function ThreadConversa({ telefone, contato, nomeConversa, oportunidade, emAtendimentoHumano, recarregarLista }) {
  const { dados, carregando, recarregar } = useQuery("thread-" + telefone, () => qThread(telefone), [telefone]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviandoTipo, setEnviandoTipo] = useState(null); // "experimental" | "processo" | null
  const [marcandoOportunidade, setMarcandoOportunidade] = useState(false);
  const [retomando, setRetomando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const enviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    const { error } = await supabase.from("mensagens").insert({
      telefone, direcao: "saida", tipo: "manual", corpo: texto, status: "na_fila", agendada_para: new Date().toISOString(),
    });
    setEnviando(false);
    if (!error) { setTexto(""); recarregar(); }
  };

  const disparar = async (tipo) => {
    setEnviandoTipo(tipo);
    setAviso(null);
    try {
      await enviarLinkConvite(tipo, telefone, nomeConversa);
      recarregar();
    } catch (e) {
      setAviso(e.message);
    } finally {
      setEnviandoTipo(null);
    }
  };

  const alternarOportunidade = async () => {
    setMarcandoOportunidade(true);
    const { error } = await supabase.from("conversas").update({ oportunidade: !oportunidade }).eq("telefone", telefone);
    setMarcandoOportunidade(false);
    if (!error) recarregarLista?.();
  };

  const retomarAutomatico = async () => {
    setRetomando(true);
    const { error } = await supabase.from("conversas").update({ em_atendimento_humano: false }).eq("telefone", telefone);
    setRetomando(false);
    if (!error) recarregarLista?.();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-3" style={{ borderColor: "#E6E9F2" }}>
        <div>
          <p className="font-bold" style={{ color: NAVY }}>{contato?.nome ?? "Contato sem cadastro"}</p>
          <p className="text-xs" style={{ color: "#5C678A" }}>{telefone}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {emAtendimentoHumano && (
            <Botao tom="ghost" icon={Power} onClick={retomarAutomatico} disabled={retomando}>
              {retomando ? "Retomando…" : "Retomar automático"}
            </Botao>
          )}
          {!contato && (
            <Botao tom={oportunidade ? "navy" : "ghost"} icon={Star} onClick={alternarOportunidade} disabled={marcandoOportunidade}>
              {oportunidade ? "É Oportunidade" : "Oportunidade"}
            </Botao>
          )}
          <Botao tom="ghost" icon={ClipboardList} onClick={() => disparar("experimental")} disabled={enviandoTipo === "experimental"}>
            {enviandoTipo === "experimental" ? "Enviando…" : "Aula Experimental"}
          </Botao>
          {!contato && (
            <Botao tom="ghost" icon={ArrowRight} onClick={() => disparar("processo")} disabled={enviandoTipo === "processo"}>
              {enviandoTipo === "processo" ? "Enviando…" : "Matrícula"}
            </Botao>
          )}
        </div>
      </div>

      {aviso && <p className="mb-2 text-xs font-semibold" style={{ color: NAVY }}>{aviso}</p>}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {carregando && <p className="text-sm" style={{ color: "#5C678A" }}>Carregando…</p>}
        {(dados ?? []).map((m) => (
          <div key={m.id} className={`flex ${m.direcao === "entrada" ? "justify-start" : "justify-end"}`}>
            <div className="min-w-0 max-w-[75%] rounded-2xl px-3 py-2 text-sm"
              style={m.direcao === "entrada" ? { background: SAND, color: NAVY } : { background: NAVY, color: "#fff" }}>
              <p className="whitespace-pre-wrap break-words">{m.corpo}</p>
              <p className="mt-1 text-[10px] opacity-70">
                {new Date(m.criado_em).toLocaleString("pt-BR")} {m.direcao === "saida" && `· ${STATUS[m.status]?.txt ?? m.status}`}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2 border-t pt-3" style={{ borderColor: "#E6E9F2" }}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
          placeholder="Digite uma mensagem…"
          className="flex-1 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E6E9F2" }} />
        <Botao tom="navy" onClick={enviar} disabled={enviando || !texto.trim()}>Enviar</Botao>
      </div>
    </div>
  );
}

function CardOportunidade({ o, ir }) {
  const [enviandoTipo, setEnviandoTipo] = useState(null);
  const [aviso, setAviso] = useState(null);

  const disparar = async (e, tipo) => {
    e.stopPropagation();
    setEnviandoTipo(tipo);
    setAviso(null);
    try {
      await enviarLinkConvite(tipo, o.telefone, o.nome);
    } catch (err) {
      setAviso(err.message);
    } finally {
      setEnviandoTipo(null);
    }
  };

  return (
    <Card className="cursor-pointer" onClick={() => ir("mensagens", o.telefone)}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold" style={{ color: NAVY }}>{o.nome ?? o.telefone}</p>
          <p className="truncate text-xs" style={{ color: "#5C678A" }}>{o.telefone}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Botao tom="ghost" icon={ClipboardList} onClick={(e) => disparar(e, "experimental")} disabled={enviandoTipo === "experimental"}>
            Experimental
          </Botao>
          <Botao tom="ghost" icon={ArrowRight} onClick={(e) => disparar(e, "processo")} disabled={enviandoTipo === "processo"}>
            Matrícula
          </Botao>
        </div>
      </div>
      {aviso && <p className="mt-2 text-xs font-semibold" style={{ color: CLAY }}>{aviso}</p>}
    </Card>
  );
}

function Oportunidades({ ir }) {
  const { dados, erro, carregando, recarregar } = useQuery("oportunidades", qOportunidades);

  return (
    <div>
      <Titulo acao={<Botao tom="ghost" icon={RefreshCw} onClick={recarregar}>Atualizar</Botao>}>Oportunidades</Titulo>
      <p className="mb-4 text-sm" style={{ color: "#5C678A" }}>
        Contatos do WhatsApp marcados como Oportunidade em Conversas. Clique pra abrir a conversa.
      </p>
      <Estado carregando={carregando} erro={erro} recarregar={recarregar} vazio={(dados ?? []).length === 0}>
        <div className="space-y-2">
          {(dados ?? []).map((o) => <CardOportunidade key={o.telefone} o={o} ir={ir} />)}
        </div>
      </Estado>
    </div>
  );
}

function Conversas({ ir, telefoneAlvo }) {
  const { dados, erro, carregando, recarregar } = useQuery("conversas", qConversas);
  const { dados: responsaveis } = useQuery("resp-tel", qResponsaveisPorTelefone);
  const [selecionado, setSelecionado] = useState(null);
  const [busca, setBusca] = useState("");
  const [somenteAlunos, setSomenteAlunos] = useState(false);

  useEffect(() => { if (telefoneAlvo) setSelecionado(telefoneAlvo); }, [telefoneAlvo]);

  const contatoDe = (telefone) => {
    const r = responsaveis?.find((x) => x.telefone === telefone);
    if (!r) return null;
    const alunosNomes = r.alunos?.map((a) => a.nome).join(", ");
    return { nome: `${r.nome}${alunosNomes ? ` · ${alunosNomes}` : ""}`, alunosNomes, responsavelNome: r.nome };
  };

  const buscaNorm = busca.trim().toLowerCase();
  const listaFiltrada = (dados ?? []).filter((c) => {
    const contato = contatoDe(c.telefone);
    if (somenteAlunos && !contato) return false;
    if (!buscaNorm) return true;
    const alvo = `${c.telefone} ${c.nome ?? ""} ${contato?.responsavelNome ?? ""} ${contato?.alunosNomes ?? ""}`.toLowerCase();
    return alvo.includes(buscaNorm);
  });

  return (
    <div>
      <Titulo acao={<Botao tom="ghost" icon={RefreshCw} onClick={recarregar}>Atualizar</Botao>}>Conversas</Titulo>
      <BolinhaStatusWhatsApp />
      <p className="mb-4 text-sm" style={{ color: "#5C678A" }}>
        Mensagens do WhatsApp. O envio automático não roda entre 21h e 8h.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-3 py-2">
          <Search size={16} style={{ color: "#7A85A3" }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por telefone, aluno ou responsável"
            className="w-full bg-transparent text-sm outline-none" style={{ color: NAVY }} />
        </div>
        <button onClick={() => setSomenteAlunos((v) => !v)} className="rounded-xl px-3 py-2 text-sm font-semibold"
          style={somenteAlunos ? { background: NAVY, color: "#fff" } : { background: "#fff", color: NAVY }}>
          Alunos
        </button>
      </div>

      <div className="flex flex-col gap-4 lg:h-[70vh] lg:flex-row lg:items-stretch">
        <div className={`lg:w-72 lg:shrink-0 ${selecionado ? "hidden lg:block" : ""}`}>
          <Estado carregando={carregando} erro={erro} recarregar={recarregar} vazio={listaFiltrada.length === 0}>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1 lg:h-full lg:max-h-none">
              {listaFiltrada.map((c) => {
                const contato = contatoDe(c.telefone);
                return (
                  <Card key={c.telefone} className="cursor-pointer" onClick={() => setSelecionado(c.telefone)}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold" style={{ color: NAVY }}>{contato?.nome ?? c.nome ?? c.telefone}</p>
                        <p className="truncate text-xs" style={{ color: "#5C678A" }}>
                          {c.ultima_resposta ? new Date(c.ultima_resposta).toLocaleString("pt-BR") : "sem mensagens"}
                        </p>
                      </div>
                      {c.em_atendimento_humano && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CLAY }} />}
                    </div>
                  </Card>
                );
              })}
            </div>
          </Estado>
        </div>

        <div className={`min-w-0 flex-1 ${selecionado ? "" : "hidden lg:block"}`} style={{ minHeight: 420 }}>
          {selecionado ? (
            <Card className="flex h-full max-h-[70vh] flex-col">
              <button onClick={() => setSelecionado(null)} className="mb-2 shrink-0 text-xs font-bold lg:hidden" style={{ color: CLAY }}>
                ← Voltar
              </button>
              <ThreadConversa
                telefone={selecionado}
                contato={contatoDe(selecionado)}
                nomeConversa={dados?.find((d) => d.telefone === selecionado)?.nome}
                oportunidade={dados?.find((d) => d.telefone === selecionado)?.oportunidade}
                emAtendimentoHumano={dados?.find((d) => d.telefone === selecionado)?.em_atendimento_humano}
                ir={ir} recarregarLista={recarregar}
              />
            </Card>
          ) : (
            <Card><p className="text-sm" style={{ color: "#5C678A" }}>Selecione uma conversa.</p></Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ shell ------------------------------ */
const NAV = [
  { id: "painel", label: "Painel", icon: LayoutDashboard, C: Painel },
  { id: "alunos", label: "Alunos", icon: Users, C: Alunos },
  { id: "experimentais", label: "Experimental", icon: ClipboardList, C: Experimentais },
  { id: "financeiro", label: "Financeiro", icon: Wallet, C: Financeiro },
  { id: "professores", label: "Professores", icon: Award, C: Professores },
  { id: "eventos", label: "Eventos", icon: CalendarDays, C: Eventos },
  { id: "oportunidades", label: "Oportunidades", icon: Star, C: Oportunidades },
  { id: "mensagens", label: "Conversas", icon: MessageSquare, C: Conversas },
];

const NAV_PROFESSOR = ["painel", "alunos", "experimentais", "professores", "eventos"];

export default function App({ sessao }) {
  const [tela, setTela] = useState("painel");
  const [telefoneAlvo, setTelefoneAlvo] = useState(null);
  const [ocultar, setOcultar] = useState(() => localStorage.getItem("ocultar_valores") === "1");
  const perfil = perfilDe(sessao);
  const nav = perfil.role === "professor" ? NAV.filter((n) => NAV_PROFESSOR.includes(n.id)) : NAV;
  const Atual = (nav.find((n) => n.id === tela) ?? nav[0]).C;

  const ir = (destino, telefone) => {
    setTela(destino);
    if (telefone) setTelefoneAlvo(telefone);
  };

  const alternarOcultar = () => {
    setOcultar((v) => {
      localStorage.setItem("ocultar_valores", v ? "0" : "1");
      return !v;
    });
  };

  const statusWhats = useStatusWhatsApp();

  return (
    <PerfilContext.Provider value={perfil}>
    <OcultarContext.Provider value={[ocultar, alternarOcultar]}>
    <StatusWhatsAppContext.Provider value={statusWhats}>
    <div className="min-h-screen pb-24 lg:flex lg:pb-0" style={{ background: SAND }}>
      <aside className="hidden w-60 shrink-0 flex-col p-4 lg:flex" style={{ background: NAVY }}>
        <div className="mb-6 px-2">
          <img src="/logo-leoezinhos.png" alt="Leõezinhos" className="mb-2 h-24 w-auto" />
          <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: LIME }}>Gestão</p>
          <p className="text-lg font-bold text-white">Priscila Pereira</p>
          <p className="text-xs text-white opacity-60">Leõezinhos · Futebol</p>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map((n) => (
            <button key={n.id} onClick={() => setTela(n.id)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold"
              style={tela === n.id ? { background: LIME, color: NAVY } : { color: "#fff" }}>
              <n.icon size={17} /> {n.label}
            </button>
          ))}
        </nav>
        <div className="mb-2 rounded-xl px-3 py-2" style={{ background: "#ffffff14" }}>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white opacity-60">Status do WhatsApp</p>
          <BolinhaStatusWhatsApp compacto="claro" />
        </div>

        <div className="mt-4 border-t px-2 pt-4" style={{ borderColor: "#ffffff22" }}>
          <button onClick={alternarOcultar}
            className="mb-2 flex items-center gap-2 text-sm font-semibold text-white opacity-80 hover:opacity-100">
            {ocultar ? <EyeOff size={16} /> : <Eye size={16} />} {ocultar ? "Mostrar valores" : "Ocultar valores"}
          </button>
          <p className="truncate text-xs text-white opacity-60">{sessao?.user?.email}</p>
          <button onClick={() => supabase.auth.signOut()}
            className="mt-2 flex items-center gap-2 text-sm font-semibold text-white opacity-80 hover:opacity-100">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-4xl p-4 lg:p-8">
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-2">
            <img src="/logo-leoezinhos.png" alt="Leõezinhos" className="h-9 w-auto" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: CLAY }}>Gestão</p>
              <p className="text-lg font-bold" style={{ color: NAVY }}>Priscila Pereira</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={alternarOcultar} aria-label="Ocultar valores">
              {ocultar ? <EyeOff size={20} style={{ color: NAVY }} /> : <Eye size={20} style={{ color: NAVY }} />}
            </button>
            <button onClick={() => supabase.auth.signOut()} aria-label="Sair">
              <LogOut size={20} style={{ color: NAVY }} />
            </button>
          </div>
        </div>
        <Atual ir={ir} telefoneAlvo={telefoneAlvo} />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto lg:hidden" style={{ background: NAVY }}>
        {NAV.map((n) => (
          <button key={n.id} onClick={() => setTela(n.id)}
            className="flex min-w-[68px] flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold"
            style={{ color: tela === n.id ? LIME : "#ffffff99" }}>
            <n.icon size={18} /> {n.label}
          </button>
        ))}
      </nav>
    </div>
    </StatusWhatsAppContext.Provider>
    </OcultarContext.Provider>
    </PerfilContext.Provider>
  );
}
