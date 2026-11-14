# API

Base: `/api/v1`. Docs OpenAPI (fora de produção): `/docs`. Todas as entradas são validadas com Zod e campos desconhecidos são rejeitados.

## Formato de erro

```json
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "...",
        "details": [{ "path": "email", "message": "..." }]
    }
}
```

Códigos: `VALIDATION_ERROR` (400), `BAD_REQUEST` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `UNPROCESSABLE`, `GEOCODING_FAILED` e `NO_ADDRESS` (422), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500).

## Sessão e CSRF

- Login cria um cookie `HttpOnly`, `SameSite=Lax` (`Secure` e prefixo `__Host-` quando `COOKIE_SECURE` está ligado, o padrão em produção). O banco guarda só o hash do token.
- Escritas (`POST`, `PATCH`, `DELETE`) em `/admin/*` e `/auth/*` exigem o header `Origin` igual ao site ou listado em `ALLOWED_ORIGINS`. Sem isso: 403. Navegadores enviam esse header sozinhos; ao testar com curl, envie `-H "Origin: http://localhost:5847"`.
- `EDITOR` gerencia conteúdo. `ADMIN` também gerencia usuários e altera configurações.

## Público

| Rota                                                  | Descrição                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `GET /health`, `GET /ready`                           | Saúde do processo e do banco (sem rate limit)                                              |
| `GET /collection-points`                              | Todos os pontos `ACTIVE`. ETag + `max-age=60`                                              |
| `GET /neighborhoods`                                  | Bairros com âncora e contagem de pontos ativos                                             |
| `GET /site-settings`                                  | Pesos, preços, meta derivada (`goalKg`), média mensal, CNPJ, Pix, contatos e contagens     |
| `GET /monthly-reports`, `GET /monthly-reports/latest` | Só `PUBLISHED`, com tampinhas, castrações pagas e kg que faltam para a próxima             |
| `GET /leaderboard?period=month\|year\|all`            | Placar: pontos `ACTIVE` por kg recolhido no período (mês e ano de Brasília), com totais    |
| `GET /leaderboard/points/:id`                         | Total de um ponto `ACTIVE` desde sempre, para o certificado (zeros se nunca teve retirada) |
| `GET /stories`, `GET /stories/:slug`                  | Só `PUBLISHED`                                                                             |
| `GET /media/:id`                                      | Arquivo de imagem                                                                          |
| `POST /help-requests`                                 | Pedido. Exige `consent: true`, campo-isca `website` vazio, 5 por hora por IP               |

## Autenticação

| Rota                | Descrição                                       |
| ------------------- | ----------------------------------------------- |
| `POST /auth/login`  | 5 por minuto por IP e por e-mail. Erro genérico |
| `POST /auth/logout` | Encerra a sessão (204)                          |
| `GET /auth/me`      | Usuário atual                                   |

## Admin (exige sessão)

| Rota                                    | Operações                                                                                                                                                                                                                           |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/collection-points`              | `GET` (filtros `q`, `neighborhoodId`, `status`, `missingPhone`, `approximateLocation`, `page`, `pageSize`), `POST`, `GET/PATCH/DELETE /:id` (DELETE desativa), `POST /:id/geocode`                                                  |
| `/admin/geocode-preview`                | `POST` `{ address, neighborhoodId }`: devolve a posição encontrada sem salvar (`found: false` cai no centro do bairro)                                                                                                              |
| `/admin/neighborhoods/from-postal-code` | `POST` `{ postalCode }`: consulta o CEP e devolve `{ created, neighborhood }`. Se o bairro ainda não existe, cadastra sozinho com a posição achada pelo geocoder (só dentro de Joinville). CEP de outra cidade ou sem bairro dá 422 |
| `/admin/neighborhoods`                  | `POST` `{ name }`: cadastra um bairro que falta pelo nome (formato de nome próprio, posição achada pelo geocoder, só dentro de Joinville). Se já existir, devolve o existente. Nome que o mapa não acha dá 422                      |
| `/admin/pickups`                        | `GET` (filtros `pointId`, `page`, `pageSize`), `POST` `{ pointId, kg, pickedUpOn? }` (data padrão: hoje em Brasília, nunca no futuro; só ponto `ACTIVE`), `DELETE /:id` (204), `GET /summary` (última retirada e total por ponto)   |
| `/admin/features/:key`                  | `PUT` `{ visible }` (só ADMIN): liga ou desliga uma página ou seção do site. A lista de chaves válidas está em `packages/shared/src/features.ts`. Chave desconhecida dá 400                                                         |
| `/admin/help-requests`                  | `GET` (filtros `status`, `type`), `PATCH /:id` (`status`), `DELETE /:id` (só ADMIN, exclusão LGPD)                                                                                                                                  |
| `/admin/monthly-reports`                | `GET`, `POST`, `PATCH /:id`, `POST /:id/publish`, `POST /:id/unpublish`                                                                                                                                                             |
| `/admin/stories`                        | `GET`, `POST`, `GET/PATCH/DELETE /:id`, `POST /:id/publish`, `POST /:id/unpublish`                                                                                                                                                  |
| `/admin/media`                          | `GET`, `POST` (multipart: campo `file` e `altText`), `DELETE /:id`                                                                                                                                                                  |
| `/admin/users`                          | CRUD (só ADMIN)                                                                                                                                                                                                                     |
| `/admin/site-settings`                  | `GET` (qualquer usuário), `PATCH` (só ADMIN)                                                                                                                                                                                        |
| `/admin/dashboard`                      | Contadores: pontos ativos, pedidos novos, sem telefone, posição aproximada, relatório do mês anterior                                                                                                                               |

## Regras importantes

- **Geocodificação:** ao criar ponto ou mudar endereço/bairro, tenta o Nominatim (1 req/s, `User-Agent` identificado, cache em `geocode_cache`). Se falhar, o ponto usa a âncora do bairro com `locationPrecision: NEIGHBORHOOD`. Nunca fica sem coordenada. Coordenadas enviadas à mão têm prioridade. A resposta traz `locationSource`.
- **Upload:** só JPEG, PNG e WebP, tipo checado pelos primeiros bytes, nome gerado, limite `UPLOAD_MAX_BYTES`.
- **Usuários:** um admin não pode se rebaixar, desativar nem apagar. Trocar senha, desativar ou mudar o papel encerra as sessões do usuário.
- **Meta da castração:** `goalKg = spayCostBrl / kgPriceBrl` (hoje R$ 350 / R$ 2 = 175 kg). Não é gravada nem editável: muda quando um dos dois preços muda.
- **Páginas e seções desligadas:** `hiddenFeatures` (lista de chaves) vem em `GET /site-settings` e `GET /admin/site-settings`. O site esconde o que está na lista (menu, rodapé, links e seções). A API também recusa com 404 os dados públicos de uma página desligada: `/leaderboard*` (`page.leaderboard`), `/stories*` (`page.stories`), `/monthly-reports*` (`page.report`), `/collection-points` (`home.points`) e `POST /help-requests` (`page.help` para `FOSTER`, `page.school` para os demais). As rotas `/admin/*` continuam funcionando.
- **Retiradas e placar:** cada retirada é um registro de `kg` numa data (`pickups`). O placar soma só pontos ativos, empata na mesma posição (1, 1, 3) e desempata por nome. Apagar a retirada errada tira o peso do placar e do certificado. As contas de tampinhas e castrações são as mesmas do relatório mensal.
- **Relatório mensal:** tampinhas = `kg × 1000 / gramsPerCap`; `castrations = floor(kg / goalKg)`; `remainingKg = goalKg - (kg mod goalKg)`.
