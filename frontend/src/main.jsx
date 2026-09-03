import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App, { supabase } from './App.jsx'
import Login from './Login.jsx'
import Convite from './paginas/Convite.jsx'

function Gate() {
  const [sessao, setSessao] = useState(undefined); // undefined = carregando, null = sem sessão

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setSessao(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (sessao === undefined) return null;
  if (!sessao) return <Login />;
  return <App sessao={sessao} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/convite/:token" element={<Convite />} />
        <Route path="*" element={<Gate />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
