> **Atenção (26/10/2026):** os números deste prompt (meta de 500 kg, ração por dia, voluntários, medidor até 200 mil tampinhas) vêm do primeiro protótipo e foram substituídos pelos dados da ONG. Veja docs/decisions/0003-ngo-survey-data.md.

# Prompt de construção: site e painel da Patinhas Carentes Joinville

> Como usar: coloque este arquivo na raiz do repositório (ou cole no início da conversa com o Claude Code) junto com a pasta `reference/prototype/` e a pasta `seed/`. Trabalhe **fase por fase** (seção 12). Não peça tudo de uma vez.

---

## 1. Seu papel

Você é o **engenheiro de software sênior** deste projeto. Você projeta, implementa, testa e documenta. Decide com critério técnico, explica as trocas em poucas linhas e só pergunta quando a decisão é do dono do projeto (seção 14).

Regras de trabalho:

1. **Planeje antes de codar.** No início de cada fase, escreva um plano curto (o que será feito, arquivos, riscos) e só então implemente.
2. **Entregue em fatias pequenas e funcionando.** Cada fatia tem testes, passa no lint e no type-check, e vira um commit.
3. **Não invente fatos.** Versões de bibliotecas, APIs e opções de configuração: confira na documentação oficial na hora de instalar. Não fixe versões "de memória".
4. **Não copie o protótipo.** Ele é a especificação visual e de comportamento. Reescreva o código com a arquitetura deste documento.
5. **Se algo bloquear, pare e diga o quê.** Não esconda um problema com gambiarra.

---

## 2. O projeto

**Cliente:** ONG **Patinhas Carentes Joinville** (sem fins lucrativos, sem abrigo; rede de protetores e lares temporários). Projeto de extensão da Univille (Engenharia de Software). A responsável da ONG é a **Ana** (presidente).

**Objetivo:** um site público que faz a ONG arrecadar tampinhas plásticas, ganhar lares temporários e prestar contas, mais um **painel da equipe** para manter o conteúdo sem programar.

**Como a ONG ganha dinheiro:** recebe tampinhas em pontos de coleta, envia para reciclagem e usa o valor em ração, vacina, castração e atendimento veterinário.

**Público do site:** pessoas comuns, muitas no celular, algumas idosas. Linguagem simples, botões grandes, acessibilidade a sério.

**Idioma do produto:** textos da interface em **português do Brasil**. Todo o resto (código, nomes de arquivos, banco, API, commits, comentários, documentação técnica) em **inglês**. Veja a seção 5.

### Protótipo (fonte da verdade visual e de comportamento)

- `reference/prototype/index.html` (HTML único, 7 telas públicas, login e painel da equipe) e `reference/prototype/LEIA-ME.md`.
- Leia o protótipo inteiro antes da Fase 5. O que é **real** e o que é **exemplo** está no `LEIA-ME.md`: os 166 pontos, bairros, WhatsApp, Instagram, regras do "pode e não pode", telefones de denúncia e produtos da loja são reais; os 128 kg do mês, os pedidos do painel, os meses publicados e as histórias são **dados de exemplo**.

---

## 3. Escopo

### Dentro do escopo

**Site público (pt-BR):**

| Página | O que faz |
|---|---|
| Início | Faixa de números, **medidor de impacto**, **buscador de pontos de coleta** (mapa + lista, por geolocalização ou bairro), "pode / não pode", chamadas, Instagram |
| Escolas e empresas | Passo a passo, **cartaz imprimível com QR code**, mensagem pronta, formulário de pedido |
| Como ajudar | Lar temporário (formulário), adoção (link externo para o Adoteca), Loja Patinhas (WhatsApp), feirinhas, doação em dinheiro (WhatsApp) |
| Prestação de contas | "Para onde vai a tampinha", total do mês, meta da castração |
| Denúncia | Telefones 181 e 190, portal da prefeitura, passo a passo |
| Histórias | Lista e detalhe |
| Privacidade | Texto de privacidade (LGPD) |

**Painel da equipe (`/admin`):** login, visão geral, pontos de coleta (CRUD), solicitações (listar, filtrar, marcar como respondida), prestação de contas (registrar mês, publicar, **gerar imagem para o Instagram**), histórias (CRUD com foto), usuários, configurações do site.

**API REST própria** (Node + banco), documentada com OpenAPI.

### Fora do escopo (não construir)

- Pagamento online, Pix integrado, e-commerce da loja, cadastro público de usuários, comentários, newsletter.
- Cadastro dos animais para adoção (continua no Adoteca).
- Aplicativo mobile.
- Integração com Instagram por API (o painel só **gera a imagem e a legenda**; a Ana publica manualmente).

---

## 4. Stack e justificativas

Decisões já tomadas. Para cada item, use a **versão estável mais recente** no momento da instalação e confira compatibilidade entre as peças.

### Backend (`apps/api`)

| Item | Escolha | Por quê |
|---|---|---|
| Runtime | **Node.js LTS (alvo: 24)** com `engines` aceitando `>=22` | Em 2026, Node 22 e 24 recebem correções de segurança; Node 26 vira LTS no fim de 2026. Confirmar a versão que o servidor da Univille permite. |
| Linguagem | **TypeScript** em modo `strict`, ESM | Segurança de tipos na API e nos esquemas |
| Framework HTTP | **Fastify 5** | Validação por esquema, logging com Pino embutido, plugins encapsulados, tipos nativos. O repositório oficial `fastify/demo` mostra a estrutura recomendada. |
| Validação | **Zod** + provider de tipos para Fastify | Os mesmos esquemas podem ser compartilhados com o frontend (`packages/shared`) |
| Banco | **PostgreSQL** (padrão). Se o servidor só oferecer outro (MySQL ou SQLite), o ORM permite trocar | Integridade, `CHECK`, transações |
| ORM e migrações | **Prisma** | Um único arquivo de schema, migrações integradas, troca de banco mais simples que um ORM com tabelas por dialeto. Alternativa avaliada: Drizzle (mais leve, mais próximo do SQL). |
| Autenticação | **Sessão em cookie** (`HttpOnly`, `Secure`, `SameSite=Lax`) | Site e API ficam no mesmo domínio atrás do Nginx; sessão é revogável e evita guardar token no navegador |
| Hash de senha | **`scrypt` do módulo `node:crypto`** (como no `fastify/demo`) | Zero dependência nativa, importante em servidor restrito |
| Segurança | `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/cors` (só se necessário), `@fastify/cookie` | |
| Upload | `@fastify/multipart` | Foto das histórias |
| Docs da API | `@fastify/swagger` + `@fastify/swagger-ui` | Rota de docs só em desenvolvimento ou protegida |
| Logs | **Pino** (já no Fastify), com redação de dados pessoais | |
| Testes | **Vitest** + `app.inject()` do Fastify, banco de teste real | Testes de integração rápidos, sem subir porta |
| Qualidade | **ESLint 9 (flat config)** + **Prettier** + `tsc --noEmit` | |

### Frontend (`apps/web`)

| Item | Escolha | Por quê |
|---|---|---|
| Base | **React + Vite + TypeScript** | Já decidido pelo grupo |
| Rotas | **React Router** | |
| Dados do servidor | **TanStack Query** | Cache, loading e erro padronizados |
| Formulários | **React Hook Form** + Zod (esquemas de `packages/shared`) | |
| Mapa | **Leaflet** com **react-leaflet**, tiles do OpenStreetMap | Substitui o mapa SVG feito à mão do protótipo. Manter o crédito "© OpenStreetMap contributors". |
| QR code | Biblioteca pequena de QR em SVG | |
| Estilo | **CSS Modules** + **design tokens em variáveis CSS** | Sem framework pesado; as cores e fontes vêm do protótipo |
| Testes | **Vitest** + **Testing Library**; e2e opcional com **Playwright** | |

### Monorepo e ferramentas

- **npm workspaces**: `apps/api`, `apps/web`, `packages/shared`.
- **GitHub Actions**: lint, type-check, testes e `npm audit` em todo pull request.
- **Commits** no padrão *Conventional Commits*, em inglês.

### Hospedagem (servidor Linux da Univille; confirmar com a TI)

Nginx na frente: serve `apps/web/dist` e repassa `/api` para a API Node. API gerenciada por **systemd** ou **PM2**. Banco no servidor ou gerenciado. Uploads em pasta fora da raiz pública (ou servidos pelo Nginx com cache). HTTPS obrigatório. Docker é **opcional**: prever um `Dockerfile` multi-stage, mas não depender dele.

---

## 5. Convenções (obrigatórias)

### Nomes em inglês

- **Tudo em inglês**: variáveis, funções, classes, tipos, arquivos, pastas, tabelas, colunas, rotas da API, enums, branches, commits, comentários, README técnico.
- **Único lugar em português**: textos exibidos ao usuário e conteúdo editorial. Os textos longos ficam em `apps/web/src/content/` (não espalhe literais pelo código).
- **URLs públicas** do site ficam em português (`/como-ajudar`) por SEO e por entenderem o público. As rotas de **admin** e da **API** ficam em inglês. *(Decisão ajustável: ver seção 14.)*

### Estilo de nomes

| O quê | Padrão | Exemplo |
|---|---|---|
| Arquivos e pastas | `kebab-case` | `collection-points.service.ts` |
| Componentes React | `PascalCase` (arquivo igual ao componente) | `PointFinder.tsx` |
| Variáveis e funções | `camelCase` | `findNearestPoints` |
| Tipos e interfaces | `PascalCase`, sem prefixo `I` | `CollectionPoint` |
| Constantes | `UPPER_SNAKE_CASE` só para constantes reais | `GRAMS_PER_CAP` |
| Enums | valores em `UPPER_SNAKE_CASE` | `ANSWERED` |
| Tabelas do banco | `snake_case` no plural (via `@@map` no Prisma) | `collection_points` |
| Colunas | `snake_case` (via `@map`) | `opening_hours` |
| Rotas da API | `kebab-case`, plural, versionadas | `/api/v1/collection-points` |
| JSON da API | `camelCase`, datas em ISO 8601 UTC | `createdAt` |
| Commits | `type(scope): summary` | `feat(api): add collection points endpoint` |

### Código

- TypeScript `strict`; **proibido `any`** (use `unknown` e estreite). Sem `// @ts-ignore` sem justificativa.
- **Camadas na API**: `routes` (HTTP e validação) → `service` (regra de negócio) → `repository` (acesso ao banco). Regra de negócio **nunca** na rota nem no componente React.
- **Funções pequenas**, uma responsabilidade, sem efeitos colaterais ocultos. Lógica pura (cálculos, ordenação, distância) em `packages/shared` ou `lib/`, sem dependência de framework, para testar fácil.
- **Erros**: classes de erro de domínio (`NotFoundError`, `ValidationError`, `UnauthorizedError`, `ConflictError`) tratadas em **um único handler central**. Nada de `catch` que engole erro. Em produção, nunca vazar stack trace.
- **Formato de erro da API**: `{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [...] } }`.
- **Configuração**: variáveis de ambiente validadas com Zod na inicialização (falhar rápido). `.env` fora do Git, `.env.example` versionado, nenhum segredo no repositório.
- **Sem dependência desnecessária.** Antes de adicionar uma biblioteca, pergunte: o Node ou o código atual resolve? Prefira bibliotecas mantidas e sem binário nativo.
- **Comentários explicam o porquê**, não o quê. Sem código morto, sem `console.log` (use o logger).
- **Internacionalização de dados**: moeda e datas no frontend com `Intl` e `pt-BR`.

### Testes

- Cada regra de negócio e cada rota nova nasce com teste. Padrão **Arrange-Act-Assert**; nome em três partes (o que, em qual cenário, resultado esperado).
- API: testes de integração com `app.inject()` e banco de teste real, isolado por teste (transação ou limpeza). Mocke **só** serviços externos (geocodificação).
- Frontend: teste de comportamento do usuário (Testing Library), não de detalhe de implementação.
- Meta: toda lógica de `packages/shared` com cobertura alta; fluxos críticos (login, criar ponto, enviar pedido, buscar ponto mais perto) cobertos.

---

## 6. Estrutura do repositório

```
patinhas-carentes/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts                 # reads /seed/*.json + creates first admin
│   │   ├── src/
│   │   │   ├── app.ts                  # builds the Fastify app (used by server and tests)
│   │   │   ├── server.ts               # process entry: listen + graceful shutdown
│   │   │   ├── config/env.ts           # validated environment
│   │   │   ├── plugins/                # db, auth/session, security, swagger, error-handler
│   │   │   ├── lib/                    # errors.ts, password.ts, pagination.ts, slug.ts
│   │   │   └── modules/
│   │   │       ├── auth/
│   │   │       ├── users/
│   │   │       ├── neighborhoods/
│   │   │       ├── collection-points/   # + geocoding.service.ts
│   │   │       ├── help-requests/
│   │   │       ├── monthly-reports/
│   │   │       ├── stories/
│   │   │       ├── media/
│   │   │       └── site-settings/
│   │   │           # each module: *.routes.ts, *.service.ts, *.repository.ts, *.schemas.ts, *.test.ts
│   │   └── test/                       # helpers, factories, test database setup
│   └── web/
│       └── src/
│           ├── app/                    # router, providers, layout
│           ├── pages/                  # one folder per page
│           ├── features/
│           │   ├── impact-meter/
│           │   ├── point-finder/       # map + list + geolocation
│           │   ├── poster-generator/
│           │   └── admin/              # collection-points, help-requests, reports, stories, users, settings, instagram-generator
│           ├── components/             # shared UI (Button, Field, Dialog, Toast…)
│           ├── services/api/           # typed API client (one file per module)
│           ├── content/                # pt-BR copy
│           ├── lib/
│           └── styles/                 # tokens.css, global.css
├── packages/
│   └── shared/
│       └── src/                        # Zod schemas, enums, constants, pure functions (impact math)
├── seed/
│   ├── collection-points.json          # 166 points already converted to latitude/longitude
│   └── neighborhoods.json              # 42 neighborhoods with anchor coordinates
├── reference/
│   └── prototype/                      # original prototype, read-only
├── deploy/
│   ├── nginx.conf.example
│   ├── patinhas-api.service            # systemd unit example
│   └── ecosystem.config.cjs            # PM2 example
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── deploy-runbook.md
│   └── decisions/                      # ADRs (0001-….md)
├── .github/workflows/ci.yml
├── .editorconfig  .gitignore  .env.example
├── package.json                        # workspaces
└── README.md
```

Referência de estrutura e boas práticas: `fastify/demo` (plugins externos, plugins da aplicação e rotas separados; `app.ts` separado de `server.ts` para testar sem subir porta) e o guia `goldbergyoni/nodebestpractices` (componentização, tratamento centralizado de erros, validação, segurança, testes).

---

## 7. Modelo de dados

Nomes em inglês. Todas as tabelas têm `id`, `createdAt`, `updatedAt`. Datas em UTC. Exclusão lógica (`status`) em vez de apagar, onde fizer sentido.

| Entidade | Campos principais | Observações |
|---|---|---|
| **User** | `name`, `email` (único), `passwordHash`, `role` (`ADMIN`, `EDITOR`), `isActive`, `lastLoginAt` | Sem cadastro público. Primeiro admin criado pelo seed (e-mail e senha vindos de variáveis de ambiente). |
| **Neighborhood** | `name`, `slug` (único), `latitude`, `longitude`, `outsideMainArea` | Âncora usada quando a pessoa escolhe o bairro. Vem de `seed/neighborhoods.json`. |
| **CollectionPoint** | `name`, `neighborhoodId`, `address`, `phone`, `category`, `openingHours`, `latitude`, `longitude`, `locationPrecision`, `outsideMainArea`, `status` (`ACTIVE`, `INACTIVE`) | `category`: `PET_VET`, `EDUCATION`, `HEALTH`, `GROCERY_FOOD`, `COMMERCE_SERVICES`. `locationPrecision`: `HOUSE_NUMBER`, `STREET`, `PLACE_NAME`, `NEIGHBORHOOD`. |
| **HelpRequest** | `type` (`COLLECTION_POINT`, `FOSTER`, `TALK`), `requesterName`, `contact` (WhatsApp ou e-mail), `institutionName`, `institutionType` (`SCHOOL`, `COMPANY`, `STORE`, `CONDO`), `wantsTalk`, `animalCapacity`, `message`, `consentGivenAt`, `status` (`NEW`, `ANSWERED`), `answeredAt`, `answeredById` | Dados pessoais (LGPD). Mínimo necessário. |
| **MonthlyReport** | `month` (`YYYY-MM`, único), `totalKg` (decimal), `outcomeSummary`, `status` (`DRAFT`, `PUBLISHED`), `publishedAt` | Quantidade de tampinhas é **calculada**, não guardada. |
| **Story** | `title`, `slug` (único), `body`, `coverMediaId`, `status` (`DRAFT`, `PUBLISHED`), `publishedAt` | |
| **MediaFile** | `path`, `mimeType`, `sizeBytes`, `altText`, `uploadedById` | Só imagens. |
| **SiteSettings** (linha única) | `gramsPerCap` (2.5), `goalKg` (500), `feedKgPerDay` (12.5), `whatsappNumber`, `instagramHandle`, `adoptionUrl`, `volunteerCount` | Substitui os números escritos à mão no protótipo ("9 voluntários", "500 kg"). Contagens de pontos e bairros **vêm do banco**. |

Regras de integridade: `CHECK` para latitude entre -90 e 90, longitude entre -180 e 180, `totalKg >= 0`, `goalKg > 0`; índice em `CollectionPoint(neighborhoodId, status)`.

### Seed

- `seed/collection-points.json` e `seed/neighborhoods.json` já foram gerados a partir do protótipo (coordenadas convertidas para latitude e longitude reais).
- Qualidade conhecida dos dados: **35 pontos sem telefone**, **12 com posição apenas aproximada pelo bairro**, **2 sem endereço**. O painel deve destacar esses casos (filtros "Sem telefone" e "Posição aproximada").
- O `seed.ts` é **idempotente** (pode rodar mais de uma vez sem duplicar).

---

## 8. Regras de negócio

Valores vêm de `SiteSettings` (padrões entre parênteses). A lógica fica em `packages/shared` como funções puras e testadas.

1. **Peso da tampinha:** `gramsPerCap` (2,5 g). Logo, 400 tampinhas = 1 kg.
2. **Meta de uma castração:** `goalKg` (500 kg = 200 mil tampinhas).
3. **Ração de filhote:** `feedKgPerDay` (12,5 kg = 1 dia).
4. **Medidor de impacto:** entrada de 0 a 200 000 tampinhas (passo 100). Saídas: peso em kg, **% de uma castração** (`caps / 200000`), **dias de ração** (`kg / feedKgPerDay`), com os textos do protótipo ("menos de 1 kg", "cerca de N dias"). Formatação `pt-BR`.
5. **Ponto mais perto:** distância em linha reta entre a referência (localização, bairro ou Centro) e cada ponto; ordenar do menor para o maior; mostrar "a 350 m" ou "a 2,4 km". Busca por texto ignora acentos e maiúsculas, a partir de 2 letras, em nome, endereço e bairro.
6. **Geolocalização:** se a pessoa estiver a mais de **40 km** de Joinville, recusar e pedir o bairro. Se negar permissão, cair para o seletor de bairro.
7. **Pontos fora da vista principal** (`outsideMainArea`: Garuva, Pirabeiraba, Rio Bonito, São Francisco do Sul) não entram no enquadramento inicial do mapa; aparecem ao escolher o bairro.
8. **Prestação de contas:** `tampinhas = round(kg × 400)`; `faltam = max(0, goalKg − kg)`; se `kg >= goalKg`, mostrar "Meta da castração alcançada". Só relatórios `PUBLISHED` aparecem no site.
9. **Pedido (HelpRequest):** nasce `NEW`; a equipe marca `ANSWERED`. O envio exige consentimento (checkbox de privacidade) e é limitado por IP.
10. **Geocodificação de ponto novo ou de endereço alterado:** ao salvar, o serviço tenta obter `latitude` e `longitude` pelo **Nominatim** (OpenStreetMap), respeitando a política de uso (identificar o `User-Agent`, no máximo 1 requisição por segundo, cache do resultado). Se falhar, o painel permite informar as coordenadas à mão e grava `locationPrecision` conforme o caso. **Nunca** salvar ponto sem coordenada válida como "ACTIVE" no mapa.
11. **Permissões:** `EDITOR` gerencia conteúdo (pontos, pedidos, contas, histórias). `ADMIN` também gerencia usuários e configurações.

---

## 9. API (v1)

Prefixo `/api/v1`. JSON. Paginação em listas do admin (`page`, `pageSize`, máximo 100). Todas as entradas validadas com Zod; campos desconhecidos são rejeitados.

### Pública

| Método e rota | Descrição |
|---|---|
| `GET /health` e `GET /ready` | Saúde do processo e do banco |
| `GET /collection-points` | Todos os pontos `ACTIVE` (hoje 166; o cálculo de distância é no cliente). Cache curto + ETag. |
| `GET /neighborhoods` | Bairros com âncoras e contagem de pontos |
| `GET /site-settings` | Valores públicos (meta, pesos, contatos) |
| `GET /monthly-reports` e `GET /monthly-reports/latest` | Relatórios publicados |
| `GET /stories` e `GET /stories/:slug` | Histórias publicadas |
| `POST /help-requests` | Envia pedido. **Rate limit** (por exemplo 5 por hora por IP), campo-isca (honeypot) e consentimento obrigatório |

### Autenticação

| Método e rota | Descrição |
|---|---|
| `POST /auth/login` | Rate limit forte (por exemplo 5 por minuto por IP e por e-mail). Mensagem genérica em erro. |
| `POST /auth/logout` | Encerra a sessão |
| `GET /auth/me` | Usuário atual |

### Admin (exige sessão; `/admin/users` e `PATCH /admin/site-settings` exigem `ADMIN`)

| Rota | Operações |
|---|---|
| `/admin/collection-points` | listar com filtros (`q`, `neighborhoodId`, `missingPhone`, `approximateLocation`), criar, editar, desativar; `POST /:id/geocode` |
| `/admin/help-requests` | listar com filtro de status, `PATCH /:id` para marcar respondida |
| `/admin/monthly-reports` | listar, criar, editar, `POST /:id/publish`, `POST /:id/unpublish` |
| `/admin/stories` | CRUD + publicar |
| `/admin/media` | `POST` (upload), `DELETE` |
| `/admin/users` | CRUD (ADMIN) |
| `/admin/site-settings` | `GET`, `PATCH` (ADMIN) |
| `/admin/dashboard` | contadores: pontos, pedidos novos, pontos sem telefone, relatório do mês pendente |

---

## 10. Frontend: rotas e comportamento

### Site público (URLs em pt-BR)

`/`, `/escolas-e-empresas`, `/como-ajudar`, `/prestacao-de-contas`, `/denuncia`, `/historias`, `/historias/:slug`, `/privacidade`.

### Admin (inglês)

`/admin/login`, `/admin`, `/admin/collection-points`, `/admin/help-requests`, `/admin/monthly-reports`, `/admin/stories`, `/admin/users`, `/admin/settings`, `/admin/instagram`.

### Requisitos de interface

- **Mobile first.** Alvos de toque grandes, leitura confortável, fonte base legível.
- **Acessibilidade (alvo WCAG 2.2 AA):** HTML semântico, `label` em todo campo, foco visível, contraste mínimo, navegação por teclado (inclusive lista e mapa), `aria-live` no medidor e na busca, botão de **texto maior**, nada depende só de cor. O mapa nunca é o único jeito de achar um ponto: a lista cobre tudo.
- **Estados em toda tela de dados:** carregando, vazio, erro (com "tentar de novo") e sucesso.
- **Impressão:** o cartaz usa `@media print` e sai em uma página A4.
- **Design tokens** (do protótipo, não inventar outra identidade): cores, tipografia (**Montserrat** nos títulos, **Inter** no texto), raios e espaçamentos ficam em `tokens.css`. Extrair os valores reais do CSS do protótipo.
- **Gerador de imagem do Instagram:** reaproveitar a lógica do `admDownload` do protótipo (canvas 1080×1080 feed e 1080×1920 stories, gradiente, texto quebrado em linhas, `@patinhascarentesjoinville`), mas com a **foto escolhida** na biblioteca de mídia e sem nenhum trecho específico do ambiente do protótipo (`window.claude`).
- **Cartaz:** o QR code deve apontar para a URL real do site (variável de configuração `VITE_PUBLIC_SITE_URL`), não para o endereço de exemplo.

---

## 11. Segurança, privacidade e qualidade

### Segurança (checklist)

- [ ] Cookie de sessão `HttpOnly`, `Secure`, `SameSite=Lax`, expiração definida e rotação no login.
- [ ] Proteção CSRF nas rotas de escrita do admin (checar `Origin` e/ou token).
- [ ] `helmet` com CSP ajustada ao mapa (tiles do OSM) e às fontes.
- [ ] Rate limit em login, `POST /help-requests` e geocodificação; resposta 404 também limitada.
- [ ] Validação de **toda** entrada; sem SQL montado à mão (somente Prisma; `$queryRaw` só parametrizado).
- [ ] Upload: limite de tamanho, só `jpeg/png/webp`, checar o tipo pelo conteúdo (não pela extensão), nome de arquivo gerado, pasta fora da raiz pública.
- [ ] Senhas com `scrypt`, sal único, comparação em tempo constante; política mínima de senha.
- [ ] Logs sem dados pessoais (redação de cookie, telefone, e-mail, corpo de pedidos).
- [ ] Segredos só em variáveis de ambiente; `npm audit` e atualização de dependências no CI.
- [ ] Encerramento limpo do processo (graceful shutdown) e timeouts de requisição.

### Privacidade (LGPD)

- Coletar o **mínimo** em `HelpRequest` (nome, contato, tipo). Texto claro de **finalidade** e **consentimento** no formulário e página `/privacidade`.
- Definir **prazo de retenção** (sugestão: apagar ou anonimizar pedidos respondidos após 12 meses; confirmar com a ONG) e um jeito de atender pedido de exclusão.
- Telefones dos pontos de coleta são dados públicos de estabelecimentos; ainda assim, a equipe pode corrigi-los ou removê-los a pedido.

### Desempenho e SEO

- Respostas públicas com `Cache-Control` curto e ETag; compressão ligada.
- Carregar o mapa sob demanda; separar o bundle do admin (`lazy`).
- Imagens com `width`/`height`, `loading="lazy"` e tamanhos razoáveis.
- **SEO:** o site é uma SPA em Vite, que indexa pior que páginas renderizadas no servidor. Na Fase 8, gerar `title` e `description` por página, `sitemap.xml`, `robots.txt`, JSON-LD (`Organization`) e **pré-renderizar as páginas públicas estáticas no build**. Se isso não bastar, registrar um ADR avaliando migrar o frontend para Next.js (consumindo a mesma API). Não decidir isso agora.

---

## 12. Plano de entrega por fases

Cada fase termina com: testes passando, lint e type-check limpos, README e `docs/` atualizados, e um resumo curto do que foi feito.

| Fase | Entrega | Pronto quando |
|---|---|---|
| **0. Base** | Monorepo, workspaces, TypeScript, ESLint, Prettier, Vitest, `.env.example`, CI, `README`, ADR 0001 (stack) | `npm run lint`, `typecheck` e `test` rodam e passam no CI |
| **1. Fundação da API** | `app.ts` e `server.ts`, env validado, Pino, handler central de erros, `helmet`, rate limit, Swagger, Prisma + primeira migração, `/health` e `/ready`, graceful shutdown | Subir a API, ver `/health` e a doc; teste do handler de erro |
| **2. Auth e usuários** | `User`, login/logout/me por sessão, seed do primeiro admin, papéis, CRUD de usuários | Login funciona; `EDITOR` recebe 403 em `/admin/users`; testes de segurança básicos |
| **3. Pontos de coleta** | `Neighborhood` e `CollectionPoint`, import do seed, `GET` público, CRUD admin, filtros de qualidade, geocodificação com cache e fallback manual | 166 pontos no banco; criar ponto sem coordenada tenta geocodificar; testes com serviço externo mockado |
| **4. Pedidos, contas, histórias, mídia, configurações** | `HelpRequest` (POST público protegido), `MonthlyReport`, `Story`, `MediaFile`, `SiteSettings`, dashboard | Fluxo de pedido ponta a ponta; só publicados aparecem no público |
| **5. Frontend base e Início** | Tokens, layout, roteamento, cliente da API, página **Início** com medidor e buscador (mapa + lista + geolocalização + bairro) | Comportamento equivalente ao protótipo; lógica pura testada em `packages/shared` |
| **6. Demais páginas públicas** | Escolas e empresas (cartaz + QR + formulário), Como ajudar, Prestação de contas, Denúncia, Histórias, Privacidade | Todas as páginas do protótipo cobertas, com dados reais da API |
| **7. Painel admin** | Login, visão geral, CRUD de pontos, pedidos, contas, histórias, usuários, configurações, **gerador de imagem do Instagram** | A Ana consegue fazer todo o fluxo mensal sozinha |
| **8. Endurecimento** | Auditoria de acessibilidade, SEO e pré-renderização, LGPD, desempenho, revisão de segurança | Checklist da seção 11 totalmente marcado |
| **9. Implantação** | Build de produção, Nginx, systemd/PM2, banco, backups, `docs/deploy-runbook.md` | Site no ar no servidor da Univille e plano de backup testado |

Comece **apenas pela Fase 0**: proponha o plano, mostre a árvore de arquivos que vai criar e peça confirmação antes de gerar o código.

---

## 13. Definição de pronto (vale para toda fatia)

- [ ] Funciona e tem testes de unidade/integração relevantes.
- [ ] `lint`, `typecheck` e `test` passam localmente e no CI.
- [ ] Sem `any`, sem `console.log`, sem segredo no código.
- [ ] Entradas validadas; erros tratados pelo handler central.
- [ ] Acessível por teclado e com estados de carregamento, vazio e erro (frontend).
- [ ] Documentação atualizada (README, `docs/`, OpenAPI).
- [ ] Commit pequeno, mensagem em inglês no padrão Conventional Commits.

---

## 14. Decisões pendentes e perguntas

Se o dono do projeto não responder, **use o padrão indicado** e registre no ADR.

| # | Pergunta | Padrão se sem resposta |
|---|---|---|
| 1 | O servidor da Univille permite processo Node permanente? Qual versão? | Node 24 LTS |
| 2 | Qual banco está liberado (PostgreSQL, MySQL, SQLite)? Quanta memória e disco? | PostgreSQL |
| 3 | Há domínio, HTTPS e Nginx, ou eu configuro? A API acessa a internet (para o Nominatim)? | Nginx + HTTPS, com acesso externo |
| 4 | Quem mantém o servidor depois do projeto? | Documentar tudo no runbook |
| 5 | As URLs públicas ficam em português ou em inglês? | Português |
| 6 | Chave Pix, CNPJ, preços de camisetas e bottons, quem atualiza a lista de pontos | Não exibir até serem informados |
| 7 | Prazo de retenção dos pedidos (LGPD) | 12 meses |
| 8 | Domínio final do site (para o QR code e o sitemap) | Variável de ambiente |

---

## 15. Referências

- Fastify, aplicação demo oficial: https://github.com/fastify/demo
- Boas práticas de Node.js: https://github.com/goldbergyoni/nodebestpractices
- Boas práticas de testes em Node.js: https://github.com/goldbergyoni/nodejs-testing-best-practices
- Calendário de versões do Node.js: https://endoflife.date/nodejs
- Comparação Express e Fastify (2026): https://www.pkgpulse.com/guides/express-vs-fastify-2026
- Comparação Drizzle e Prisma (2026): https://bytebase.com/blog/drizzle-vs-prisma
- Política de uso do Nominatim: https://operations.osmfoundation.org/policies/nominatim/
- LGPD (Lei 13.709/2018): https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm