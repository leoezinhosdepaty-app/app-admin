# App Priscila Pereira — contexto do projeto

Documento de passagem. Cole a pasta inteira no projeto e peça ao Claude Code para ler este arquivo primeiro.

## O que é

App de gestão dos negócios da Priscila. Começando pelo módulo de **futebol** (escolinhas Leõezinhos). Depois entram karatê, massagem, sinal de TV e loja de importados.

Logo oficial dos Leõezinhos em `frontend/public/logo-leoezinhos.jpeg` — usada no favicon, login, sidebar e páginas públicas de convite. Ainda não tem logo pros outros negócios (karatê, massagem, etc.) — quando esses módulos entrarem, trocar a logo/paleta por unidade de negócio.

## Stack

- **Banco:** Supabase (PostgreSQL), schema já aplicado
- **Front:** React + Tailwind (painel administrativo)
- **Backend:** Node/Express na VPS própria, com domínio já hospedado
- **WhatsApp:** uazapi (instância própria, número 5524981805511, conectada)
- **Pagamentos:** InfinitePay Checkout — 3 contas (INSA, MPAC, karatê)

## Unidades

| Unidade | Local | Dias e horário | Idades |
|---|---|---|---|
| INSA | Instituto Nossa Senhora Aparecida, Rua Manoel Bernardes, 19 — Paty do Alferes/RJ | 3ª e 5ª, 18h | 4 a 6 |
| INSA | idem | 3ª e 5ª, 19h | 7 a 14 |
| MPAC | Miguel Pereira Atlético Clube, R. Manoel Guilherme Barbosa, 520 — Miguel Pereira/RJ | 4ª e 6ª, 18h15 | 4 a 10 |
| Karatê | CT Martinelo, Miguel Pereira | 3ª e 5ª 9h30 / 2ª e 4ª 14h | todas |

Mesmo CNPJ para INSA e MPAC. Karatê é negócio separado (Samurais da Montanha).

## Planos

| Plano | Frequência | Valor |
|---|---|---|
| Jogador Caro | 2x/semana | R$ 160 |
| Irmãos Boleiros | 2x/semana | R$ 150 |
| Migué | 1x/semana | R$ 100 |

Matrícula R$ 50 · Aula avulsa R$ 25 · Kit de uniforme R$ 150 (camisa, short, meião).
Karatê: R$ 100 (1x/semana) ou R$ 200 (2x/semana).

## Arquivos desta pasta

| Arquivo/pasta | O que é | Status |
|---|---|---|
| `supabase_schema.sql` | Schema completo | ✅ aplicado |
| `migracao_kommo.sql` | 38 alunos + 37 responsáveis + anamneses, vindos do Kommo | ✅ rodado (conferido: 15 INSA 18h, 14 INSA 19h, 3 MPAC, 6 sem turma) |
| `migracao_matriculas.sql` | Matrículas dos migrados | ✅ rodado (38 matrículas, vencimento dia 15, valor batendo com o plano) |
| `rls_policies.sql` | RLS: acesso só para usuário autenticado | ✅ rodado |
| `ajustes_infinitepay.sql` | Handles das contas + unidade do karatê | ✅ rodado (handles preenchidos: INSA=futleozinhos, MPAC=futebolpriscila, KARATE=karatesamuraisdamontanha) |
| `backend/` | Projeto Node/Express (a partir do `infinitepay.js`) | ✅ publicado — https://api-leoezinhos.menuccisd.com.br |
| `frontend/` | Projeto Vite/React (a partir do `App-Pricila-Pereira-Supabase.jsx`) | ✅ publicado — https://app-leoezinhos.menuccisd.com.br |
| `Contrato_Template_Leoezinhos.md` | Contrato com variáveis de mesclagem | ⏳ virar gerador de PDF |
| `dados_leoezinhos.xlsx` | Planilha para completar dados faltantes | ⏳ preencher |
| `pendencias_migracao.csv` | 13 alunos com cadastro incompleto | ⏳ resolver via WhatsApp |

Os arquivos soltos `App-Pricila-Pereira-Supabase.jsx` e `infinitepay.js` na raiz continuam aqui só de histórico — o código de verdade agora mora em `frontend/src/App.jsx` e `backend/src/infinitepay.js`.

## Estado do MCP do Supabase

Autenticado e conectado neste projeto (`.mcp.json` na raiz, `project_ref=tptywaaiowaonbgkyfpe`). Dá pra rodar SQL, migrações e consultas direto por aqui sem precisar da senha do banco.

## Deploy / Produção

- **VPS:** `root@77.37.126.195` (Hostinger). Já roda outros serviços em produção via **Docker Swarm + Traefik** (não tem nginx/Node soltos no host — tudo é container): n8n, Postgres, Redis, Portainer, e o app irmão `erp-msd` (em `admin.menuccisd.com.br`). Traefik cuida do HTTPS automático (Let's Encrypt) via labels na rede overlay `menucciNet`.
- **Acesso SSH:** chave dedicada `claude-deploy-leoezinhos` (ed25519), cadastrada no painel da Hostinger (⚠️ editar `~/.ssh/authorized_keys` direto na VPS **não funciona** — a Hostinger sincroniza/sobrescreve esse arquivo com o que está cadastrado no painel dela). A chave privada só existe no ambiente onde foi gerada (scratchpad da sessão) — se precisar reconectar numa sessão nova, gerar um par novo e cadastrar no hPanel de novo.
- **URLs públicas:**
  - Painel: https://app-leoezinhos.menuccisd.com.br
  - API: https://api-leoezinhos.menuccisd.com.br
  - (Nomes com `-leoezinhos` porque os registros DNS foram criados assim, não `api.`/`app.` puro — tudo bem, só ficou um pouco mais longo.)
- **Onde fica na VPS:** `~/leoezinhos/backend/` e `~/leoezinhos/frontend/`, cada um com `Dockerfile` + `stack.yml` (mesmo padrão do `erp-msd`). Imagens: `leoezinhos-api:latest`, `leoezinhos-app:latest`. Deploy: `docker build` na própria VPS + `docker stack deploy -c stack.yml leoezinhos` (mesmo stack, 2 serviços: `leoezinhos_api` e `leoezinhos_app`).
- **`.env` de produção** (`~/leoezinhos/backend/.env`, só existe na VPS — não está no repo): igual ao `.env` local, mas com `APP_URL` e `FRONTEND_URL` apontando pros domínios acima. O `.env.production` do frontend (variáveis `VITE_*`, embutidas em tempo de build) também só existe na VPS.
- **Webhook da uazapi:** registrado e **ativo** (`enabled: true`) apontando pra `https://api-leoezinhos.menuccisd.com.br/api/uazapi/webhook`. **Confirmado funcionando de ponta a ponta** (2026-08-11): mensagem mandada de um celular real apareceu na tela Conversas do painel publicado. Se o domínio mudar algum dia, rodar `configurarWebhook()` de novo (dentro do container: `docker exec <container_leoezinhos_api> node -e "..."`, já que não tem Node solto na VPS).
- **Pra redeployar depois de uma mudança de código:** copiar os arquivos atualizados via `scp` pra `~/leoezinhos/backend/` ou `~/leoezinhos/frontend/`, rodar `docker build` de novo, e `docker service update --force leoezinhos_api` (ou `_app`).
- **⚠️ Pra mudar uma variável do `.env` (ex: `ROTINA_COBRANCA_ATIVA`): `docker service update --force` NÃO é suficiente.** O `stack.yml` do backend usa `env_file: .env`, que só é lido no momento do `docker stack deploy` — o `.env` **não é copiado pra dentro da imagem** (está no `.dockerignore` de propósito). Editar o `.env` na VPS e só rodar `service update --force` reimplanta a mesma config antiga sem reler o arquivo. O jeito certo: editar `~/leoezinhos/backend/.env`, rodar `docker build` se mudou código também, e então `docker stack deploy -c stack.yml leoezinhos` (não afeta o `leoezinhos_app`, que está em outro `stack.yml` — testado e confirmado que não removeu o outro serviço). Confirmar no log (`docker service logs leoezinhos_api --tail 10`) se a mensagem "Rotina automática de cobrança DESATIVADA" sumiu.

## InfinitePay — status por conta

Testado ponta a ponta (cobrança → link real → webhook → baixa automática):

| Conta | Handle | Status |
|---|---|---|
| MPAC | `futebolpriscila` | ✅ funcionando |
| INSA | `futleoezinhos` | ✅ funcionando (handle estava digitado errado — corrigido) |
| Karatê | `karatesamuraisdamontanha` | ⚠️ handle certo, checkout externo habilitado, mas API ainda recusa ("Unable to create checkout link"). Motivo não identificado — investigar depois com o suporte da InfinitePay se precisar. |

## Processo de Matrícula pública + Ações do aluno

- Tabela nova `convites` (token público) + bucket `documentos` (privado, PDFs de contrato) no Supabase.
- `backend/src/publico.js`: rotas sem login, protegidas só pelo token — `GET/POST /api/publico/convite/:token[/matricula|/anamnese|/contrato|/experimental]`.
- `backend/src/contrato.js`: renderiza `backend/templates/contrato-leoezinhos.md` com os dados reais, gera PDF (pdfkit), calcula hash SHA-256, sobe pro Storage. Só cobre INSA/MPAC (karatê não tem contrato configurado ainda).
- `backend/src/convites.js`: `POST /api/convites` (equipe, autenticado) cria o link e enfileira a mensagem de WhatsApp com ele.
- `frontend/src/paginas/Convite.jsx` + `formularios/`: página pública em `/convite/:token` — wizard de 3 passos (ficha → anamnese → contrato) quando `tipo=processo`, ou formulário avulso pros outros tipos. Testado ponta a ponta no navegador, inclusive o redirecionamento pro link de pagamento (taxa de matrícula R$50 + 1ª mensalidade, num link só).
- Painel: ficha do aluno agora tem menu **Ações** (editar dados, enviar ficha/anamnese/experimental/contrato, gerar cobrança, ver contrato, WhatsApp) e toggle Ativo/Inativo. Em Experimentais: data da aula editável e "Converter em Matrícula" funcionando (o botão não abre mais aba de WhatsApp — isso era código antigo de antes do envio automático via uazapi, removido).
- **Editar dados do aluno** (2026-08-12): "Editar dados" no menu Ações abre um formulário (reaproveita `ModalForm`, que ganhou suporte a campo `checkbox`) com nome, nascimento, categoria, uniforme, turma, bolsista e os dados do responsável (nome/telefone/CPF/e-mail). Salva direto via Supabase client (RLS `equipe_le_e_escreve`), sem endpoint novo no backend.
- **Checklist de progresso da matrícula** (2026-08-12): a ficha do aluno agora mostra 4 selos (Ficha / Anamnese / Contrato / Pagamento) — ✓ ou "pendente" — pra saber rapidamente até onde cada família foi no processo (ex.: preencheu tudo mas ainda não pagou a 1ª cobrança). "Pagamento" considera qualquer cobrança com `status='pago'` já registrada pro aluno. `qAlunos` (App.jsx) passou a trazer `cobrancas ( status )` também.
- **Filtro por status na tela de Alunos** (2026-08-12): botões Todos/Ativo/Matrícula incompleta/Inativo, com "Ativo" como padrão (evita listar os inativos por padrão).
- **Contrato legível antes de assinar** (2026-08-12): o passo 3 do wizard (`Contrato.jsx`) agora busca o texto completo do contrato já mesclado com os dados reais do aluno (`GET /api/publico/convite/:token/contrato-texto`, novo em `publico.js`/`contrato.js` — função `montarTextoParaLeitura`, mesmo texto do PDF mas sem a seção de "Registro da assinatura eletrônica") e renderiza numa caixa rolável formatada (títulos, negrito, tabela) acima da autorização de imagem/assinatura. Antes só mostrava um resumo de 2 parágrafos.
- **Bug corrigido junto**: o template (`contrato-leoezinhos.md`) tinha uma nota interna ("Template único para INSA... campos entre {{ }} são preenchidos automaticamente...") que vazava pro contrato do cliente — inclusive nos PDFs já assinados antes dessa correção. `montarTextoContrato()` agora remove essa nota do texto final.
- **Envio automático via uazapi**: ✅ feito e testado com envio real. `backend/src/uazapi.js` (`enviarWhatsapp`, `configurarWebhook`), `backend/src/worker.js` (processa a fila `mensagens` a cada minuto, janela 8h–21h, pula quem está com `conversas.em_atendimento_humano=true`), `backend/src/webhookUazapi.js` (`POST /api/uazapi/webhook`, pausa a régua quando o responsável responde). Credenciais em `backend/.env` (`UAZAPI_URL`, `UAZAPI_TOKEN`).
- Endpoint real: `POST {UAZAPI_URL}/send/text`, header `token`, body `{number, text}` — sem o `+` no número. Registro do webhook: `POST {UAZAPI_URL}/webhook` com `{url, events:["messages"], excludeMessages:["wasSentByApi","fromMeYes"]}`.
- ✅ Publicado, webhook registrado e **confirmado recebendo mensagens reais em produção** (ver seção "Deploy / Produção").

### Formato real do payload do webhook (importante — não está na doc pública da uazapi)

Descoberto logando o corpo bruto de um envio real:

```json
{
  "EventType": "messages",
  "chat": { "wa_name": "Laíse Menucci", "wa_contactName": "Laíse Pérolas Futebol", "wa_isGroup": false, "wa_chatid": "5521988301424@s.whatsapp.net", ... },
  "message": {
    "sender": "190722435231786@lid",       // NÃO é o telefone — é um LID (id opaco do WhatsApp)
    "sender_pn": "5521988301424@s.whatsapp.net",  // ESSE é o telefone de verdade
    "chatid": "5521988301424@s.whatsapp.net",
    "isGroup": false, "fromMe": false, "text": "...", "senderName": "Laíse Menucci"
  }
}
```

**Pegadinha que já causou bug real**: em mensagens de **grupo**, o WhatsApp identifica quem mandou por um LID único por grupo/participante — nada a ver com o telefone da pessoa. Usar só `message.sender` pra identificar o contato faz cada mensagem de grupo virar uma "conversa" fantasma nova (chegamos a acumular ~40 conversas fake em poucas horas, de grupos que o número da instância participa). `webhookUazapi.js` agora: (1) ignora completamente `isGroup=true`, (2) usa `sender_pn` (ou `chatid`) em vez de `sender` pro telefone, (3) usa `chat.wa_name` (nome salvo na agenda) pro nome do contato.

## Caixa de entrada (Conversas) + Financeiro

- `mensagens` ganhou `direcao` ('entrada'/'saida') e `criado_em`; `conversas` ganhou `nome` (nome do WhatsApp). O webhook (`webhookUazapi.js`) agora grava o texto de toda mensagem recebida, não só pausa a régua.
- Tela **Conversas** (era "Mensagens"): lista de contatos + thread por conversa, com caixa de resposta manual (grava em `mensagens`, o worker manda de verdade em até 1 min). Botão **"Converter em Aluno"** aparece quando o telefone não bate com nenhum responsável cadastrado — popup pede só o nome do aluno (responsável e telefone já vêm da conversa), cria `responsaveis`+`alunos` (status `pendente`) direto via RLS, sem endpoint novo.
- Menu Ações ganhou **"Matricular"** (topo da lista) — dispara o processo de matrícula (`tipo=processo`) pra um aluno que já existe, reaproveitando o `POST /api/convites`.
- Tela **Financeiro**: filtro por status e por intervalo de vencimento (data de/até). Cards de cobrança agora são clicáveis → modal de edição (descrição, valor, vencimento, status) e botão Apagar (com confirmação). Aviso no modal se já existe link de pagamento gerado (editar o valor não atualiza o link).
- Tudo testado no navegador com login real (webhook simulado → aparece na thread → converte em aluno → aparece em Alunos com "Matrícula incompleta" → Matricular → mensagem na fila; edição e filtros do Financeiro confirmados no banco).
- **Achado incidental**: havia uma cobrança real do Leonel Menucci (mensalidade, provavelmente gerada testando o botão "Gerar Cobrança" manualmente) sem link de pagamento — o link foi gerado retroativamente. Se isso acontecer de novo, o link pode ser regenerado abrindo a cobrança no Financeiro (por enquanto editar não regenera o link automaticamente — só teria efeito criando uma cobrança nova via Ações > Gerar Cobrança).

**Antes de rodar `migracao_kommo.sql`:** `alter table alunos alter column nascimento drop not null;`
(8 alunos vieram sem data de nascimento.)

## Decisões já tomadas

- Contas InfinitePay **separadas** por unidade; unificação só na tela do app.
- Migrar as recorrências do painel para links gerados pelo app, usando `order_nsu` = uuid da cobrança. É o que permite baixa automática. Cancelar as recorrências antigas só depois do primeiro ciclo funcionar.
- Vencimento padrão dia 15 para todos os migrados; ajustar exceções depois.
- Bolsistas geram cobrança com status `isento` (aparecem no relatório, sem link de pagamento).
- Contrato e autorização de imagem com assinatura eletrônica no app: guardar PDF, hash SHA-256, IP, user-agent e data-hora.
- Fila de mensagens com worker: janela 8h–21h, intervalo entre disparos, pausa quando o responsável responde.
- Formulários públicos **não** falam direto com o Supabase — postam numa rota do backend que usa a service_role.

## Próximos passos

1. ~~Rodar as migrações pendentes~~ ✅ feito e conferido.
2. ~~Tela de login (Supabase Auth)~~ ✅ feito. Falta: você criar o usuário da equipe em Supabase Dashboard → Authentication → Users → Add user (não é algo que o Claude faz por vocês).
3. ~~Teste ponta a ponta da InfinitePay~~ ✅ feito no MPAC e INSA. Karatê ainda com erro (ver tabela acima).
4. ~~Formulário "Converter em matrícula"~~ ✅ feito — processo público de 3 passos, testado no navegador.
5. ~~Worker da fila de mensagens (uazapi)~~ ✅ feito e testado com envio real. Falta registrar o webhook quando for pra produção (ver seção acima).
6. ~~Formulários públicos (experimental, matrícula, anamnese) com assinatura~~ ✅ feitos, rota `/convite/:token` sem login.
7. ~~Contrato: gerador de PDF + assinatura eletrônica~~ ✅ feito (só INSA/MPAC — karatê não coberto pelo template).
8. Relatórios: inadimplentes, faturamento, despesas (as views já existem no banco: `vw_inadimplentes`, `vw_faturamento_mensal`, `vw_resultado_mensal`).
9. ~~Subir `backend/` e `frontend/` na VPS~~ ✅ feito (ver "Deploy / Produção" acima).
10. 13 alunos com cadastro incompleto — ver `pendencias_migracao.csv`, resolver via WhatsApp (agora dá pra usar "Enviar Ficha de Matrícula" do menu Ações pra isso).
11. ~~Rotina de aniversário (mensagem automática)~~ ✅ feito (2026-09-01) — ver seção abaixo.
12. `professor_nome`/`professor_cref` e `data_fim_vigencia` no contrato estão com valores-padrão (Priscila Pereira sem CREF; vigência de 12 meses renovável) — revisar se for diferente disso.

## Sessão 2026-08-13/14 — cadastros, ficha do aluno, eventos, professores

- **Checagem final de cadastros (INSA)**: Priscila passou `Aluno_planos_Leoezinhos.docx` (lista oficial por turma — 18h = 4-6 anos, 19h = 7-13 anos). Cruzado com o banco:
  - 13 alunos "pendente" (sem turma) tiveram turma_id e status='ativo' preenchidos a partir da tabela do doc.
  - **Leonel Menucci** e **Nicole Santos** corrigidos pra `bolsista=true` (o doc mostrava Leonel como "BOLSA"; Nicole é a bolsista 100% do par Nara/Nicole confirmada pela Priscila).
  - **Bernardo Souto Ferreira Chagas**: responsável trocado pro pai José Mário Bernardo S Duarte (quem paga), confirmado pela Priscila.
  - **Arthur (INSA)**: responsável trocado pra mãe Janine Cabral (telefone antigo no Kommo era do pai) e reativado — confirmado pela Priscila.
  - MPAC: registrados Théo Damasceno, Nara Santos, Nicole Santos, Arthur Penna, Emanuel Borges a partir da lista que ela passou por WhatsApp.
  - **Pendências ainda em aberto**: "Bernardo Damasceno" (INSA, 18h) e "Heleno Mecucci/Menucci" (INSA, 19h, BOLSA) aparecem no doc mas não estão cadastrados — sem telefone, não dá pra cadastrar sozinho. O doc lista "BERNADO SOUTO DUARTE" tanto na tabela 18h quanto "BERNARDO S. DUARTE" na 19h — pode ser duplicidade do próprio documento, não investiguei a fundo. "Mauricio gastaldi Dantas neto" apareceu como `inativo` no banco sem eu ter feito essa mudança — possivelmente alterado pela própria Priscila no painel. Leonardo Emanuel Baltar (MPAC) ainda sem telefone.
- **Mensagens automáticas reescritas** (`convites.js`, `infinitepay.js`): tom mais caloroso, citam o nome do aluno, e a mensagem de boas-vindas cita a escola certa por unidade ("Leõezinhos de Paty" vs "Leõezinhos do MPAC"). Tirado o "OSS!" (saudação de karatê) da cobrança mensal.
- **Aula experimental**: formulário público ganhou campo de data/horário (`data_aula`). Tela Conversas ganhou botão "Enviar Convite Aula Experimental" (cria convite tipo `experimental` sem vincular a registro nenhum, manda o link pro telefone da conversa).
- **Professores**: tabela ganhou colunas `estagiario`, `estagio_inicio`, `estagio_fim`, `endereco`, `faculdade`, `observacoes`. Tela agora permite editar (clicar no card abre o mesmo formulário preenchido). Não consegui reproduzir o bug relatado ("preencho e não vai") sem login — revisão de código não achou defeito; se persistir, provavelmente é sessão expirada (Supabase Auth) — pedir pra Priscila dar F5/logar de novo se acontecer de novo.
- **Contrato pela ficha do aluno**: menu Ações ganhou **Gerar Contrato** (cria o link do contrato sem mandar — mostra o link pra copiar) e **Enviar Contrato** (cria e manda por WhatsApp), além do já existente "Ver Contrato". Endpoint `POST /api/convites` ganhou parâmetro opcional `enviar:false`.
- **Ficha do aluno redesenhada**: modal pequeno virou painel grande (`max-w-4xl`) com cards: Dados, Comunicação (todos os "Enviar X" juntos), Contrato, Anamnese (mostra as respostas reais, não só se foi preenchida), Aula experimental (se existir), Financeiro (gerar cobrança + histórico das últimas 5). O menu "Ações" em dropdown foi removido — os botões agora ficam sempre visíveis, agrupados por card. Toolbar do topo (editar/whatsapp/ativar-inativar/fechar) virou ícones compactos.
- **Ocultar valores financeiros**: botão (ícone de olho) na barra lateral (desktop) e no header (mobile) esconde todo R$ exibido no app (Painel, Financeiro, Eventos, Professores, ficha do aluno) — persiste no localStorage. Implementado via `OcultarContext` + componente `<Valor>`.
- **Divulgação de eventos**: cada evento (`CardEvento`) ganhou botão **Divulgar** → modal com texto (aceita `{{link_pagamento}}` como variável, substituído pelo link já gerado do evento), upload de imagem/arquivo (bucket novo `eventos` no Storage, público, pra a uazapi conseguir buscar o arquivo por URL), e 3 filtros de destinatários (Alunos ativos / Todos os alunos / Contatos do WhatsApp em Conversas — cada um mostra a contagem antes de enviar). Ao confirmar, cria uma linha em `mensagens` por destinatário; o worker já sabe mandar mídia (`uazapi.js` ganhou `enviarMidia`, `POST /send/media`; `worker.js` decide texto vs mídia pela presença de `midia_url`).
- **Nada disso foi testado com login real** (sessão expirou no meio da sessão e não havia credenciais à mão) — testei o que dava via consultas diretas no banco/queries equivalentes e revisão de código, mas vale a Priscila conferir visualmente a ficha do aluno, o formulário de professores e a divulgação de eventos na primeira vez que usar.

## Login de Professor — acesso restrito (2026-08-14)

Sistema de papéis via `app_metadata` do Supabase Auth (não editável pelo próprio usuário, só via admin API):
- **Equipe** (padrão — qualquer usuário sem `role` no app_metadata, como a Priscila e a Laíse): acesso total, igual sempre foi.
- **Professor** (`app_metadata.role = 'professor'`, `app_metadata.professor_id = <id>`): só enxerga Painel (sem "Previsto no mês"/"Em atraso"), Alunos, Experimental, Eventos, e o próprio cadastro em Professores. Sem Financeiro, sem Conversas. Aplicado via RLS de verdade no Postgres (funções `eh_staff()` e `professor_id_atual()` lendo o JWT) — não é só esconder botão no front, testei logando de verdade como professor e confirmei que INSERT/UPDATE em `alunos` e SELECT em `cobrancas` são bloqueados pelo banco.
- **Tela Professores**: botão de chave (🔑) gera ou redefine o login do professor (e-mail + senha, criado via `POST /api/professores/:id/acesso`, admin API do Supabase). Botão de lixeira apaga o professor e o login associado (`DELETE /api/professores/:id`). Card mostra "tem acesso ao app" quando já existe login.
- **Limitação conhecida**: como RLS é por linha (não por coluna), pra impedir professor de ver `valor_mensalidade` eu bloqueei a tabela `matriculas` inteira pra esse papel — então na tela Alunos, pro professor, o campo "Plano" aparece como "Sem matrícula ativa" mesmo quando existe (não é bug, é a mesma restrição). Anamnese/Contrato também ficam sempre "pendente" na Ficha do aluno pro professor pelo mesmo motivo (tabelas `anamneses`/`documentos` são só-equipe). Se isso incomodar no uso real, dá pra resolver com uma view sem a coluna de valor — não fiz porque não foi pedido explicitamente e adiciona complexidade.
- **Testado ao vivo em produção** (2026-08-14): a Priscila logou ela mesma no navegador (não digitei senha nenhuma) e confirmei visualmente — ficha do aluno completa (Dados, Comunicação, Contrato, Anamnese com respostas reais, Financeiro com valor de verdade pra equipe), edição de evento pré-preenchida, "Ocultar valores" no menu.
- **Ajuste 2026-08-14, depois do feedback da Priscila**: a limitação do professor ficou errada na primeira versão (RLS bloqueava `matriculas`/`anamneses`/`documentos`/`planos`/`responsaveis` inteiros, fazendo a Ficha mostrar tudo como "pendente" mesmo quando não era). Corrigido: essas tabelas agora têm **leitura liberada pra qualquer autenticado** (professor inclusive) — só a ESCRITA continua exclusiva da equipe. O que fica de fato escondido do professor é só o **valor em R$** (via componente `<Valor>`, que agora força ocultar sempre que `role==='professor'`, além do toggle manual da equipe) e a seção "Financeiro" inteira da Ficha (cobranças ficam bloqueadas por RLS mesmo, isso sim é intencional). Testei de novo logando como professor de teste: `matriculas`/`planos` legíveis, `cobrancas` continua bloqueado, escrita continua bloqueada.
- **Painel**: alunos inativos não entram mais na lista/contagem de "Precisa de você" (antes contavam mesmo sem estarem ativos).
- **Heleno Menucci** cadastrado como bolsista, mesmo responsável do Leonel (Laíse Mesquita de Figueiredo, tel. 5521988301424) — resolve a pendência que tinha ficado em aberto da checagem do doc de planos.
- **Eventos**: agora dá pra editar (botão "Editar" ao lado de "Divulgar", mesmo formulário do cadastro, pré-preenchido).
- **Anti-bloqueio no envio de WhatsApp** (`worker.js`): antes o lote de 5 mensagens por tick saía quase tudo de uma vez. Agora cada mensagem espera um intervalo aleatório (4 a 22 segundos) antes de ser enviada, e a mensagem é "travada" (`status='enviando'`) assim que a espera começa, pra evitar duplicidade se dois ticks do cron se sobrepuserem. Isso vale pra qualquer fila (cobrança, convite, divulgação de evento) — não é só pra eventos.

## Oportunidades + Painel/Financeiro/Conversas (2026-08-15)

- **Nova tela Oportunidades**: contatos do WhatsApp marcados como "Oportunidade" (novo campo `conversas.oportunidade`). Cada card é clicável (abre a conversa em Conversas) e tem 2 botões — Experimental e Matrícula — que disparam o link certo por WhatsApp sem precisar entrar na conversa.
- **Conversas**: os 2 botões viraram 3, todos com ícone: **Oportunidade** (⭐, marca/desmarca — só aparece pra contato sem cadastro), **Aula Experimental** (📋, sempre visível), **Matrícula** (➡️, só pra contato sem cadastro — manda o link de matrícula, substituindo o antigo "Converter em Aluno" que criava o aluno direto sem avisar a família). `backend/src/convites.js`: tipo `processo` agora também aceita ser criado sem `aluno_id`/`experimental_id` (igual já era com `experimental`), pra dar pra mandar o link de matrícula pra um contato frio.
- **Bug de layout corrigido**: mensagens com link longo (sem espaço) estouravam a largura da coluna de conversa e quebravam a tela toda. Causa: nem o texto da mensagem tinha `break-words`, nem os containers flex tinham `min-w-0` (o padrão do flexbox é não encolher abaixo do conteúdo). Corrigido nos dois pontos.
- **Conversas**: campo de busca (telefone, nome do aluno ou do responsável) e filtro "Alunos" (mostra só contatos com responsável cadastrado no banco).
- **Painel**: card "Aulas experimentais na semana" (próximos 7 dias) com botão direto "Converter em Matrícula" por aluno. Botão "Novo Aluno" no topo (mesmo formulário de Alunos, extraído pra função compartilhada `criarAlunoNovo`).
- **Financeiro**: card "Inadimplentes" (alunos com `status='inadimplente'`) com botão "Enviar Cobrança" por aluno (manda lembrete com o link da cobrança em aberto). Escondido pra quem loga como professor.
- Cadastrados: **Bernardo Damasceno** (resp. Michel Damasceno, 5524981085316) e **Heleno Menucci** (bolsista, mesmo responsável do Leonel — Laíse, 5521988301424) — resolviam pendências da checagem do doc de planos.
- Tudo testado ao vivo, logado na sessão real da Priscila/Laíse (sem eu digitar senha nenhuma).

## Ajuste de layout da Ficha do aluno (2026-08-15)

- Checklist do topo: "Pagamento" agora aparece ✓ automaticamente pra bolsista (antes ficava sempre "pendente" mesmo pra quem não paga).
- Colunas reorganizadas: **esquerda** = Dados + Anamnese (+ Aula experimental, quando existir); **direita** = Contrato + Comunicação; **Financeiro** embaixo, ocupando a largura toda. Confirmado ao vivo (posição x/y dos cards) e testado com bolsista de verdade (Miguel Rodrigues) mostrando ✓ Pagamento.

## Correção 2026-08-15: seções do Painel/Financeiro ficavam invisíveis quando vazias

O card "Aulas experimentais na semana" (Painel) e "Inadimplentes" (Financeiro) só apareciam quando havia dados — como no momento não havia nenhuma experimental agendada nem inadimplente, as seções sumiam por completo, dando a impressão de que não tinham sido implementadas. Corrigido: agora os cards sempre aparecem, com uma mensagem de vazio ("Nenhuma aula experimental agendada pros próximos 7 dias." / "Nenhum aluno inadimplente. Tudo em dia.") quando não há nada pra mostrar — mesmo padrão já usado em "Precisa de você" no Painel.

## Link permanente de aula experimental (2026-08-20)

Criado um convite fixo (`token='aula-experimental'`, tipo `experimental`, sem aluno/experimental vinculado) pra divulgação (Instagram, WhatsApp Business etc.) — **link único que não muda e aceita quantos envios forem**, cada um cria um lead novo em `experimentais`. Confirmado testando 2 envios seguidos sem bloqueio. Link: `https://app-leoezinhos.menuccisd.com.br/convite/aula-experimental`. Só serve pra aula experimental — matrícula continua sendo só por link individual (por pedido da Priscila/Laíse).

## Foto do aluno (2026-08-21)

- Campo de foto (usa a coluna `foto_url` que já existia em `alunos`, só não era usada). Bucket novo no Storage: `alunos` (público, igual o `eventos`).
- Componente `frontend/src/SeletorFoto.jsx`: escolhe uma imagem do dispositivo e abre um recorte circular (arrastar pra posicionar + controle de zoom), sem depender de nenhuma biblioteca externa — feito com canvas puro, pra não arriscar quebrar o build da VPS com dependência nova.
- **Ficha do aluno** (painel): foto aparece do lado do nome, clicável pra trocar (equipe só — professor só visualiza). Sobe direto pro Storage.
- **Ficha de Matrícula pública** (`FichaMatricula.jsx`): mesmo seletor de foto. Como quem preenche não está logado, a foto vai em base64 dentro do `POST /matricula` — o backend (`publico.js`) sobe pro Storage usando a chave de serviço e já salva o `foto_url` assim que cria/atualiza o aluno.
- Lista de Alunos: mostra a foto no círculo em vez das iniciais, quando existir.
- Testado de ponta a ponta pelo caminho público (curl simulando o envio do formulário, confirmei o arquivo indo pro Storage e ficando público). **Não testei a parte do painel (upload direto pela ficha) porque a sessão de login expirou e não consigo digitar senha** — vale a Laíse/Priscila testar na próxima vez que entrar.

## 🚨 Bug crítico corrigido: fila de WhatsApp travada há semanas (2026-09-01)

A Priscila perguntou "como está a rotina de cobrança" no primeiro dia de setembro e a resposta revelou um bug sério, ativo desde o começo do projeto:

- `backend/src/webhookUazapi.js` marca `conversas.em_atendimento_humano = true` toda vez que uma família responde no WhatsApp (intenção original: dar um tempo pra equipe assumir a conversa sem o robô atrapalhar). **Só que nada nunca desmarcava esse campo.**
- Resultado: **100% das 109 conversas** do banco (qualquer família que já respondeu uma mensagem, alguma vez) ficaram permanentemente excluídas de qualquer envio automático — cobrança, lembrete de atraso, convite de matrícula/experimental, tudo. `backend/src/worker.js` pulava (`continue`) essas mensagens pra sempre, sem nunca marcar erro, então elas só se acumulavam silenciosamente em `status='na_fila'`.
- Achado ao investigar: **153 mensagens paradas na fila**, algumas desde 13/08/2026 (quase 3 semanas). Isso incluía cobranças reais de setembro que já tinham sido geradas pela rotina (link de pagamento pronto) mas nunca chegaram a sair pelo WhatsApp.
- **Corrigido em `worker.js`**: a pausa por atendimento humano agora vale só por **6 horas** a partir da última resposta da família (usa o campo `conversas.ultima_resposta`, que já existia) — depois disso o envio automático volta sozinho. Isso resolve tanto o travamento antigo (tudo que passou de 6h já volta a ser processado) quanto preserva a intenção original (dar uma folga pro robô logo depois de alguém responder).
- Adicionado também um botão manual **"Retomar automático"** na tela de Conversas (aparece só quando a conversa está pausada), pra equipe poder destravar na hora se não quiser esperar as 6h.
- **Rotina de cobrança automática está ativa** (`ROTINA_COBRANCA_ATIVA=true`) desde o fim de agosto — já gerou cobranças reais de setembro pra vários alunos com vencimentos variados (confirmei a distribuição de dias de vencimento no banco batendo com o documento que a Priscila passou). Só uma mensagem falhou de vez (número do Rafael De Araújo Conceição antes da correção do telefone) — é histórico de agosto, já resolvido, sem impacto hoje.

## Status do WhatsApp no painel (2026-09-01)

- `backend/src/uazapi.js`: `statusConexao()` chama `GET {UAZAPI_URL}/instance/status` e devolve `{ conectado, motivo, desde }`.
- Rota nova `GET /api/uazapi/status` (staff, `webhookUazapi.js`).
- Frontend: hook `useStatusWhatsApp()` (consulta ao entrar + a cada 2 minutos) + contexto `StatusWhatsAppContext`. Componente `BolinhaStatusWhatsApp`:
  - `compacto="claro"` → bolinha + texto pra fundo escuro, usado na barra lateral numa seção própria "Status do WhatsApp".
  - sem `compacto` → banner de alerta (só aparece quando desconectado), colocado no topo do Painel e da tela de Conversas.
- **Episódio real que motivou isso** (01/09/2026): o WhatsApp da Priscila caiu em 20/08 ("logged out from another device") e ficou desconectado 12 dias sem ninguém perceber, porque não tinha nenhum aviso visual — só descobri perguntando "como está a rotina" e cavando os logs. Junto com esse alerta, também corrigi: (1) a pausa por atendimento humano que nunca expirava (agora dura só 6h — ver seção anterior), (2) um bug meu no código da trava anti-duplicidade (usava um status `'enviando'` que não existia no enum do banco, fazendo todo envio falhar silenciosamente sem log nenhum). Depois da reconexão, reativei manualmente as ~20 mensagens que ficaram de fora por causa da queda (excluindo uma que tinha um número já corrigido) e confirmei o envio de verdade.

## Chave Pix no cadastro de professores (2026-09-01)

- Coluna `pix` (text, opcional) em `professores`. Campo "Chave Pix" adicionado no formulário de cadastro/edição (`CAMPOS_PROFESSOR`/`valoresParaProfessor` em `frontend/src/App.jsx`), logo depois do valor por aula.
- Só aparece no formulário de edição (staff) — não foi exposto na listagem/card de professores de propósito, já que é um dado de pagamento mais sensível que os outros (CREF, telefone) que já ficam visíveis ali pra qualquer professor logado.

## Rotina de aniversário dos alunos (2026-09-01)

- `backend/src/aniversarios.js` — `mensagensAniversarioAlunos()`: todo dia às 8h (horário de São Paulo, `timezone: "America/Sao_Paulo"` explícito no `cron.schedule`), verifica quem faz aniversário hoje entre os alunos com status `ativo` ou `inadimplente` (não manda pra quem tá só experimental/pendente) e enfileira uma mensagem de parabéns pro telefone do responsável, reaproveitando a fila `mensagens` (mesmo worker/pacing anti-bloqueio de sempre).
- Tem checagem de duplicidade (não manda 2x no mesmo dia pro mesmo aluno, caso o cron rode mais de uma vez).
- **Corrigido em seguida (2026-09-01):** `gerarCobrancasDoMes` e `reguaInadimplencia` (`backend/src/index.js`) ganharam `{ timezone: "America/Sao_Paulo" }` explícito também, então agora os 3 crons (cobrança 07h, régua 09h, aniversário 08h) realmente rodam nesses horários em Brasília — antes rodavam ~3h mais cedo (horário do container, UTC).
- Testado contra o banco de produção (sem nenhum aniversariante no dia, então rodou sem inserir nada — confirma que a query e as junções funcionam sem erro).

## Conferência manual completa com os relatórios da InfinitePay (INSA + MPAC) — 2026-09-20

Reconciliação linha a linha dos relatórios de movimentação/vendas da InfinitePay (INSA e MPAC) contra as cobranças do sistema. Achados e correções, além do que já está descrito abaixo:

- **Cartão de crédito: o "NSU" do relatório BATE com o `id_externo` que a gente grava** (formato UUID igual) — diferente do Pix, onde os formatos são diferentes e não dá pra cruzar por ID (ver lição abaixo). Sempre que a linha for "Crédito", vale conferir por NSU primeiro — é prova real, não palpite por nome.
- **Bernardo Souto Ferreira Chagas / Bernardo S Duarte eram cadastros duplicados do mesmo aluno** (mesmo telefone da família) — mesclados num só, ficou com o nome "Bernardo S Duarte", mantendo o histórico mais completo (anamnese, contrato, matrícula, pagamento).
- **3 pagamentos do MPAC reconciliados** (todos via "Gestão de Cobrança" da InfinitePay, fora do nosso link — por isso nunca caíram sozinhos): Théo Carneiro (pago 09/09), Emanuel Borges (pago 11/09), Arthur Pena (pago 20/09).
- **Tainara da Silva Esteves de Oliveira** (Pix R$160, 04/09) — não identificada, não é responsável de ninguém cadastrado. Fica pendente até a Priscila identificar.
- Sonia A P Damasceno (R$159,73, 19/09) — não era mensalidade, foi compra de uniforme. Ignorar.
- Adicionei o nome (e telefone) do responsável em toda exibição de cobrança (lista do Financeiro, card de Inadimplentes, modal de detalhe) — facilita muito conferir contra relatório da InfinitePay visualmente.

## Lição: cruzar relatório da InfinitePay por nome é arriscado — achei um duplicado (2026-09-20)

Ao tentar bater o relatório de movimentações da InfinitePay (CSV) com as cobranças do sistema, errei uma: identifiquei um Pix como sendo do "Bernardo Souto Ferreira Chagas" quando na verdade era do **"Bernardo S Duarte"** — a Priscila corrigiu.

**Causa da confusão: são dois cadastros duplicados do mesmo aluno.** `Bernardo Souto Ferreira Chagas` (responsável "José Mario Bernardo S Duarte") e `Bernardo S Duarte` (responsável "Graziele Duarte Bauer santos") têm **o mesmo telefone cadastrado** (`5524981160568` / `24 98116-0568`) — quase certamente pai e mãe da mesma criança, cadastrados duas vezes com nomes ligeiramente diferentes. A família pagou uma mensalidade só, mas como tinha dois registros, cada um com sua própria cobrança de setembro, dava a impressão de que um pagou e o outro não. **Cancelei a cobrança duplicada do "Bernardo S Duarte"** — não é uma dívida real. Vale considerar mesclar/apagar um dos dois cadastros quando sobrar tempo, pra não confundir de novo.

**Limitação técnica descoberta:** tentei usar o número "NSU" que aparece no relatório da InfinitePay pra bater com o `id_externo` que a gente grava no banco — **os formatos são diferentes** (o nosso é um UUID tipo `5d24f232-...`, o da InfinitePay é um número tipo `2741214665`) — não são o mesmo campo, não dá pra cruzar diretamente por ID. Então a única forma de conferir manualmente é por nome + valor + data, que é exatamente o que causou o erro do Bernardo (o nome de quem paga o Pix nem sempre é o nome do responsável cadastrado — pode ser cônjuge, avó, etc.).

**Melhoria feita:** adicionei o nome (e telefone) do responsável em todo lugar que mostra uma cobrança — lista do Financeiro, card de Inadimplentes, e o modal de detalhe da cobrança (`frontend/src/App.jsx`). Ajuda a conferir mais rápido visualmente contra o relatório da InfinitePay.

## Card "Previsto no mês" do Painel mostrava quase o dobro do valor real (2026-09-20)

- Bug: o card somava a mensalidade de **todo mundo que tem uma matrícula com `ativa=true`**, sem checar se o aluno em si ainda está com status "ativo". 12 alunos que já estão inativos (desistiram) continuavam com a matrícula deles marcada `ativa=true` no banco — nunca foi desativada quando eles saíram. Isso inflava o "Previsto no mês" de R$ 5.800 (valor real) pra R$ 10.240 (quase o dobro).
- Fix: `frontend/src/App.jsx` (`Painel`) — o cálculo do `previsto` agora só soma alunos com `status === "ativo"`. Também desativei as 12 matrículas órfãs no banco (não afeta cobrança nenhuma, já que a rotina de cobrança já checava o status do aluno separadamente — isso era só um problema de exibição no card).
- O card "Em atraso" foi conferido e **não** tinha esse problema (já filtra certo pelo status da cobrança).

## Bug de fuso horário: datas mostradas com 1 dia a menos (2026-09-20)

Achado ao investigar reclamação de que a lista de Inadimplentes "não limpou" — o vencimento aparecia como 14/09 quando no banco estava 15/09.

**Causa:** datas puras tipo "2026-09-15" (sem hora) não podem passar por `new Date(...)` — o JavaScript interpreta como meia-noite **UTC**, e ao formatar de volta pro fuso local (Brasília, UTC-3) isso vira 21h do dia anterior, mostrando um dia a menos. Achado em vários lugares:

- `frontend/src/App.jsx`: `dataBr()` (usada pra vencimento, nascimento, etc. em toda a tela), `idade()` (cálculo de idade), e o filtro de "Aniversário hoje" do Painel — todos construíam um `Date` a partir da string pura.
- `backend/src/contrato.js`: a data de nascimento impressa no contrato tinha o mesmo problema; e a data/hora de assinatura (`hoje.toLocaleDateString()`/`toLocaleString()`) usava o fuso do servidor (UTC, container não tem `TZ` configurado) em vez de horário de Brasília — um contrato assinado à noite podia sair com a data do dia seguinte no PDF.

**Fix:** datas puras agora são reformatadas direto da string ("YYYY-MM-DD" → "DD/MM/YYYY"), sem passar por `Date`/fuso nenhum. Nos lugares do backend que realmente precisam da hora atual, adicionei `{ timeZone: "America/Sao_Paulo" }` explícito.

**Importante:** isso era só um problema de **exibição** — os cálculos automáticos (rotina de cobrança, régua de inadimplência) já comparavam datas em UTC de forma consistente por trás dos panos, então não geravam cobrança no dia errado nem coisa assim. Só a tela mostrava a data errada pra quem está olhando do Brasil.

## 🚨 Revisão completa do módulo Financeiro — causa real das reclamações de cobrança pós-pagamento (2026-09-20)

Motivo: vários responsáveis reclamando que continuam recebendo cobrança mesmo tendo pago (José Mario, Juliana Penna, e possivelmente a família Moura), e os cards do Financeiro não batendo com a realidade.

**Causa raiz encontrada:** `FichaCobranca` (o formulário de editar uma cobrança na tela Financeiro) deixa mudar o status pra "pago" com um simples `<select>`, mas fazia só um `update` cru na tabela — **não fazia nada do que o webhook de verdade faz** quando um pagamento é confirmado: não gravava `pago_em`/`metodo`, não cancelava lembretes de atraso ainda na fila, e principalmente **não voltava o status do aluno de "inadimplente" pra "ativo"**.

Isso é usado o tempo todo porque o webhook da InfinitePay não é 100% confiável (já documentado antes nesse arquivo) — então, na prática, sempre que alguém confirmava um pagamento manualmente (por já saber que o cliente pagou, via PIX direto/print/etc.), a cobrança ficava "paga" mas **o aluno continuava marcado como inadimplente pra sempre**. E o card "Inadimplentes" do Financeiro (`qInadimplentes`) lê exatamente esse status do aluno — então esses pais continuavam aparecendo lá, e é bem provável que alguém tenha clicado "Enviar Cobrança" pra eles de novo achando que ainda deviam.

**Encontrei 10 cobranças** nessa situação (`status=pago` mas `pago_em/metodo` nulos): Thomas Sant Ana Oliveira, Antonio Barcellos, Davi dos Santos Silva, João Miguel Silva Oliveira, Caetano Peixoto Avila, João Pedro Monteiro, Miguel Antônio de Oliveira Peruce, Nicolas Moura Rosa, Henrique Ornellas, Davi Neves — sendo que **6 desses alunos ainda estavam com status "inadimplente"** mesmo já pagos.

**Fix no código:** `frontend/src/App.jsx` (`FichaCobranca.salvar`) — quando o status muda pra "pago" (e não estava pago antes), agora faz a mesma coisa que o webhook: grava `pago_em`/`metodo:"manual"`, cancela mensagens de inadimplência ainda `na_fila`, e volta o aluno pra "ativo".

**Backfill dos dados já afetados:** corrigi as 10 cobranças e reativei os 6 alunos que estavam presos em "inadimplente" indevidamente.

**Segundo bug achado no caminho — mensalidade R$0:** dois alunos (Bernardo S Duarte e Arthur Pena) tinham matrícula com `valor_mensalidade = 0` mesmo não sendo bolsistas — a cobrança gerada saiu "R$ 0,00 vencido" e ficava disparando lembrete de atraso por uma dívida que não existia de verdade. Causa: no formulário "Editar dados do aluno", escolher um Plano não preenchia sozinho o campo "Valor da mensalidade" — se quem estava cadastrando esquecesse de digitar o valor, salvava com R$0. Corrigi os dois registros (ajustei pra R$160, o valor real do plano "Jogador Caro") e **também corrigi o formulário**: agora escolher um Plano preenche automaticamente o valor (ainda dá pra editar manualmente depois, pra planos com desconto tipo "Irmãos"), e um aviso de confirmação aparece se tentar salvar valor R$0 sem marcar bolsista.

**Conferido e OK (não precisou mexer):**
- Os cards "Recebido"/"A receber" do Financeiro e "Previsto no mês"/"Em atraso" do Painel usam o status da *cobrança* (não do aluno), então já estavam corretos nesse sentido — só distorcidos pelos R$0 acima.
- "Enzo de S M Baldez Machado" parecia suspeito no primeiro filtro (tem cobrança paga E inadimplente) mas na verdade são duas cobranças diferentes — a taxa de matrícula já paga, e a mensalidade de setembro seguinte genuinely em aberto. Sem bug aí.
- Não achei "Patricia Rosana Moura" no sistema — o parentesco mais próximo (família Moura/Raphael da Rosa Moura/Benjamin) já está com pagamento certinho, sem pendência. Pode ser a mãe do Benjamin (não cadastrada por nome) reclamando de uma sobreposição de horário legítima (pagou tarde da noite/de manhã, a régua roda 9h e pode ter rodado antes do pagamento cair no sistema) — não achei bug adicional aí; avisar se for outra família.

**Limitação que continua existindo (fora do escopo dessa correção):** o webhook da InfinitePay ainda não é 100% confiável — o fix de hoje impede que uma correção manual "esqueça" de liberar o aluno, mas não resolve o problema de fundo (webhook não avisar automaticamente). Enquanto isso não muda, vale continuar conferindo de vez em quando cobranças "vencido" antigas contra a InfinitePay.

## Correção: teclado do celular fechava a cada letra digitada em Anotações (2026-09-09)

- Bug relatado com vídeo: no campo "Anotações" da Ficha do aluno, o teclado do celular recolhia sozinho a cada caractere digitado.
- Causa: `CardAcao` (o componente que desenha cada cartão da Ficha — Dados, Anamnese, Contrato, Comunicação, Anotações, Financeiro) estava definido **dentro** da função do componente `Ficha`, não no nível do módulo. Isso faz o React recriar essa função a cada re-render — e como digitar no campo Anotações atualiza um `useState` local (`notas`), toda letra digitada re-renderizava `Ficha`, recriava `CardAcao` do zero, e o React desmontava/remontava **todos** os cartões (achando que era um componente diferente) — inclusive o `<textarea>` com o foco. Perder o elemento focado é o que faz o teclado do celular fechar sozinho no Android/iOS.
- Fix: movi `CardAcao` pra fora de `Ficha`, como componente de módulo (mesmo nível de `Card`, `Botao` etc.) — assim ele mantém a mesma identidade entre renders e o React só atualiza o conteúdo, sem desmontar nada.
- Verificação: assisti ao vídeo enviado (extraindo quadros com um servidor local + `<video>`/canvas, sem precisar de ffmpeg) e confirmei visualmente o padrão exato — teclado fecha a cada tecla, com a tela rolando junto (efeito colateral da remontagem).

## Correção: recorte de foto "desregulava" no zoom + edição completa da matrícula (2026-09-08)

- **Bug do zoom no recorte de foto (`frontend/src/SeletorFoto.jsx`):** a causa real não era a lógica de zoom em si, era o CSS global do Tailwind (`img { max-width: 100%; height: auto }`) sobrepondo o tamanho que o componente calculava — a imagem nunca crescia de verdade além do tamanho do círculo, então o zoom não tinha efeito visual real e a posição ficava toda desalinhada. Corrigido com `maxWidth: "none", maxHeight: "none"` explícito no estilo da imagem. Testei programaticamente (injetando uma imagem via JS no formulário público local): antes o elemento ficava travado em 260×260px não importa o zoom; depois passou a dobrar de tamanho corretamente (520×260 → 1040×520 ao ir de zoom 1x pra 2x).
- De quebra, também adicionei um **limite de arraste**: antes dava pra arrastar a foto pra fora da área e sobrar fundo cinza vazio dentro do círculo; agora o arraste é travado pra imagem sempre cobrir o círculo inteiro, e esse limite é recalculado tanto ao arrastar quanto ao mexer no zoom.
- **Edição de matrícula (`frontend/src/App.jsx`, modal "Editar dados do aluno" na Ficha):** não dava pra editar plano, valor da mensalidade nem dia de vencimento — só existiam campos do aluno em si. Adicionei os 3 campos (Plano com select vindo da tabela `planos`, Valor da mensalidade, Dia do vencimento), só aparecem quando o aluno já tem uma matrícula ativa. Ao salvar, atualiza a linha correspondente em `matriculas` além dos dados do aluno.

## Logo sem fundo branco + maior no menu lateral (2026-09-08)

- A logo original (`logo-leoezinhos.jpeg`) era um JPEG — sem suporte a transparência — com um quadrado branco/cinza-claro por trás do escudo. Ficava feio contra o fundo azul-marinho do menu lateral (e também contra o fundo "areia" da página de convite).
- Removi o fundo com Python/Pillow (preenchimento a partir dos 4 cantos, sem mexer no branco que já fazia parte do desenho — letras, bola), suavizei a borda do recorte, e salvei como `frontend/public/logo-leoezinhos.png` (com transparência de verdade).
- Troquei as 4 referências no código (`App.jsx` × 2, `Login.jsx`, `paginas/Convite.jsx`) pro `.png` novo, aumentei a logo do menu lateral (`h-14` → `h-24`) e troquei `w-14`/`w-9`/`w-20` fixo por `w-auto` em todas — a imagem tinha proporção retangular (1193×1319) e estava sendo espremida num quadrado.
- O arquivo `.jpeg` antigo continua no disco (não uso mais, mas não apaguei).

## Correção: erro "invalid input syntax for type uuid: undefined" ao salvar matrícula (2026-09-08)

- Bug relatado com o Arthur Pena: ao editar e salvar a Ficha do aluno, dava esse erro.
- Causa: a consulta `qAlunos` (`frontend/src/App.jsx`) buscava `matriculas ( valor_mensalidade, dia_vencimento, ativa, planos ( nome ) )` — sem o `id` nem o `plano_id` da matrícula. Como o salvamento faz `.eq("id", mat.id)`, com `mat.id` undefined isso virava `id=eq.undefined` na URL da requisição, e o Postgres rejeitava porque "undefined" não é um UUID válido.
- Fix: incluí `id` e `plano_id` no select de `matriculas`.

## Regra do status "pendente" — por que travava e como foi ajustada (2026-09-08)

- **O que causava:** todo aluno novo nasce com `status: "pendente"` — tanto o cadastro rápido "Novo Aluno" do painel quanto o processo público de matrícula criam assim. O problema: **não existia nenhum código em lugar nenhum que tirasse o aluno do "pendente"**. O único status que o sistema promove automaticamente é `inadimplente → ativo` (quando o pagamento é confirmado) — mas isso nunca ajudava quem estava em "pendente", porque pra virar "inadimplente" primeiro precisa ter sido "ativo". Ou seja: uma vez pendente, ficava pendente pra sempre, a não ser que alguém corrigisse manualmente no banco (foi assim que percebemos, com o caso da Nara e Nicole Santos).
- **Regra nova:** `backend/src/publico.js`, na rota de assinatura de contrato (`POST /api/publico/convite/:token/contrato`) — que é a última etapa do processo (matrícula → anamnese → contrato) — agora também promove `pendente → ativo` automaticamente assim que o contrato é assinado. Conferi os 9 alunos que estavam "pendente" hoje: nenhum tinha contrato assinado ainda, então não precisou corrigir nada retroativamente — a regra nova já cobre o que falta pra eles.
- **Ficha do aluno, campos de matrícula sempre visíveis:** os campos Plano / Valor da mensalidade / Dia do vencimento no modal "Editar dados do aluno" (`frontend/src/App.jsx`) antes só apareciam se o aluno já tivesse uma matrícula ativa — agora aparecem sempre, mesmo sem matrícula nenhuma ainda (comum em quem está "pendente"). Ao salvar, cria a matrícula se não existir, ou atualiza se já existir.

## Correção: erro 413 ao enviar a Ficha de Matrícula com foto (2026-09-03)

- Bug: formulário público de matrícula dava **"Erro 413"** ao tentar enviar quando o aluno tinha foto (relatado com o cadastro do Arthur Pena, MPAC).
- Causa: `backend/src/publico.js` usava `express.json()` sem limite — o padrão do Express é **100kb**, e a foto do rosto em base64 (mesmo só 480×480px) passa disso fácil em fotos mais "cheias" de detalhe.
- Fix: `express.json({ limit: "5mb" })` só nessa rota pública (as outras rotas do backend não recebem foto, não precisam do limite maior).
- Publicado e confirmado no container em produção.

## Correção: rolagem gigante na tela de Conversas (2026-09-01)

- Bug: a lista de contatos e a conversa não tinham nenhum limite de altura, então a tela crescia pra caber tudo — virava uma barra de rolagem enorme da página inteira em vez de rolar só dentro de cada painel.
- Fix em `frontend/src/App.jsx` (componente `Conversas`): linha da lista de contatos e o painel da conversa agora têm altura travada em `70vh` com `overflow-y-auto` cada um (rolam por conta própria). Também precisou de `min-h-0` nos containers flex internos do `ThreadConversa` — sem isso o flexbox não deixa a lista de mensagens encolher pra caber no espaço disponível, e ela vazava por cima do limite de altura mesmo assim (pegadinha clássica de `flex-1` + `overflow-y-auto`).
- Publicado em https://app-leoezinhos.menuccisd.com.br via `docker build` + `docker service update --force leoezinhos_app`.

## Auditoria da rotina de cobrança + anotações no aluno (2026-09-01)

Pedido: (1) campo Anotações no cadastro do aluno, (2) checar se o webhook de pagamento confirma quando alguém paga, (3) checar se a cobrança respeita o dia de vencimento de cada aluno (caso citado: mãe do Kaio), (4) checar se irmãos recebem uma cobrança unificada ou uma cada.

**1) Campo Anotações — ✅ feito** (ajustado em seguida com base num desenho seu). A coluna `observacoes` já existia em `alunos`, só não estava exposta em lugar nenhum. Ficou como card próprio "Anotações" na Ficha do aluno, textarea grande, posicionado ao lado da Anamnese (mesma linha, coluna da direita, logo abaixo de "Comunicação") — edição direto ali com botão "Salvar", sem precisar abrir modal. Professor vê o texto (só leitura), staff edita. `frontend/src/App.jsx` (componente `Ficha`).

**2) Webhook de pagamento — investigado, código correto, mas achado preocupante.** `POST /api/infinitepay/webhook` (`backend/src/infinitepay.js`) confere o segredo, acha a cobrança pelo `order_nsu`, marca `status=pago`, cancela lembretes de atraso na fila e reativa o aluno se estava suspenso — a lógica está certa. **Porém: nenhuma cobrança no banco tem `status='pago'` até hoje** (contagem real: `aberto: 9, vencido: 8, isento: 4, cancelado: 2, pago: 0`). Isso é suspeito — com 8 cobranças já vencidas, é esperado que pelo menos algumas já tenham sido pagas. Hipótese mais provável: links de cobrança gerados **antes** do backend ir pro ar em produção (`app-leoezinhos`/`api-leoezinhos`) guardam o `webhook_url` de então (podia ser `localhost`) — a InfinitePay nunca reenvia o webhook pra um link já emitido, então esses pagamentos específicos nunca chegariam ao nosso sistema, pra sempre. Não tenho como confirmar isso sem acesso ao painel da InfinitePay. **Ação pedida a você:** dá uma olhada no painel/app da InfinitePay e veja se alguma das cobranças "vencidas" ou "abertas" já aparece como paga lá — se sim, confirma a hipótese e a gente decide como reconciliar manualmente (não dá pra fazer isso automaticamente sem visibilidade dos pagamentos na InfinitePay). Também adicionei `console.log` no sucesso/erro do webhook (antes só logava em erro), pra próxima vez ficar visível nos logs do servidor.

**3) Dia de vencimento (caso do Kaio) — não é bug, já está certo.** O código sempre usou o `dia_vencimento` cadastrado por aluno (`gerarCobrancasDoMes`, `backend/src/infinitepay.js`) — conferi as 60 matrículas ativas hoje e todos os dias batem com o que está cadastrado (nenhum "todo mundo dia 1"). O que aconteceu com o Kaio: a mensagem de 12/08 disse "vence dia 15" (usando um valor cadastrado antes da correção), e a de 27/08 já disse "vence dia 3" (o valor certo, carregado durante a atualização de vencimentos reais em 17/08 — ver seção "Rotina automática de cobrança"). A cobrança de setembro que está aberta hoje já está com `vencimento: 2026-09-03`, certinha. Ou seja: o print que a mãe do Kaio viu era de antes da correção; não vai se repetir porque o dado já está certo agora.

**4) Cobrança de irmãos — cada aluno tem cobrança própria, não é unificada.** Confirmado com dados reais: `gerarCobrancasDoMes` roda por matrícula, não por responsável — cada aluno recebe sua própria cobrança e seu próprio link de pagamento InfinitePay (exemplo: Leonel Menucci tem cobranças independentes dos irmãos Valentim e Heleno). O que pode ter parecido "unificado": (a) irmão bolsista gera uma cobrança de R$0/isenta sem mensagem de WhatsApp — passa despercebido; (b) matrículas cadastradas depois que o dia de vencimento do mês já tinha passado (ex: matrícula criada em 12/08 com vencimento dia 15) corretamente pulam pro mês seguinte, então o primeiro boleto desses alunos só vai sair perto do dia 8/09 — ainda não aconteceu, não é bug. Não precisou mudar nada no código aqui.

### Atualização 03/09: 4 pagamentos confirmados manualmente + achado importante

Você confirmou (print de conversas do WhatsApp) que 4 responsáveis já pagaram, mas o sistema ainda mostrava a cobrança deles como vencida: **Richard Daniel** (resp. Fernanda Almeida), **João Lucas Ferreira** (resp. Lucélia), **Gael Goulart Nascimento de Aguiar** (resp. Victor Nascimento de Aguiar) e **Matheus Xavier** (resp. Nadia Xavier). Todas as 4 cobranças eram do lote "Mensalidade 08/2026" criado em 21/08 (vencimentos 25–28/08) — exatamente o lote que nunca recebeu confirmação de pagamento via webhook (ver item 2 acima).

**Reconciliei manualmente as 4** (marquei `status=pago`, `metodo="manual (reconciliação)"`, `pago_em=03/09`, cancelei lembretes de atraso na fila e voltei o status do aluno pra `ativo`) — mesma coisa que o webhook faria se tivesse funcionado.

**Atenção: sobraram outras 4 cobranças do mesmo lote (mesma suspeita, sem confirmação ainda)** — vale você checar na InfinitePay se algum desses também já foi pago:
- Antonio Barcellos (resp. Camila Chagas Duque Estrada) — venceu 27/08
- Davi dos Santos Silva (resp. Elaine Silva) — venceu 28/08
- João Miguel Silva Oliveira (resp. Yasmim Carvalho Silva Costa Oliveira) — venceu 25/08
- Thomas Sant Ana Oliveira (resp. Raiane da Silva Sant Ana Oliveira) — venceu 28/08

**Limitação importante pra você saber:** o app não tem hoje nenhuma forma de *perguntar* pra InfinitePay "essa cobrança já foi paga?" — só sabe quando a própria InfinitePay avisa via webhook, e esse webhook não está confiável (ver item 2). Enquanto isso não for resolvido, o ideal é você mesma dar uma conferida na InfinitePay de vez em quando nas cobranças que aparecem como "aberto"/"vencido" no Financeiro, principalmente as mais antigas — não dá pra eu confirmar isso sozinho sem essa checagem sua.

```
SUPABASE_URL / SUPABASE_SERVICE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY
UAZAPI_URL / UAZAPI_TOKEN
INFINITEPAY_HANDLE_INSA / _MPAC / _KARATE
WEBHOOK_SECRET
```

Os tokens da uazapi que passaram por chat devem ser rotacionados.

## Rotina automática de cobrança — ATIVADA em 2026-08-17

`ROTINA_COBRANCA_ATIVA=true` (local e produção) a partir de 2026-08-17, a pedido explícito da Priscila — depois de atualizar o dia de vencimento real de cada aluno (ver abaixo), ela pediu pra ligar a rotina (antes rodava manual/InfinitePay antigo; combinamos esperar setembro, mas ela decidiu adiantar). **A partir de agora o cron roda de verdade**: gera cobrança 7 dias antes do vencimento (07h) e manda lembrete de atraso (09h), horário América/São Paulo. Karatê continua sem cobrir (handle com erro na InfinitePay, ver tabela acima).

### Vencimentos reais por aluno (doc "FUTEBOL –AGOSTO de 2026 Laíse.docx", 2026-08-17)

Priscila/Laíse passaram o dia real de vencimento de cada aluno (era todo mundo no dia 15 por padrão da migração — agora cada um tem o dia certo). Atualizado em `matriculas.dia_vencimento` pra 34 alunos do INSA (bolsistas não têm cobrança, não precisavam de ajuste). **Exceção pedida à parte**: Josué Lima de Freitas da Rocha — a mãe (Rosi) pediu pra mudar de dia 06 pra **dia 20**, já aplicado.
- Richard Daniel: o doc pedia dia 30, mas o sistema só aceita até dia 28 (trava pra não cair em mês sem esse dia) — ajustado pra 28, mais próximo possível.
- MPAC não estava nesse documento — continua todo mundo no dia 15 (padrão da migração), não mexido.
- **Alunos que aparecem no doc mas ainda não estão cadastrados** (sem telefone, não dá pra cadastrar sozinho): **Gael Aguiar** (mãe/pai Vitor Aguiar — resolve a suspeita antiga sobre "Vitor Aguiar Gael" no relatório da InfinitePay: é um Gael diferente dos 2 que já tínhamos), **Davi Marques Vicente Lopes** (resp. Anna Marques), **João Lucas Ferreira** (resp. Lucelia Ferreira da Silva).

## Reconciliação com a InfinitePay (2026-08-12)

A Priscila passou 2 relatórios PDF das cobranças recorrentes reais (INSA/Paty e MPAC/Miguel Pereira) pra conferir os planos e cobranças já migrados. Resultado: dados majoritariamente corretos, com ajustes pontuais já aplicados (ex.: plano do Pedro/Bento corrigido). Confirmados os bolsistas contra a lista original do Kommo — bate, com uma exceção sinalizada:
- **José Alfredo**: marcado como bolsista (`isento`) no sistema, mas aparece cobrado normalmente no relatório da InfinitePay — flagado pra Priscila, sem correção feita ainda (aguardando confirmação de qual é o dado certo).
- **Alunos ativos no sistema que não apareciam em nenhum relatório de recorrência** (11 nomes, excluindo bolsistas e o Leonel, que é caso conhecido à parte): Priscila confirmou a lista em 2026-08-12, mantendo só **João Pedro Davi Bueno** ativo. Os outros 10 foram marcados `status='inativo'`: Arthur, Cauã Mello Barreto Viana, Enzo Baptista, Gael, Gael costa, Gael Goulart Nascimento de Aguiar, Lead #26255864, Lorenzo Rispoli, Mathias Carius marinho de Oliveira, Théo Carvalho da Costa Ferreira. ✅ feito.
- **Rafael De Araújo Conceição** (responsável do Thomas Carvalho de Araújo): telefone cadastrado no sistema falhou no envio de WhatsApp ("não está no WhatsApp") — flagado, sem número substituto ainda.

## Atualização de cadastros MPAC/INSA (2026-08-12/13)

Priscila passou listas estruturadas (aluno/plano/valor/telefone/responsável) do MPAC e do INSA pra conferência final. Cruzado com o banco e com os relatórios PDF da InfinitePay:

- ✅ **José Alfredo não é bolsista** — resolvido o achado anterior. A matrícula dele já estava correta (plano Irmãos Boleiros, R$150, junto com o irmão João Arthur), só a flag `bolsista` do cadastro estava errada (`true`). Corrigida pra `false`.
- ✅ **Telefone do Rafael De Araújo Conceição corrigido** — resolvido o problema de WhatsApp não entregar (número antigo tinha um dígito trocado).
- ✅ **16 alunos novos cadastrados** (responsável + aluno + matrícula, status `pendente` por falta de turma definida — falta só a Priscila indicar a turma/horário de cada um): MPAC — Théo Damasceno, Nara Santos, Nicole Santos, Arthur Penna, Emanuel Borges. INSA — Davi dos Santos Silva, Henrique Ornellas, Kaleb Monteiro, Pedro Neto, Tomas Doro, João Pedro Monteiro, Richard Daniel (plano Migué), Matheus Xavier, Nicolas Moura Rosa, Davi Justo Borba, Fábio Silva.
- ✅ **Davi Neves**: anotado em `observacoes` que agosto e setembro/2026 já foram pagos antecipado — só cobrar a partir de outubro.
- ✅ Confirmado: os 7 alunos que a Priscila pediu pra inativar (filhos de Thayná Bianco dos Reis, Johnson Vitório de Oliveira Francelino, Telma Cristina Carvalho Silva Ferreira, Samara costa, Anderson Baptista, Érica Lopes, Lorena) **já estavam todos inativos** — coincide exatamente com os 10 marcados inativos no dia anterior + 1 que já estava inativo desde antes.
- Registros que já existiam e bateram por telefone (não duplicados): Bernardo Souto Ferreira Chagas, João Pedro mello (Brites), Bento + Pedro Queiroz Curityba, João Arthur + José Alfredo Montes.

## Mensagens automáticas (2026-08-13)

Reescritas com tom mais caloroso (baseado no doc "App futebol 2026.docx" que a Priscila passou) e citando o nome do aluno quando disponível:
- `backend/src/convites.js`: as 5 mensagens de convite (matrícula, anamnese, experimental, contrato, processo) agora citam o nome do aluno. A mensagem de boas-vindas (`processo`) também cita a **escola certa por unidade** — "Leõezinhos de Paty" (INSA) vs "Leõezinhos do MPAC" (MPAC), via `nomeEscola(unidade)`. Unidade vem de `aluno.turmas.locais.nome` (ou `experimentais.turmas.locais.nome`); se desconhecida, cai no genérico "Leõezinhos".
- `backend/src/infinitepay.js`: tirado o "OSS!" (saudação de karatê) da mensagem de cobrança mensal — trocado por "Até a próxima aula! ⚽". Régua de inadimplência: dia 1 mais leve, dia 10 reforça a cláusula contratual dos 30 dias de suspensão.

## Formulário de aula experimental + convite pela tela de Conversas (2026-08-13)

- O formulário público de aula experimental (`Experimental.jsx`) ganhou o campo **"Dia e horário que pretende ir"** (`data_aula`, datetime-local) — antes só dava pra editar isso depois, pelo painel. Backend (`publico.js`) aceita e grava o campo.
- Tela **Conversas**: novo botão **"Enviar Convite Aula Experimental"** no cabeçalho da conversa (`ThreadConversa`), disponível pra qualquer contato (cadastrado ou não). Cria um convite tipo `experimental` (token público, sem vincular a nenhum registro) via `POST /api/convites` e enfileira a mensagem manualmente com o link, reaproveitando o telefone já conhecido da conversa.

## Aviso de aniversário no grupo interno da equipe (2026-09-21)

Além da mensagem de parabéns pro responsável, o cron diário de aniversário (`backend/src/aniversarios.js`, roda 8h América/São Paulo) agora também avisa um **grupo interno do WhatsApp** (só equipe, aluno não participa), com a foto do aluno colada numa arte de aniversário.

- **Grupo**: "Aniversário dos alunos Leões🦁🎈🥳", JID `120363428162669196@g.us` (nosso número já é admin do grupo — não precisou entrar, só descobrir o JID). Guardado em `UAZAPI_GRUPO_ANIVERSARIO_JID` (local e produção).
- **Como descobrir o JID de um grupo pelo link de convite**: `POST {UAZAPI_URL}/group/inviteInfo` com `{invitecode: "<link ou código>"}` e header `token` — retorna o objeto do grupo com `JID`, sem precisar entrar nele. Pra enviar mensagem pro grupo, usa esse JID direto como `number` em `/send/text` ou `/send/media`.
- **Composição da imagem** (`backend/src/aniversarioImagem.js`, usa `sharp`): recorta a foto do aluno em círculo e cola por cima do template `backend/templates/aniversario-template.jpg` (arte fornecida pela Priscila). Coordenadas do círculo: centro `(744, 837)`, raio `262`. **Atenção**: a primeira estimativa (feita "no olho" com grid visual) deu `(792, 787)` raio `188` — parecia certa numa checagem visual rápida, mas deixava um gap visível (principalmente embaixo) quando testado de verdade. Corrigido varrendo os pixels do template programaticamente (`medir-circulo.mjs`, descartável — não faz parte do projeto) pra achar onde o anel dourado realmente começa em 4 direções e resolver o centro/raio reais por geometria. Se essa arte for trocada no futuro, repetir esse processo de medição por pixel em vez de estimar visualmente. Sem foto cadastrada, manda só o texto.
- Imagem gerada sobe pro bucket público `eventos` (reaproveitado, não criei bucket novo), path `aniversarios/{aluno_id}-{timestamp}.jpg`.
- **Pegadinha de deploy**: `docker service update --force` NÃO relê o `.env` (o `env_file` do `stack.yml` só é recarregado por `docker stack deploy`). Se adicionar/mudar variável de ambiente, o deploy tem que ser `docker stack deploy -c stack.yml leoezinhos --resolve-image never` (rodado de dentro de `~/leoezinhos/backend` na VPS) — só assim a variável nova chega no container.
- Testado com envio real pro grupo (foto do Bernardo S Duarte, já que o aniversariante do dia — João Miguel Silva Oliveira — ainda não tem foto cadastrada).
- **Tratamento da foto (2026-09-21, a pedido da Priscila)**: a foto agora é aproximada e o fundo desfocado nas bordas, pra parecer mais com um retrato (referência: uma versão que a Priscila fez no ChatGPT pra comparação). **Não usamos detecção de rosto de verdade** (evita depender de libs nativas pesadas tipo `canvas`/TensorFlow no build Alpine do Docker) — em vez disso: `sharp.strategy.attention` escolhe a região mais "detalhada" da foto (geralmente o rosto) ao cortar pro quadrado, aplicamos um zoom extra de `1.55x` sobre isso, e desfocamos as bordas com um gradiente radial (nítido no centro, borrado a partir de ~45% do raio). Testado em 4 fotos diferentes — funciona bem na maioria, mas por não ser detecção de rosto de verdade, alguma foto ocasional pode cortar um pouco de mais/menos (testado: zoom 1.8x cortava o queixo em fotos com o rosto mais baixo no enquadramento; 1.55x ficou equilibrado). Se no futuro aparecerem fotos com resultado ruim, considerar face detection de verdade (custo: mudança maior no Dockerfile ou API paga de terceiro).

## Relatório de repasse mensal (2026-09-29, a pedido da Priscila)

Todo mês a Priscila manda pra escola (INSA/MPAC) a lista de quem pagou, pra calcular o repasse de 30% — hoje fazia isso numa planilha manual. Agora tem um botão em **Financeiro → "Relatório de repasse"** que gera um PDF (abre numa aba nova, pronta pra imprimir/salvar).

- **Backend**: `backend/src/relatorios.js`, rota `GET /api/relatorios/repasse?unidade=INSA&mes=8&ano=2026` (autenticada). Filtra `cobrancas` com `status='pago'` e `local_id` da unidade, usando o **mês do `vencimento`** como mês de referência — não a data em que foi paga (`pago_em`), porque uma mensalidade de agosto paga em setembro (atraso/reconciliação manual) continua sendo "de agosto" pro repasse. Isso é o mesmo padrão já usado no `gerarCobrancasDoMes` (o `vencimento` é gerado dentro do mês de referência).
- PDF gerado com `pdfkit` (já era dependência, usada no contrato) — não sobe pro Storage, é gerado na hora e devolvido direto na resposta (`Content-Type: application/pdf`), não precisa de bucket nem link assinado.
- Agrupa por turma (dias+horário) com subtotal de cada uma, total geral e o cálculo do repasse (30%, fixo por enquanto — se algum dia o percentual variar por unidade, dá pra virar configurável).
- **Frontend**: `abrirPdfAutenticado()` (App.jsx) faz o fetch com o token de auth (rota não é pública) e abre o PDF numa aba nova via blob — diferente do `apiPost`/`apiGet` que esperam JSON.
- Testado com dados reais (INSA, agosto/2026) antes de publicar — 8 cobranças, 2 turmas, total e repasse batendo.

## Observação em Conversas/Oportunidades + Fila de mensagens + aviso de remarcação (2026-09-29)

- **Campo `observacao`** (texto livre) adicionado na tabela `conversas` — editável tanto na tela **Conversas** (dentro da conversa aberta) quanto na listagem de **Oportunidades** (direto no card, sem precisar abrir a conversa). Salva sozinho ao sair do campo (`onBlur`), sem botão de salvar.
- **Nova tela "Fila de mensagens"** (`Fila()` em App.jsx, consulta `mensagens` com `status='na_fila'`): lista tudo que está agendado pra sair no WhatsApp (cobrança, convite, lembrete, aniversário) com botão **Cancelar** por mensagem. Cancelar só funciona enquanto ainda está `na_fila` (`.eq("status","na_fila")` na própria query de update — evita cancelar algo que o worker já pegou pra enviar).
- **Aviso automático de remarcação de aula experimental**: em Experimental, ao editar a data de uma aula (`CardExperimental`) e salvar, se a data realmente mudou, dispara uma mensagem pro responsável confirmando o novo horário (`tipo: "reagendamento_experimental"`). Só dispara se a data mudou de verdade (evita mensagem à toa ao só reabrir/fechar o editor) e só se uma data válida foi definida (limpar a data não manda nada).
- Tudo isso é direto Supabase (sem endpoint novo no backend) — só o `apiAuth`/`abrirPdfAutenticado` do relatório de repasse usa o backend.
- Testado com dados isolados/fictícios antes de publicar (não dá pra testar clicando de verdade sem logar como usuário real, e alguns fluxos aqui geram mensagem de WhatsApp de verdade pra família — evitado de propósito).

## Contagem de aulas dadas por professor (2026-09-29, a pedido da Priscila)

A negociação com professor é por aula dada no mês, então precisava contar isso. **Reaproveitei a tabela `aulas`** — já existia no schema original (`turma_id`, `professor_id`, `data`, `realizada`) mas nunca tinha sido usada em lugar nenhum do app.

- **Migração**: `turma_id` virou opcional (`ALTER TABLE aulas ALTER COLUMN turma_id DROP NOT NULL`) — não tem UI ainda pra vincular professor↔turma (tabela `professores_turmas`, também nunca usada), e a Priscila só precisa do **total do mês**, não de qual turma. Se um dia precisar detalhar por turma, a coluna já existe, só falta a UI de vínculo.
- Em **Professores**, cada card tem uma seção "Aulas do mês" (fecha/abre) com navegação de mês (◀▶), contagem de aulas e o valor total (nº de aulas × `valor_hora_aula` do professor), lista das datas registradas, e um campo de data + botão "Registrar aula".
- **Editar/registrar/apagar é só pra equipe** (`role !== "professor"`) — o professor (se tiver login) só vê a contagem, não mexe nela, pra evitar autodeclaração sem checagem. Se a Priscila preferir que o próprio professor registre as aulas que deu, é só tirar essa trava.
- Sem trava de "1 aula por dia" — um professor pode dar mais de uma aula no mesmo dia (turmas diferentes), então registrar duas vezes na mesma data é permitido de propósito.
- Testado direto no banco (insert/consulta/delete simulando exatamente a query do front) com o professor real William Ponciano Baltar antes de publicar, e limpo os dados de teste depois.

## Tela de Configurações + catálogo de Categoria (2026-09-29, a pedido da Priscila)

Nova tela **Configurações** (só pra equipe, fora do menu do professor) com 5 abas: Turmas, Categorias, Locais, Planos, Professor × Turma.

- **Turmas/Categorias/Locais/Planos**: CRUD simples (criar, editar, ativar/desativar). Desativar em vez de apagar de verdade — essas tabelas são referenciadas por alunos/matrículas/cobranças, apagar quebraria a integridade.
- **Professor × Turma**: usa a tabela `professores_turmas` (existia no schema, nunca usada) — botões pra marcar quais turmas cada professor dá aula.
- **Nova tabela `categorias`** (`nome`, `ativo`) — a categoria do aluno/experimental era texto livre até aqui, e os dados reais tinham a mesma categoria escrita de 2-3 jeitos diferentes (`"Sub 6"`, `"Sub06"`, `"sub 12"`, `"Sub 12"` etc.). **Normalizei os dados existentes** pros 6 valores corretos (Sub 6/7/9/11/12/13) e troquei os 3 campos de texto livre de categoria (novo aluno, editar aluno, nova experimental) por `select` puxando dessa tabela — a coluna `categoria` em `alunos`/`experimentais` continua sendo texto (guarda o nome, não o id), só o input que virou controlado.
- Testado com insert/update/delete simulando as queries do front pra cada tabela nova, direto no banco (não dava pra clicar de verdade, sessão de login não persistiu na sessão de testes) — tudo limpo depois.

## Filtro por turma em Alunos (2026-10-01)

Dropdown "Todas as turmas" ao lado dos botões de unidade — a lista de opções já filtra pela unidade selecionada (INSA/MPAC/Karatê escolhida primeiro, turma depois).

## Correções na fila de mensagens (2026-10-01, a pedido da Priscila)

A Priscila reportou mensagens "presas" na fila, passando da hora programada. Investigando (`backend/src/worker.js`), achei duas causas de atraso que já eram **intencionais** (não bugs) e um bug real:

- **Pausa de 6h por resposta humana** (`em_atendimento_humano`): quando o responsável manda mensagem no WhatsApp, a fila pausa pra aquele telefone por 6h — existe pra não cruzar uma rotina automática com uma resposta recente da família. Um convite de matrícula atrasou ~7h porque a resposta foi recebida bem no meio da espera, resetando o contador.
- **Janela de envio (8h-21h)**: a rotina de cobrança roda 7h da manhã (`gerarCobrancasDoMes`, cron `0 7 * * *`), mas o envio só começa às 8h — por isso cobranças geradas nesse horário sempre esperam ~1h antes de sair. Comportamento esperado, não corrigido.
- **Bug real encontrado**: uma mensagem de 21/08 ficou travada pra sempre em `status='enviando'` — o servidor caiu/reiniciou (provável deploy) bem no meio do envio dela, e como a consulta principal só olha `status='na_fila'`, ela nunca mais seria pega. **Cancelada manualmente.**

Correções em `worker.js`:
- **`recuperarTravadas()`**: roda em todo tick do cron (a cada minuto, inclusive fora da janela 8h-21h — só destrava, não manda nada), detecta mensagens em `enviando` há mais de 15min (`LIMITE_TRAVADA_MS`) e devolve pra `na_fila` (ou `falhou` se já bateu o limite de tentativas). Não precisou de coluna nova — usa o próprio `agendada_para` como referência de "há quanto tempo deveria ter sido processada".
- **`TIPOS_SEM_PAUSA`**: a pedido explícito da Priscila/Laíse, mensagens de ação manual da equipe (`manual`, `convite_processo`, `convite_matricula`, `convite_anamnese`, `convite_experimental`, `convite_contrato`, `reagendamento_experimental`) **não respeitam mais a pausa de 6h** — faz sentido só pra rotina automática (cobrança, lembrete, aniversário), não pra algo que a equipe decidiu mandar agora. A janela de envio (8h-21h) continua valendo pra todo mundo, isso não foi pedido pra mudar.
- Testado: recuperação de travada simulada com registro isolado (telefone falso, nunca chega a mandar de verdade) antes de publicar.

## Pendências de informação

- **João Miguel Silva Oliveira sem foto cadastrada** — a mensagem de aniversário pro grupo interno sai só com texto pra ele até alguém subir uma foto pelo cadastro do aluno no app.

- **"Arthur" duplicado?** O sistema tem um "Arthur" (responsável Lorena, já inativo). A nova lista da Priscila traz outro "Arthur" pagante (responsável **Janine Cabral**, tel. (21) 97987-1251) — telefone e responsável diferentes. Pode ser o mesmo aluno com o responsável errado no cadastro, ou um aluno diferente. **Não cadastrado ainda — aguardando a Priscila confirmar.**
- **"Bernardo S. Duarte" duplicado?** "Bernardo Souto Ferreira Chagas" (mãe Maira Chagas) já está cadastrado. A nova lista também traz "Bernardo S. Duarte" com responsável **José Mario Bernardo S Duarte** e telefone diferente — pode ser o pai do mesmo menino ou um Bernardo diferente. **Não cadastrado ainda — aguardando confirmação.**
- **Nara e Nicole Santos**: a cobrança é de R$160 total pro par (uma delas tem bolsa 100%) — cadastrei as duas provisoriamente com plano Jogador Caro cheio; falta a Priscila dizer **qual das duas é a bolsista** pra corrigir.
- **Leonardo Emanuel Baltar** (MPAC): aparece no relatório da InfinitePay mas não veio na lista mais recente da Priscila — sem telefone, não cadastrado ainda.
- Karatê: motivo de a InfinitePay recusar geração de link mesmo com handle certo e checkout habilitado.
