# Como fazer uma assinatura eletrônica "de verdade" valer em contrato

Guia genérico (não é específico deste projeto) pra reaproveitar em qualquer app que precise
que alguém assine um documento pela internet — contrato, autorização de imagem, termo de
responsabilidade, etc. — e essa assinatura precisar segurar juridicamente se um dia for
contestada.

## O princípio

Um clique em "Eu concordo" ou nome digitado sozinho não prova nada. O que dá validade
jurídica pra uma assinatura eletrônica simples (a mesma lógica que DocuSign, Clicksign,
HelloSign etc. usam nos planos não-certificados, e que a legislação brasileira — MP
2.200-2/2001 — aceita como válida quando as partes convencionaram aceitar) é conseguir
provar, depois, 4 coisas ao mesmo tempo:

1. **Quem** assinou (identificação — nome + CPF, idealmente)
2. **O quê** foi assinado (o conteúdo exato, palavra por palavra, sem poder ser alterado depois)
3. **Quando** foi assinado (timestamp que a pessoa não controla)
4. **De onde/como** foi assinado (IP + dispositivo/navegador — contexto que corrobora que foi
   aquela pessoa mesmo, não alguém preenchendo o nome dela)

Se qualquer uma dessas 4 faltar, fica muito mais fácil alguém alegar "não fui eu" ou "não foi
isso que eu assinei" depois. O resto deste guia é só a receita técnica de como capturar essas
4 coisas de um jeito que não dá pra fraudar depois.

## A receita, passo a passo

### 1. Nunca deixe o cliente calcular ou enviar nada que vire "prova"

Tudo que é prova (timestamp, IP, hash) tem que ser calculado **no servidor**, nunca vir do
`body` da requisição. Se o timestamp vier do navegador da pessoa, ela podia mandar qualquer
data. O único dado que a pessoa manda é o nome digitado (`nome_assinante`) e um "sim, autorizo
X" quando aplicável.

```js
// no servidor, nunca confie em nada que não seja isso:
const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;
const userAgent = req.headers["user-agent"];
const assinadoEm = new Date().toISOString(); // relógio do servidor, não do cliente
```
Nota: `x-forwarded-for` só existe se o app estiver atrás de um proxy/load balancer (Traefik,
nginx, Cloudflare...). Sempre pegue o **primeiro** IP da lista (é o do cliente original; os
demais são dos proxies intermediários). Sem proxy, `req.socket.remoteAddress` já basta.

### 2. Mostre o texto completo ANTES de pedir a assinatura

Óbvio, mas fácil de esquecer: a pessoa precisa poder ler o contrato inteiro antes de assinar,
não só um resumo. Uma rota pública separada (sem exigir login) que devolve o texto final já
com todas as variáveis preenchidas (nome, valores, datas — só sem os dados da própria
assinatura, que ainda não existem) resolve isso. Sem essa etapa, é fácil alegar depois "eu não
sabia o que estava assinando".

### 3. Gere o texto final ANTES de calcular o hash, com placeholders pro que só existe depois

Isso é o pulo do gato que não é óbvio de primeira: o hash deve cobrir **o conteúdo do
acordo** (as cláusulas, valores, nomes, datas do contrato em si) — não precisa (e não deve)
cobrir o IP/user-agent, porque esses são metadados *sobre* o evento de assinatura, não fazem
parte do que foi combinado. Se você incluir o IP dentro do texto que vira hash, qualquer
diferença de proxy/rede muda o hash sem o conteúdo do contrato ter mudado nada — polui a prova.

```js
// 1) monta o texto com placeholders pro que só dá pra saber na hora de assinar
let texto = `
  ...cláusulas do contrato com todas as variáveis já preenchidas...

  Assinado eletronicamente em {{__DATA__}}, a partir do IP {{__IP__}},
  dispositivo {{__UA__}}.
  Hash de integridade deste documento: {{__HASH__}}
`;

// 2) calcula o hash SOBRE o texto ainda com os placeholders de IP/UA/hash
//    (ou seja: o hash representa "essas cláusulas, esses valores, esse texto exato")
const hash = crypto.createHash("sha256").update(texto).digest("hex");

// 3) só DEPOIS substitui os placeholders pelos valores reais, pro PDF final
const textoFinal = texto
  .replace("{{__DATA__}}", assinadoEm)
  .replace("{{__IP__}}", ip)
  .replace("{{__UA__}}", userAgent)
  .replace("{{__HASH__}}", hash);
```

O hash SHA-256 fica **impresso dentro do próprio PDF**, em texto legível. Isso é importante:
não adianta o hash existir só no banco de dados — ele precisa estar visível no documento que a
pessoa recebe, porque é isso que permite qualquer um (advogado, perito, a própria pessoa)
pegar o PDF anos depois, recalcular o hash do conteúdo e confirmar que ele não foi alterado
depois de assinado.

### 4. Guarde o arquivo final de um jeito que não dá pra reescrever por cima

- Suba o PDF pra um bucket de storage **privado** (não público), com um nome que não colide
  (ex: `contratos/{id-da-pessoa}-{timestamp}.pdf`).
- Nunca ofereça um jeito de sobrescrever esse arquivo específico depois de gerado. Se precisar
  re-assinar (ex: dados errados), gere um arquivo NOVO, não edite o antigo.
- Pra dar acesso ao PDF (mandar por WhatsApp/e-mail, por exemplo), gere uma **URL assinada com
  validade curta** (7 dias, por exemplo) em vez de deixar o arquivo público pra sempre — reduz
  o tempo que um documento com CPF/RG/endereço fica exposto se o link vazar.

### 5. Grave uma linha de auditoria separada do arquivo, na tabela do banco

O PDF é o documento; a linha no banco é a prova de auditoria (mais fácil de consultar,
sobrevive independente do arquivo). Campos mínimos:

| Campo | Por quê |
|---|---|
| `assinante_nome` | quem disse que assinou (o que a pessoa digitou) |
| `assinante_cpf` (ou outro doc de identidade) | liga a assinatura a uma identidade real, não só um nome |
| `assinado_em` | timestamp do servidor |
| `ip` | de onde veio a requisição |
| `user_agent` | navegador/dispositivo usado |
| `hash_sha256` | fingerprint do conteúdo exato que foi assinado |
| `arquivo_url` (ou caminho no storage) | onde está o PDF gerado |

## Checklist rápido pra implementar num projeto novo

- [ ] Rota pública de **pré-visualização** do documento completo, sem exigir assinatura ainda
- [ ] Rota de **assinatura** que só aceita o nome digitado (+ eventuais checkboxes de consentimento) — nada de IP/data/hash vindo do cliente
- [ ] IP e user-agent capturados **no servidor**, do header da requisição
- [ ] Timestamp gerado **no servidor** (`new Date()`), nunca recebido do cliente
- [ ] Hash SHA-256 calculado sobre o texto final do acordo, **com placeholders** de IP/UA/hash ainda não preenchidos
- [ ] Hash impresso em texto legível dentro do PDF final
- [ ] PDF salvo em storage privado, nome não sobrescrevível, acesso via URL assinada com validade
- [ ] Linha de auditoria na tabela do banco com nome, documento de identidade, timestamp, IP, user-agent e hash
- [ ] Reassinatura gera arquivo novo, nunca edita o antigo

## Quando isso NÃO é suficiente

Esse padrão cobre "assinatura eletrônica simples", que é o suficiente pra maioria dos
contratos comerciais do dia a dia (matrícula, prestação de serviço, termo de uso de imagem
etc.). Pra alguns casos — contratos que a lei exige forma específica, processos judiciais,
alguns contratos societários/imobiliários — pode ser necessário assinatura digital
certificada (ICP-Brasil), que é outra tecnologia (certificado digital emitido por autoridade
certificadora) e não é coberta por este guia. Na dúvida sobre um caso específico, vale
confirmar com um advogado se a assinatura simples é suficiente pro tipo de documento em
questão.
