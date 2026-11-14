# Revisão do código (26/10/2026)

Escopo: o repositório inteiro como estava em 26/10 (monorepo com API, site, painel e pacote
compartilhado), comparado com o protótipo final e com os dados confirmados pela ONG depois da pesquisa.

## Resumo

A base é boa. A API segue o que o `BUILD_PROMPT.md` pede e o front reproduz o protótipo com cuidado:
camadas separadas, erros tratados num lugar só, sessão por cookie com hash do token, CSRF por `Origin`,
limite de tentativas de login, upload checado pelo conteúdo, logs sem dado pessoal, testes de
integração com banco real, lógica pura em `packages/shared` e mapa que carrega sob demanda.

O que travava o projeto estava fora do código de negócio: faltavam as migrations, o lint não analisava
TypeScript, e o front ainda usava os números do primeiro protótipo (500 kg por castração, medidor até
200 mil tampinhas, "9 voluntários"). Tudo isso foi corrigido. O que não foi possível rodar aqui está em
"Não verificado".

## Problemas encontrados e corrigidos

| Gravidade | Problema                                                                                                                                           | Correção                                                                                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bloqueia  | Não existia `apps/api/prisma/migrations`. Os testes e o CI rodam `migrate deploy`, então nada seria criado no banco e tudo falharia                | Migration inicial escrita, já com os `CHECK` de `checks.sql`, mais `migration_lock.toml`                                                                                                  |
| Alta      | `eslint.config.js` estava corrompido: a lista `ignores` virou uma string só e não havia regra de TypeScript. O `npm run lint` nunca olhou os `.ts` | Config reescrita (recommended do ESLint e do typescript-eslint, `no-console`, `no-explicit-any`, hooks do React no `apps/web`)                                                            |
| Média     | Dois arquivos do Prettier com valores diferentes (`.prettierrc` com 4 espaços e `.prettierrc.json` sem)                                            | Ficou só o `.prettierrc`, que bate com o `.editorconfig`                                                                                                                                  |
| Alta      | A API não tinha comando de produção (`start`) nem como subir sem arquivo `.env`; não havia Docker                                                  | Scripts `start` e `db:seed:prod`, Dockerfiles, compose, nginx, runbook (ver ADR 0004)                                                                                                     |
| Média     | Em produção o cookie é sempre `Secure` com prefixo `__Host-`, o que impede testar por HTTP                                                         | Variável `COOKIE_SECURE` (padrão: ligada em produção)                                                                                                                                     |
| Média     | `apps/web/public/images` só tinha um README: o site mostraria blocos neutros no lugar das fotos e da logo                                          | Imagens copiadas do protótipo                                                                                                                                                             |
| Alta      | Fotos pixeladas: as 3 fotos têm só 480 x 640 px e a entrada as esticava por toda a largura da tela (quase 3 vezes num monitor de 1400 px)          | Entrada dividida como no protótipo final (texto e foto em tamanho limitado), faixa de lar temporário sem foto e figura da página Ajuda limitada. A solução de verdade são fotos originais |
| Baixa     | `reference/prototype` é citado no README e no prompt, mas não existia                                                                              | Protótipo final copiado para `reference/prototype`                                                                                                                                        |
| Baixa     | `VITE_PUBLIC_SITE_URL` estava no `.env.example`, mas nenhum código usa (o cartaz usa `window.location.origin`)                                     | Removida do exemplo                                                                                                                                                                       |
| Baixa     | README dizia "Fase 0, apps são placeholders"                                                                                                       | README reescrito                                                                                                                                                                          |
| Baixa     | Arquivos mortos: `use-text-size.ts` e `safe-storage.ts` (o botão "Texto maior" saiu)                                                               | Removidos                                                                                                                                                                                 |

## Atualização para o design e os dados novos

O front foi escrito a partir do protótipo de antes da pesquisa. Alinhei com o protótipo final e com as
respostas da ONG (decisões completas no [ADR 0003](decisions/0003-ngo-survey-data.md)):

- Conta da castração: R$ 350, R$ 2 por quilo, ou seja 175 kg (antes 500 kg). `goalKg` agora é derivado.
- Medidor de impacto: escala de 0 a 2.000 tampinhas, valor em reais, parte de uma castração e efeito
  de 100 pessoas doando o mesmo. Saíram os "dias de ração".
- Página inicial: faixa com pontos, média mensal em kg e animais atendidos (escondida até alguém informar).
- Prestação de contas: quantas castrações o mês pagou e quantos kg faltam para a próxima; bloco com a média mensal.
- Como ajudar: chave Pix com botão de copiar; preços da loja removidos.
- Rodapé com CNPJ. Respostas em "até 2 horas". Botão "Texto maior" removido.
- Painel: novos campos em "Equipe e ajustes" (custo, preço do quilo, média, animais, CNPJ, Pix).
- Visual das páginas internas: cantos de 14 a 26 px viraram o raio sóbrio do design final.

## Revisão independente

Um segundo revisor leu as mudanças sem executar nada. Corrigi o que ele apontou: build do site no Docker
(faltava o TypeScript da raiz), cookie de sessão que não era apagado no logout em produção, nginx que
guardava o IP antigo da API e aceitava `X-Forwarded-For` forjado, origem de desenvolvimento herdada pelo
`.env.example`, tipo do ajuste de configurações, um teste que podia falhar por ordem de resposta e
permissões da imagem da API. A formatação (Prettier) de arquivos novos e das tabelas dos documentos
só se resolve rodando `npm run format`.

## Docker

`docker compose up --build -d` sobe PostgreSQL, API e site (nginx). A API aplica as migrations ao
iniciar. O primeiro acesso exige o seed (`docker compose run --rm api npm run db:seed:prod`). Backup,
HTTPS, atualização e solução de problemas estão em [deploy-runbook.md](deploy-runbook.md).

## Ainda aberto

Pontos que dependem de decisão ou de informação, em ordem de impacto:

1. **Rodar a verificação completa.** Veja "Não verificado".
2. **Pontos de coleta.** A ONG disse que cerca de 110 estão ativos, mas pediu para manter os 166. Se um
   dia houver lista de inativos, basta desativar no painel (o site só mostra `ACTIVE`).
3. **Fotos.** Só há 3 fotos de animais, repetidas, e todas com 480 x 640 px (miniaturas do Instagram). Pedir à ONG 10 a 15 originais da galeria do celular (1200 px ou mais). A imagem que o painel gera para o Instagram tem 1080 px e sai suave enquanto a foto-base for essa.
4. **Animais atendidos no ano.** A ONG não soube informar. O número só aparece depois de preenchido em "Equipe e ajustes".
5. **Peso da tampinha (2,5 g)** é premissa nossa, aceita pela ONG, nunca medida.
6. **CNPJ e Pix.** A ONG disse que está "em processo de formalização" e passou o CNPJ. Confirmar que já pode ser público.
7. **Histórias.** Não há nenhuma no banco. Escrever uma real antes de publicar; as de exemplo do protótipo não foram importadas de propósito.
8. **Fase 8 do plano:** SEO e pré-renderização (o site é uma SPA), auditoria de acessibilidade, retenção de dados (LGPD, 12 meses) e política de backup.
9. **Servidor da Univille:** confirmar se aceita Docker. Se não, usar o caminho B do runbook.
10. **Imagem da API.** Roda com `tsx` e mantém dependências de desenvolvimento. Funciona, mas é maior do que uma build compilada. Está no ADR 0004 como melhoria futura.

## Verificação

Feita em 26/10/2026 numa cópia temporária do projeto (`npm ci` com o seu `package-lock.json`):

| Verificação                                          | Resultado                                                                     |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| `prisma generate`                                    | Passa. O `schema.prisma` é válido                                             |
| Migration escrita à mão contra `prisma migrate diff` | Idêntica ao SQL que o Prisma gera (36 comandos; os CHECK vão além)            |
| `npm run typecheck` (api, web, shared)               | Passa                                                                         |
| `npm run lint`                                       | Achou 6 imports sem uso em `PointsPage.tsx` e um espaço irregular. Corrigidos |
| `npm run format:check`                               | 14 arquivos novos precisavam de formatação. Formatados                        |
| Testes do `packages/shared`                          | 44 de 44                                                                      |
| Testes do `apps/web`                                 | 47 de 47                                                                      |
| Testes da API que não usam banco (`config` e `lib`)  | 31 de 31                                                                      |
| `npm run build -w @patinhas/web`                     | Passa                                                                         |

Não foi possível verificar nesta máquina (sem PostgreSQL, Docker nem `make`):

- Os testes de integração da API (rotas, sessão, seed). Rode `make db-up` e `make test`.
- `prisma migrate deploy` num banco real.
- `docker compose build` e `up`, o nginx e os healthchecks.
- O `Makefile` (conferido só por leitura: tabulações e sintaxe).

Roteiro para fechar: `make install db-up generate migrate check`, depois `make config-docker up seed-docker ps`.

## Accessibility pass (2026-10-27)

WCAG 2.1 AA review of `apps/web`. Text contrast already passed (4.5:1 or more). Fixed:

- Focus ring: pink `#b4005a` was 2.15:1 on the footer and 1.66:1 on teal deep. Dark sections now set `--focus-ring` to the sun yellow (5.9:1 or more).
- Field borders were 1.37:1 (public) and 1.50:1 (panel). New `--color-field` and panel border reach 3:1 or more.
- Panel inputs no longer remove the outline on focus.
- Root font size is `87.5%` instead of `14px`, so the browser text size setting is respected.
- Route changes move focus to `#conteudo`; smooth scrolling is skipped with `prefers-reduced-motion`; anchors have `scroll-padding-top`.
- Consent checkbox: error linked with `aria-describedby`, `aria-invalid`, and the privacy link says it opens in a new tab.
- Meter: `aria-live` moved from the whole block (slider included) to the result text.
- Pix copy: announces success and shows a message when the clipboard is blocked.
- "Área da equipe" link has a 44 px target.

Still manual: test with NVDA or VoiceOver, 200% zoom and keyboard only on the map and the panel tables.
