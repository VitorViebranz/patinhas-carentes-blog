# Patinhas Carentes Joinville

Site público e painel da equipe da ONG Patinhas Carentes Joinville, que cuida de cães e gatos resgatados com o dinheiro da reciclagem de tampinhas plásticas. Projeto de extensão da Univille (Engenharia de Software).

O site ajuda o público a achar o ponto de coleta mais perto, mostra o quanto cada tampinha rende, recebe pedidos de novos pontos e de lares temporários, publica a prestação de contas e mantém um placar dos pontos que mais entregaram. O painel é onde a equipe cuida de tudo isso.

## Primeira execução com Docker

Este é o caminho mais rápido para ver tudo funcionando (banco, API e site). Você só precisa do Docker.

### O que você precisa

- Docker com Docker Compose (Docker Desktop no Windows e no Mac).
- `make` (já vem no Linux e no WSL). No Windows, rode os comandos pelo WSL ou pelo Git Bash.
- `openssl` (para gerar os segredos). Também já vem no Linux e no WSL.

### Passo a passo

1. Baixe o projeto e entre na pasta:

```bash
git clone <endereco-do-repositorio> patinhas
cd patinhas
```

2. Crie o arquivo de configuração a partir do exemplo:

```bash
make env
```

3. Abra o arquivo `.env` e preencha estes quatro campos (os outros já têm valor padrão):

| Variável              | O que colocar                                           |
| --------------------- | ------------------------------------------------------- |
| `POSTGRES_PASSWORD`   | Uma senha para o banco. Gere com `openssl rand -hex 24` |
| `SESSION_SECRET`      | Um segredo longo. Gere com `openssl rand -hex 32`       |
| `SEED_ADMIN_EMAIL`    | O e-mail do primeiro administrador                      |
| `SEED_ADMIN_PASSWORD` | A senha desse administrador (10 ou mais caracteres)     |

O `SESSION_SECRET` de exemplo (`change-me...`) é recusado de propósito: no Docker a API roda em modo de produção e não sobe com o segredo de exemplo. Se você quiser trocar as portas, mude `WEB_PORT` e `API_PORT` no mesmo arquivo.

4. Suba tudo com um comando só:

```bash
make first-run
```

Ele constrói as imagens, sobe o banco, a API e o site, espera ficarem saudáveis, carrega os 166 pontos de coleta, as configurações iniciais e o primeiro administrador, e imprime o endereço do site. As migrações do banco rodam sozinhas quando a API inicia.

5. Abra no navegador:

- Site: http://localhost:8847 (ou a porta que você pôs em `WEB_PORT`)
- Painel da equipe: http://localhost:8847/admin/login, com o e-mail e a senha do passo 3

6. Depois de conseguir entrar, apague a linha `SEED_ADMIN_PASSWORD=` do `.env` e rode `make up` de novo. A API recebe o `.env` inteiro, então a senha inicial só precisa existir até o primeiro acesso.

Sem `make`, os comandos equivalentes são:

```bash
cp .env.example .env
docker compose up --build -d --wait
docker compose run --rm api npm run db:seed:prod
```

### Dia a dia com Docker

| Comando                     | O que faz                                                                 |
| --------------------------- | ------------------------------------------------------------------------- |
| `make up`                   | Reconstrói e sobe tudo (use depois de baixar mudanças novas)              |
| `make down`                 | Para e remove os containers (os dados ficam guardados nos volumes)        |
| `make ps`                   | Mostra o estado e a saúde de cada serviço                                 |
| `make logs`                 | Acompanha o log da API                                                    |
| `make docker-check`         | Diagnóstico: portas lidas do `.env`, estado dos containers e últimos logs |
| `make neighborhoods-docker` | Acrescenta os bairros oficiais de Joinville que ainda faltam              |
| `make backup`               | Salva o banco e as fotos enviadas na pasta `backups`                      |

### Se algo der errado

| Sintoma                                         | Causa provável e o que fazer                                                                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `port is already allocated`                     | Outro projeto usa a porta. Troque `WEB_PORT` ou `API_PORT` no `.env` e rode `make up`                                                   |
| A API fica reiniciando                          | Rode `make logs`. Quase sempre é `SESSION_SECRET` ainda com o texto de exemplo ou variável inválida (o erro cita o campo)               |
| Não consigo entrar no painel                    | O primeiro administrador só existe depois do seed. Rode `make seed-docker` e confira e-mail e senha (10 ou mais caracteres)             |
| Entro, mas a sessão cai sozinha                 | O cookie é `Secure`. Funciona em `localhost` e em HTTPS. Em HTTP por outro endereço, use HTTPS (ou `COOKIE_SECURE=false` só para teste) |
| Os valores do `.env` parecem ignorados          | O arquivo tem fim de linha do Windows. Rode `dos2unix .env`. O `make docker-check` avisa                                                |
| `make migrate` diz que não alcança o banco      | O Docker completo não abre a porta do banco. Use `make up` (ele migra sozinho) ou `make db-up` para o fluxo de desenvolvimento          |
| O site abre de outro computador da rede e falha | A porta do site abre só em `127.0.0.1`. Para abrir para a rede, ponha `WEB_BIND=0.0.0.0` e use HTTPS por um proxy                       |

## Índice

1. [Primeira execução com Docker](#primeira-execução-com-docker)
2. [O que o projeto faz](#o-que-o-projeto-faz)
3. [O site público, página por página](#o-site-público-página-por-página)
4. [O painel da equipe, tela por tela](#o-painel-da-equipe-tela-por-tela)
5. [Como cada funcionalidade funciona](#como-cada-funcionalidade-funciona)
6. [Segurança](#segurança)
7. [Arquitetura e estrutura de pastas](#arquitetura-e-estrutura-de-pastas)
8. [API](#api)
9. [Configuração (.env)](#configuração-env)
10. [Desenvolvimento local](#desenvolvimento-local)
11. [Comandos do Makefile](#comandos-do-makefile)
12. [Testes e qualidade](#testes-e-qualidade)
13. [Banco de dados](#banco-de-dados)
14. [Deploy e produção](#deploy-e-produção)
15. [Convenções e decisões](#convenções-e-decisões)

## O que o projeto faz

A ONG não tem abrigo. Uma rede de protetores e lares temporários cuida dos animais, e o dinheiro vem da venda das tampinhas plásticas recolhidas em pontos de coleta espalhados por Joinville. O projeto resolve quatro problemas:

- **Para o público:** achar o ponto de coleta mais perto, saber o que pode ou não pode levar, ver quanto a doação rende e entender para onde vai o dinheiro.
- **Para quem quer ajudar:** pedir um novo ponto de coleta (escola, empresa, loja, condomínio), oferecer um lar temporário, achar o link de adoção, comprar na loja ou doar por Pix.
- **Para a equipe:** cadastrar pontos, responder pedidos, registrar o quanto foi retirado de cada ponto, publicar a prestação de contas e as histórias de resgate.
- **Para quem coleta:** um placar público dos pontos que mais entregaram e um certificado para imprimir.

Tecnologia: site em React 19 com Vite, API em Fastify 5 com Prisma 7 e PostgreSQL 16, tudo em TypeScript. O site e o painel são a mesma aplicação React; o painel fica em `/admin`.

## O site público, página por página

O menu do topo e o rodapé levam a todas as páginas. O botão verde do WhatsApp fica fixo no canto de todas. O site tem tema claro e escuro (veja [Tema claro e escuro](#tema-claro-e-escuro)). A equipe pode desligar páginas e partes da página inicial (veja [Páginas e seções](#páginas-e-seções-ligar-e-desligar)).

### Início (`/`)

A página principal, feita de blocos. Cada bloco pode ser ligado ou desligado no painel.

| Bloco                       | O que faz                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Topo (sempre ligado)        | Título, texto de apresentação e os botões "Achar o ponto de coleta" e "Quero ser lar temporário"                                                                          |
| Números da campanha         | Pontos de coleta ativos, média mensal em kg e animais atendidos no ano (os dois últimos só aparecem se tiverem valor)                                                     |
| O que você quer fazer hoje? | Três cartões: doar tampinhas, ser ponto de coleta, lar temporário e adoção. Cartões de páginas desligadas somem e a numeração se ajusta                                   |
| Calculadora de impacto      | Uma barra para dizer quantas tampinhas você tem em casa. Mostra quanto isso vale em reais e que parte de uma castração é (veja [Cálculo do impacto](#cálculo-do-impacto)) |
| Como funciona               | Os 3 passos: junte e leve, a equipe busca e envia para reciclagem, o dinheiro vira cuidado                                                                                |
| Pontos de coleta            | O localizador: mapa e lista para achar o ponto mais perto (veja [Localizador de pontos](#localizador-de-pontos))                                                          |
| Pode ou não pode?           | Duas fotos e uma lista de itens (chocolatado, lacre de latinha, rolha, shampoo, etc.). Ao tocar num item, o site diz se pode ou não pode levar                            |
| Falta ponto perto de você?  | Faixa que convida a abrir um ponto. Só aparece se a página "Seja um ponto" estiver ligada                                                                                 |
| Quem somos                  | Texto sobre a ONG e link para a prestação de contas                                                                                                                       |
| Lares temporários           | Convite para acolher um bichinho, com link para Como ajudar                                                                                                               |
| Instagram                   | Três fotos e o botão para seguir o perfil da ONG                                                                                                                          |

### Seja um ponto de coleta (`/escolas-e-empresas`)

Para escolas, empresas, lojas e condomínios que querem receber tampinhas. Tem três partes:

1. **Como funciona:** você preenche o pedido, imprime o cartaz e a equipe busca. O espaço então aparece no mapa.
2. **Faça o pedido:** formulário com nome, WhatsApp ou e-mail, nome do espaço, tipo (escola, empresa, loja, condomínio), CEP (que preenche a rua sozinho), bairro, rua e número, e a caixa de consentimento da LGPD. O pedido chega no painel, em Solicitações.
3. **Imprima o cartaz:** você digita o nome do espaço e o cartaz A4 se atualiza na hora, com logo, nome do espaço, QR code que leva ao localizador, o que pode e o que não pode, e o Instagram da ONG. O botão "Imprimir o cartaz" imprime só o cartaz, em folha cheia. Há também uma mensagem pronta para avisar pais ou funcionários, com botão de copiar.

### Placar (`/placar`)

O ranking público dos pontos que mais entregaram tampinhas.

- Abas **Este mês**, **Este ano** e **Desde o início** (o mês e o ano seguem o horário de Brasília).
- Faixa de resumo do período: quilos recolhidos, tampinhas, castrações pagas e quantos pontos ajudaram.
- **Pódio** com os três primeiros e lista com barras para os demais. Empates dividem a posição.
- Cada ponto tem o link "Ver certificado".
- Chamada no fim: "Quer ver o seu nome aqui?" leva a Seja um ponto de coleta.
- Se ninguém tiver retirada no período, mostra uma mensagem convidando a ser o primeiro.

### Certificado (`/certificado/:id`)

Certificado em A4 de um ponto, pronto para imprimir: nome e bairro do ponto, total de quilos entregues e desde quando, número de tampinhas, de castrações pagas e de retiradas, e o Instagram da ONG. Um ponto sem nenhuma retirada ainda não gera certificado e mostra um aviso. O certificado é sempre claro, mesmo no tema escuro, porque é para papel.

### Como ajudar (`/como-ajudar`)

Reúne as outras formas de ajudar:

- **Ser lar temporário:** formulário com nome, contato e quantos animais você consegue receber.
- **Adotar um bichinho:** botão para o Adoteca, o endereço configurado pela equipe.
- **Loja Patinhas:** fotos dos produtos e botão para comprar pelo WhatsApp. Todo o valor vai para a causa.
- **Ajudar nas feirinhas:** chamada para voluntários de feirinhas de adoção e mutirões de microchipagem.
- **Doar em dinheiro:** cartão com a chave Pix e botão de copiar (só aparece se a chave estiver cadastrada).
- No fim, um atalho para Denunciar.

### Para onde vai a tampinha (`/prestacao-de-contas`)

A prestação de contas mensal.

- O caminho da tampinha em quatro passos: você doa, a equipe busca, vai para a reciclagem, vira cuidado.
- O último mês publicado, com quilos, tampinhas, castrações pagas e quantos quilos faltam para a próxima.
- Gráfico dos últimos 12 meses.
- A média mensal e o que as tampinhas já fizeram (vacinação antirrábica, campanha de castração, feirinhas de adoção, palestras em escolas).
- Chamada para achar um ponto de coleta.

### Histórias de resgate (`/historias` e `/historias/:slug`)

A lista mostra as histórias publicadas, da mais nova para a mais antiga, com foto, título e resumo. Cada história tem página própria com a data, a foto, os parágrafos e um botão para Como ajudar. Só histórias publicadas aparecem.

### Denunciar maus-tratos (`/denuncia`)

Três caminhos: ligar para o **190** (está acontecendo agora), ligar para o **181** (fazer a denúncia) ou usar o **portal da prefeitura** (online e anônimo), com o passo a passo do portal em três etapas e um lembrete para acompanhar.

### Privacidade (`/privacidade`)

Explica em linguagem simples a LGPD: quais dados são guardados (só o que você escreve nos formulários), para que servem, quem os vê (só a equipe), por quanto tempo, a ausência de cookies de rastreamento e como pedir para ver, corrigir ou apagar os seus dados.

### Páginas de aviso

- **Página não encontrada:** para endereços que não existem.
- **Esta página não está disponível:** para páginas que a equipe desligou.

## O painel da equipe, tela por tela

O acesso fica em `/admin/login` (o link "Área da equipe" está no cabeçalho e no rodapé do site). Há dois perfis:

| Perfil        | O que pode                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| Editor        | Cuida do conteúdo: pontos, retiradas, solicitações, prestação de contas e histórias                       |
| Administrador | Tudo do editor, mais Páginas e seções, Equipe e ajustes, apagar pedidos (LGPD) e apagar retiradas antigas |

Em todas as telas há o botão de tema claro e escuro e o botão "Ver o site". No celular, o menu lateral vira uma barra rolável no topo.

### Entrar

E-mail e senha. A mensagem de erro é sempre a mesma, para não revelar se o e-mail existe. Há limite de tentativas por minuto.

### Visão geral (`/admin`)

A tela de abertura, com:

- Saudação e atalhos: novo ponto, registrar retirada, registrar o mês, escrever história e, para administradores, números do site.
- Indicadores clicáveis: pontos ativos, pedidos novos, total arrecadado no último mês e situação da prestação de contas.
- **Pedidos recentes**, com quem pediu, tipo e data.
- **Pendências:** pedidos novos para responder, pontos sem telefone, pontos com posição aproximada e o relatório do mês anterior (ainda não registrado, em rascunho ou publicado).
- **Castrações pagas no último mês:** barra de quanto falta para a próxima.

### Pontos de coleta (`/admin/pontos`)

O cadastro dos pontos que aparecem no mapa.

- **Busca** por nome, rua ou bairro, filtro por bairro e abas **Todos**, **Sem telefone** e **Posição aproximada**.
- **Tabela** com local e categoria, bairro, endereço, telefone, precisão do mapa e a **última retirada** (com o total em kg e um aviso amarelo se passou de 45 dias).
- **Novo ponto e edição:** nome, CEP (preenche a rua), bairro (com busca e a opção de cadastrar um bairro que falta), rua, número, telefone, categoria e horário de funcionamento. A posição no mapa é achada pelo endereço e você pode ajustá-la clicando no mapa ou digitando as coordenadas.
- **Ações por ponto:** registrar retirada, abrir o certificado, editar, recalcular a posição pelo endereço e **tirar do site** (o ponto fica guardado e some do mapa; há botão Desfazer).

### Retiradas e placar (`/admin/retiradas`)

Onde a equipe registra o quanto saiu de cada ponto e de onde sai o certificado.

1. **Três passos** no topo explicam o fluxo.
2. **Registrar uma retirada:** busque o ponto pelo nome ou bairro (a lista encolhe e, se sobrar um, ele já vem escolhido), informe o peso (aceita vírgula, até 5.000 kg) e a data (hoje por padrão, nunca no futuro). Aparece um aviso com Desfazer.
3. **Últimas retiradas:** as dez mais recentes, com a lixeira para apagar uma errada. Um editor só apaga o que ele mesmo registrou nas últimas 24 horas; para uma antiga ou de outra pessoa é preciso um administrador.
4. **Placar e certificados:** todos os pontos que já tiveram retirada, do que mais entregou para o que menos, com o botão **Abrir certificado** em cada linha e o link para o placar no site.

### Solicitações (`/admin/solicitacoes`)

Os pedidos vindos dos formulários do site (ponto de coleta, lar temporário, palestra).

- Abas **Todas**, **Novas** e **Respondidas**.
- Tabela com quem pediu, tipo, detalhes (espaço e endereço, ou quantos animais), contato (com link direto para WhatsApp ou e-mail), data e situação.
- Ações: marcar como respondida ou reabrir (com Desfazer) e, nos pedidos de ponto com endereço, **criar o ponto** já com os dados preenchidos.

### Prestação de contas (`/admin/contas`)

Onde a equipe fecha o mês.

- **Atalhos de mês:** os últimos 6 meses viram botões, com uma bolinha verde (publicado), cinza (rascunho) ou amarela (falta registrar).
- **Registrar o mês:** total arrecadado em kg e o que virou (opcional). Ao digitar, o painel mostra na hora as tampinhas, as castrações pagas e quantos quilos faltam para a próxima.
- **Publicar no site** ou **salvar rascunho**.
- **Imagem para o Instagram:** pré-visualização em formato feed (quadrado) ou stories (vertical), botão para baixar a imagem e legenda pronta para copiar.
- **Meses registrados:** tabela com mês, quilos, castrações, resumo e situação, com resumo do ano e botões para editar e para tirar do site ou publicar.

### Histórias (`/admin/historias`)

Onde a equipe escreve as histórias de resgate.

- **Nova história:** título, texto (uma linha em branco separa parágrafos, com contagem de palavras e tempo de leitura), foto opcional (JPG, PNG ou WebP, até 5 MB, com pré-visualização e descrição para quem não enxerga) e os botões **Publicar no site** e **Salvar rascunho**.
- **Lista:** abas Todas, Publicadas e Rascunhos com contagem, miniatura, situação, data, resumo, link "Ver no site" e ações de editar, tirar do site ou publicar e apagar.

### Páginas e seções (`/admin/visibilidade`, só administrador)

Uma lista de interruptores para ligar e desligar o que o público vê, sem mexer em código (veja [Páginas e seções](#páginas-e-seções-ligar-e-desligar)).

### Equipe e ajustes (`/admin/equipe`, só administrador)

- **Ajustes do site:** cada campo salva sozinho, com seu próprio botão Salvar:
    - Cálculo do impacto: custo médio de uma castração, valor de um quilo de tampinha e peso de uma tampinha.
    - Números do site: média mensal arrecadada (0 esconde a faixa) e animais atendidos no ano (vazio esconde).
    - Contato e doações: WhatsApp, Instagram, chave Pix, CNPJ e link de adoção.
- **Cadastrar pessoa da equipe:** nome, e-mail, senha inicial (10 ou mais caracteres) e permissão (Editor ou Administrador).
- **Equipe:** a lista de pessoas, com a opção de desativar e reativar o acesso.

### Avisos de página desligada

Nas telas de Prestação de contas, Histórias e Retiradas, se a página correspondente estiver desligada no site, aparece um aviso amarelo no topo (com link para ligar, para administradores).

## Como cada funcionalidade funciona

### Cálculo do impacto

Três números, editáveis em Equipe e ajustes, alimentam todas as contas do site:

| Ajuste                        | Valor atual | Uso                                      |
| ----------------------------- | ----------- | ---------------------------------------- |
| Peso de uma tampinha          | 2,5 g       | Converte quilos em número de tampinhas   |
| Valor de um quilo de tampinha | R$ 2,00     | Converte quilos em reais                 |
| Custo médio de uma castração  | R$ 350,00   | Define a meta de quilos de uma castração |

Deles saem as contas:

- **Meta de uma castração:** custo da castração dividido pelo valor do quilo. Hoje são 175 kg, ou 70.000 tampinhas. Ela muda sozinha se um dos dois valores mudar.
- **Tampinhas de um total em kg:** quilos vezes 1000, divididos pelo peso de uma tampinha (400 por quilo).
- **Castrações pagas:** total em kg dividido pela meta, arredondado para baixo.
- **Quilos que faltam para a próxima:** a meta menos o resto do total dividido pela meta.
- **Calculadora da página inicial:** vai de 0 a 2.000 tampinhas (botões de mais e menos 100). Mostra o peso, o valor em reais e que fração de uma castração isso representa, e o efeito se 100 pessoas doarem a mesma quantidade.

As contas ficam num pacote compartilhado (`packages/shared`), usado pelo site e pela API, e são cobertas por testes.

### Localizador de pontos

- **Ao entrar na página**, o navegador pede a localização. Se a pessoa recusar, o mapa abre sem ponto de partida e ela escolhe o bairro numa lista pesquisável com todos os bairros de Joinville.
- Com a localização, os pontos aparecem **do mais perto para o mais longe**, com a distância. O mapa mostra a posição da pessoa com um círculo de precisão. Se a precisão for ruim, o site avisa e oferece tentar de novo.
- A **lista de pontos** pode ser recolhida para o lado para liberar o mapa.
- Cada ponto mostra nome, categoria, endereço, telefone e horário, e leva ao Google Maps.
- Pontos com posição **aproximada** (só o bairro) são sinalizados, porque o endereço exato não foi achado.
- O mapa usa Leaflet e só é carregado quando precisa, para a página abrir mais rápido.

### Pontos, endereços e geocodificação

- Ao criar um ponto ou mudar o endereço, a API tenta achar as coordenadas no **Nominatim** (OpenStreetMap), com cache no banco e limite de uma consulta por segundo. Se não achar, usa a posição do bairro e marca o ponto como **aproximado**. Um ponto nunca fica sem coordenada.
- Coordenadas digitadas à mão têm prioridade.
- O **CEP** é consultado no **ViaCEP** para preencher rua e bairro. Se o bairro ainda não existe e é de Joinville, ele é cadastrado sozinho. CEP de outra cidade é recusado.
- A precisão de cada ponto é uma de quatro: exata (número da casa), na rua, pelo nome do lugar ou aproximada (bairro).
- O bairro oficial vem da lista da prefeitura (`seed/official-neighborhoods.json`). O comando `make neighborhoods` acrescenta os que faltam.
- As categorias de ponto são: pet e veterinária, escola e educação, saúde, mercado e alimentação, comércio e serviços.

### Pedidos (formulários do site)

- Os tipos são **ponto de coleta**, **lar temporário** e **palestra**.
- Todo formulário exige o consentimento da LGPD, tem um campo escondido contra robôs e limite de 5 envios por hora por pessoa.
- O pedido fica guardado como "Nova" até a equipe responder. Quem respondeu fica registrado.
- Só administradores apagam um pedido (para atender pedidos de exclusão de dados).

### Retiradas, placar e certificado

- Cada retirada é um registro de peso (`kg`) numa data, ligado a um ponto, guardado na tabela `pickups`. A data não pode estar no futuro e o peso vai até 5.000 kg.
- O **placar** soma só os pontos que estão ativos, ordena do mais pesado para o mais leve, desempata pelo nome e deixa empates na mesma posição (1, 1, 3). Mostra os 50 primeiros. Os períodos mês e ano seguem o horário de Brasília.
- As contas de tampinhas e castrações do placar e do certificado são as mesmas da prestação de contas.
- Apagar uma retirada errada tira o peso do placar e do certificado. Quem pode apagar está descrito em Retiradas e placar.
- O **certificado** de um ponto soma tudo desde a primeira retirada.

### Prestação de contas mensal

- Um registro por mês (formato `AAAA-MM`) com o total em kg e um texto opcional sobre no que virou. Fica em **rascunho** até a equipe publicar.
- O site mostra só os meses publicados. Tirar do site volta o mês para rascunho.
- O painel gera a **imagem para o Instagram** no próprio navegador (canvas), nos formatos feed e stories, e uma legenda pronta com os números do mês.

### Histórias e fotos

- Cada história tem título, texto, foto de capa opcional, situação (rascunho ou publicada) e um endereço (`slug`) feito do título.
- Só imagens JPG, PNG e WebP são aceitas, até 5 MB. O tipo é conferido pelos primeiros bytes do arquivo (não pelo nome), o nome guardado é gerado pelo servidor e as fotos ficam numa pasta fora da pasta pública.
- A foto precisa de uma descrição curta para quem usa leitor de tela.

### Páginas e seções (ligar e desligar)

Em **Páginas e seções** o administrador liga e desliga o que o público vê. A mudança vale em até 30 segundos. O que for desligado continua no painel, só sai do ar.

| Grupo               | Item (chave)                                                                                                                                                                                                                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Páginas             | Seja um ponto de coleta (`page.school`), Placar (`page.leaderboard`), Como ajudar (`page.help`), Para onde vai a tampinha (`page.report`), Histórias de resgate (`page.stories`), Denunciar (`page.denounce`)                                                                                                                                                   |
| Página inicial      | Números da campanha (`home.stats`), O que você quer fazer hoje? (`home.paths`), Calculadora de impacto (`home.impact`), Como funciona (`home.how`), Pontos de coleta (`home.points`), O que pode doar (`home.checker`), Falta ponto perto de você? (`home.callout`), Quem somos (`home.about`), Lares temporários (`home.foster`), Instagram (`home.instagram`) |
| Em todas as páginas | Botão do WhatsApp (`global.whatsapp`)                                                                                                                                                                                                                                                                                                                           |

Como funciona por dentro:

- A lista do que está desligado fica em `site_settings.hidden_features` e chega ao site junto das configurações públicas. Tudo é "ligado" por padrão: uma chave nova nunca some por engano.
- **Página desligada:** sai do menu e do rodapé, o endereço mostra "Esta página não está disponível" e os links para ela desaparecem das outras páginas (por exemplo, o cartão "Lar temporário" da página inicial).
- **Seção desligada:** some da página. Desligar "Pontos de coleta" também tira os botões "Doar tampinhas" e "Achar o ponto de coleta".
- **A API também fecha os dados.** Com a página desligada, as rotas públicas correspondentes respondem 404: placar e certificado, histórias, prestação de contas, lista de pontos e os formulários de pedido. As rotas do painel continuam funcionando, então a equipe pode preparar o conteúdo.
- O início (`/`) e a página de privacidade não podem ser desligados.
- Ligar e desligar tem botão Desfazer e só administradores podem usar.

### Tema claro e escuro

- Na primeira visita o site **segue o tema do sistema** da pessoa e muda junto quando o sistema muda.
- O botão de sol ou lua no cabeçalho troca de tema com um clique. No rodapé, em **Aparência**, a pessoa escolhe entre **Automático**, **Claro** e **Escuro**.
- A escolha é **guardada no navegador** (`localStorage`, chave `patinhas-theme`). Ao voltar, o site já abre no tema certo, sem piscar, porque um pequeno script (`public/theme-init.js`) aplica o tema antes da página aparecer. Escolher Automático apaga a escolha guardada.
- O painel da equipe usa o mesmo tema e o mesmo botão.
- O cartaz e o certificado continuam sempre claros, porque são para imprimir.
- As cores do site vêm de variáveis em `apps/web/src/styles/tokens.css`, com um conjunto para cada tema.

### Cartaz imprimível

O cartaz é gerado no navegador, em A4, com o nome do espaço, o QR code (feito no próprio navegador, sem serviço externo) e as listas do que pode e não pode. Na impressão, só o cartaz sai, ocupando a folha inteira. Na tela de impressão, deixe as margens em "Nenhuma" e ative "Gráficos de segundo plano".

## Segurança

- **Login:** senha guardada com scrypt (custo 131.072; hashes antigos são regravados no próximo login). Mensagem de erro genérica e tempo de resposta igualado, para não revelar se o e-mail existe.
- **Sessão:** cookie `HttpOnly`, `SameSite=Lax` e, em produção, `Secure` com o prefixo `__Host-`. O servidor guarda só o HMAC do token. Trocar a senha, desativar a pessoa ou mudar o papel encerra as sessões dela.
- **CSRF:** escritas do painel e do login exigem o cabeçalho `Origin` igual ao do site. A checagem usa a rota que o servidor casou, não o texto da URL.
- **Autorização:** o login é verificado antes de qualquer validação do corpo da requisição (resposta 401). Rotas de administrador exigem o papel Administrador.
- **Limites de uso:** 5 tentativas de login por minuto (por IP e por IP mais e-mail), 5 pedidos por hora, 10 geocodificações por minuto e 120 requisições por minuto no geral.
- **Entrada:** todo corpo de requisição é validado com Zod, sem campos extras. Consultas ao banco usam o Prisma (sem SQL montado à mão com dados do usuário).
- **Cabeçalhos:** Helmet na API e política de segurança de conteúdo (CSP) no nginx. A documentação interativa (`/docs`) fica desligada em produção.
- **Configuração:** em produção a API recusa o `SESSION_SECRET` de exemplo. Segredos nunca vão para o repositório (`.env` está no `.gitignore`).
- **Dados pessoais:** os logs não guardam cookies, telefones nem e-mails. Os pedidos só são vistos pela equipe e podem ser apagados por administradores.
- **Uploads:** conferidos pelo conteúdo, com nome gerado pelo servidor e limite de tamanho.
- **Docker:** a API só abre porta em `127.0.0.1`, o banco não abre porta em produção, o container roda sem ser root e o site abre só em `127.0.0.1` por padrão.

## Arquitetura e estrutura de pastas

Monorepo com npm workspaces.

```
apps/api         API Fastify 5 (Prisma 7, PostgreSQL 16, Zod 4)
apps/web         Site público e painel /admin (React 19, Vite 8, CSS Modules, TanStack Query)
packages/shared  Contas e regras usadas pelo site e pela API (impacto, relatórios, geo, textos, páginas e seções)
seed             166 pontos de coleta, bairros e a lista oficial de bairros de Joinville
deploy           Exemplos de nginx e systemd, script de criação do banco de testes
docs             Referência da API, runbook, revisão de código e decisões de arquitetura
reference        Protótipo final usado como referência visual
```

### API (`apps/api/src`)

```
modules/         Um módulo por assunto: auth, users, collection-points, pickups, features,
                 site-settings, help-requests, stories, media, monthly-reports, addresses,
                 neighborhoods, dashboard, health
plugins/         auth, csrf, security (Helmet, CORS, rate limit), db, error-handler, swagger
lib/             Erros, paginação, ETag, datas e períodos, hash de senha, geocoder, ViaCEP
config/          Validação das variáveis de ambiente (falha na subida, nunca no meio de um pedido)
seed/            Carga inicial (pontos, configurações, primeiro administrador)
```

### Site e painel (`apps/web/src`)

```
pages/           As páginas públicas (home, school, leaderboard, certificate, help, report,
                 stories, denounce, privacy)
features/        Blocos com lógica própria: localizador, calculadora, "pode ou não pode", cartaz,
                 formulários de pedido, imagem do Instagram, tema, páginas e seções
admin/           O painel: layout, telas (pages), componentes e regras puras
components/      Peças reutilizáveis: botão, ícones, aviso de estado, imagem, cabeçalho de página
services/api/    Chamadas à API e hooks do TanStack Query (públicos e do painel)
content/         Textos fixos e itens de menu
styles/          Variáveis de cor e estilos globais
```

O estilo usa CSS Modules, sem Tailwind. As telas do painel compartilham `admin/admin.module.css`.

### Como as peças conversam

- O navegador fala só com `/api/v1/...`. Em desenvolvimento o Vite repassa essas chamadas para a API; em Docker o nginx do container do site faz isso.
- A API divide as camadas em rotas (entrada e saída), regras de negócio e acesso ao banco. Erros são tipados e traduzidos para respostas HTTP num lugar só.
- O site guarda o estado do servidor no TanStack Query (cache e revalidação) e não duplica esse estado em outro lugar.
- As contas que o site e a API repetiriam ficam em `packages/shared`.

## API

A referência completa, rota por rota, está em [docs/api.md](docs/api.md). Em desenvolvimento, a documentação interativa (Swagger) fica em `http://localhost:3847/docs`.

| Grupo        | Rotas principais                                                                                                                                                                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Públicas     | `GET /collection-points`, `/neighborhoods`, `/site-settings`, `/monthly-reports`, `/stories`, `/leaderboard`, `/leaderboard/points/:id`, `/media/:id`, `POST /help-requests`                                                                                           |
| Autenticação | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`                                                                                                                                                                                                                |
| Painel       | `/admin/collection-points`, `/admin/pickups`, `/admin/help-requests`, `/admin/monthly-reports`, `/admin/stories`, `/admin/media`, `/admin/features/:key`, `/admin/users`, `/admin/site-settings`, `/admin/dashboard`, `/admin/geocode-preview`, `/admin/neighborhoods` |
| Saúde        | `GET /health` e `GET /ready` (processo e banco, sem limite de uso)                                                                                                                                                                                                     |

Erros seguem sempre o mesmo formato, e listas têm paginação com o total de páginas.

## Configuração (.env)

Copie `.env.example` para `.env` (`make env`). As variáveis são validadas na subida da API e o erro cita o campo com problema. Nunca versione o `.env`.

| Variável                                                                                         | Para que serve                                                                                                 |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`                                                                              | Senha do banco no Docker                                                                                       |
| `WEB_PORT`, `WEB_BIND`, `API_PORT`, `DB_PORT`                                                    | Portas: site (8847), endereço do site (127.0.0.1), API para checagem (8848) e banco no desenvolvimento (54329) |
| `WEB_DEV_PORT`                                                                                   | Porta do servidor de desenvolvimento do site (5847)                                                            |
| `NODE_ENV`, `HOST`, `PORT`, `LOG_LEVEL`                                                          | Ambiente, endereço e porta da API (3847 no desenvolvimento) e nível de log                                     |
| `DATABASE_URL`, `TEST_DATABASE_URL`                                                              | Endereço do banco e do banco de testes                                                                         |
| `SESSION_SECRET`, `SESSION_TTL_HOURS`                                                            | Segredo das sessões (32 ou mais caracteres) e duração (24 horas)                                               |
| `COOKIE_SECURE`                                                                                  | Cookie só por HTTPS (padrão: ligado em produção)                                                               |
| `TRUST_PROXY`                                                                                    | Ligue atrás de um proxy, senão todo visitante parece ser o proxy para o limite de uso                          |
| `ALLOWED_ORIGINS`                                                                                | Origens extras permitidas nas escritas do painel (como o servidor de desenvolvimento)                          |
| `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`, `HELP_REQUEST_RATE_LIMIT_MAX`, `GEOCODE_RATE_LIMIT_MAX` | Limites de uso                                                                                                 |
| `UPLOAD_DIR`, `UPLOAD_MAX_BYTES`                                                                 | Pasta das fotos e tamanho máximo (5 MB)                                                                        |
| `VIACEP_URL`, `NOMINATIM_URL`, `GEOCODER_USER_AGENT`                                             | Serviços de CEP e de mapa. O User-Agent deve identificar o projeto e um contato                                |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`                                                        | O primeiro administrador, criado pelo seed (veja a primeira execução)                                          |

No Docker, o compose passa o `.env` inteiro para a API e força `NODE_ENV`, `HOST`, `PORT`, `DATABASE_URL`, `UPLOAD_DIR` e `TRUST_PROXY` com os valores que o container precisa.

## Desenvolvimento local

Para mexer no código com recarga automática (a API e o site rodando fora do Docker, só o banco no Docker).

Requisitos: Node.js 24 (arquivo `.nvmrc`; o `engines` aceita 22 ou mais), npm 10 ou mais e Docker (para o banco).

```bash
make install        # instala as dependências do lockfile
make env            # cria o .env (ajuste SESSION_SECRET e SEED_ADMIN_*)
make db-up          # só o PostgreSQL no Docker (cria também patinhas_test)
make generate       # gera o cliente do Prisma
make migrate        # aplica as migrações
make seed           # 166 pontos, configurações e o primeiro administrador
make dev            # API (3847) e site (5847) com recarga
```

Abra http://localhost:5847. O painel fica em `/admin/login`.

## Comandos do Makefile

Rode `make` para ver a lista completa. Os mais usados:

| Comando                                      | O que faz                                                            |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `make first-run`                             | Primeira subida com Docker: constrói, espera a saúde e faz o seed    |
| `make up`, `make down`, `make ps`            | Sobe, para e mostra o estado dos containers                          |
| `make logs`                                  | Acompanha o log da API                                               |
| `make docker-check`                          | Portas do `.env`, estado dos containers e últimos logs               |
| `make seed-docker`                           | Carrega pontos, configurações e administrador no banco do Docker     |
| `make neighborhoods`                         | Acrescenta os bairros oficiais que faltam (banco local)              |
| `make neighborhoods-docker`                  | O mesmo, para o banco do Docker                                      |
| `make backup`, `make restore file=...`       | Salva e restaura o banco e as fotos                                  |
| `make install`, `make env`                   | Instala dependências e cria o `.env`                                 |
| `make db-up`, `make db-down`                 | Só o PostgreSQL em Docker, com a porta aberta para o desenvolvimento |
| `make generate`, `make migrate`, `make seed` | Cliente do Prisma, migrações e carga inicial (banco local)           |
| `make migrate-new name=<mudança>`            | Cria uma migração sem aplicar                                        |
| `make dev`                                   | API e site com recarga                                               |
| `make check`                                 | Lint, formatação, tipos e testes, como o CI                          |

Os comandos que usam o banco local (`migrate`, `seed`, `neighborhoods`, `migrate-new`) conferem se a porta do banco está aberta e explicam o que fazer se não estiver.

## Testes e qualidade

- **Frameworks:** Vitest em todo o projeto, com React Testing Library no site. Os testes da API usam um PostgreSQL de verdade (`patinhas_test`) e aplicam as migrações sozinhos.
- **O que é coberto:** contas e regras puras (impacto, períodos, placar, páginas e seções), rotas da API (login, permissões, validação, pontos, retiradas, placar, prestação de contas, histórias, uploads, pedidos), telas do site e do painel e os controles de tema.
- **Rodar tudo:** `make check` (lint, formatação, tipos e testes). Para os testes da API, suba o banco antes (`make db-up`).
- **CI (GitHub Actions):** lint, formatação, tipos, testes com um PostgreSQL de serviço, build do site e uma verificação do Docker.
- **Convenções de código:** TypeScript estrito, sem `any`, sem `console.log` e sem comentários que repetem o código.

## Banco de dados

PostgreSQL 16 com Prisma. As migrações ficam em `apps/api/prisma/migrations`. A primeira também cria as restrições `CHECK` de `checks.sql`, que o Prisma não expressa. Para mudar o esquema:

```bash
npm run db:migrate -w @patinhas/api -- --create-only --name <mudança>
```

Edite o SQL gerado se precisar de uma restrição e depois rode `make migrate`.

| Tabela                   | O que guarda                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `users`, `sessions`      | A equipe (nome, e-mail, hash da senha, papel, ativo) e as sessões (só o hash do token)          |
| `neighborhoods`          | Os bairros, com a posição de âncora                                                             |
| `collection_points`      | Os pontos: nome, bairro, endereço, telefone, categoria, horário, posição, precisão e situação   |
| `pickups`                | As retiradas: ponto, data, peso e quem registrou                                                |
| `help_requests`          | Os pedidos dos formulários, com consentimento, situação e quem respondeu                        |
| `monthly_reports`        | A prestação de contas: mês, total em kg, texto, situação                                        |
| `stories`, `media_files` | As histórias e os arquivos de imagem                                                            |
| `site_settings`          | Uma única linha: ajustes de cálculo, números, contatos, Pix, CNPJ e a lista de itens desligados |
| `geocode_cache`          | O cache das consultas de endereço                                                               |

## Deploy e produção

O caminho recomendado é o Docker Compose. O passo a passo de produção, com HTTPS por um proxy, atualização, backup e restauração, rotação do segredo de sessão e a alternativa sem Docker (nginx e systemd), está em [docs/deploy-runbook.md](docs/deploy-runbook.md).

Pontos principais:

- Ponha um nginx (ou o proxy da Univille) na frente, com HTTPS, repassando para `127.0.0.1:WEB_PORT` e enviando `X-Forwarded-Proto` e o `Host` original.
- Mantenha o site preso a `127.0.0.1` (`WEB_BIND`) e deixe o proxy cuidar do acesso de fora.
- O estado fica em dois volumes: o banco (`db-data`) e as fotos (`uploads`). Agende o `make backup` e guarde as cópias fora do servidor.
- Depois de subir, confira `https://<dominio>/api/v1/health`, entre no painel, edite um ponto e veja a mudança no site.

## Convenções e decisões

- Código, arquivos, banco, API e commits em inglês. Textos do site e do painel em português do Brasil. Termos do negócio ficam em português mesmo no código (cedente, boleto, bairro e semelhantes).
- Commits seguem o padrão de commits convencionais: `tipo(escopo): resumo`.
- Nunca versione o `.env`. Copie o `.env.example`.

Documentos do projeto:

- [BUILD_PROMPT.md](BUILD_PROMPT.md): a especificação original. Os números que mudaram depois da pesquisa com a ONG (custo da castração, preço do quilo, média mensal, chave Pix) estão em [docs/decisions/0003-ngo-survey-data.md](docs/decisions/0003-ngo-survey-data.md) e valem mais que o prompt.
- [docs/api.md](docs/api.md): referência da API.
- [docs/deploy-runbook.md](docs/deploy-runbook.md): produção, backup, atualização e solução de problemas.
- [docs/REVIEW.md](docs/REVIEW.md): a revisão de código e o que ainda está aberto.
- Decisões de arquitetura: [0001 Tecnologias](docs/decisions/0001-stack.md), [0002 Front-end](docs/decisions/0002-frontend.md), [0003 Dados confirmados pela ONG](docs/decisions/0003-ngo-survey-data.md) e [0004 Docker e implantação](docs/decisions/0004-docker.md).

## Status

O site público, o painel e a API estão implementados, com os acréscimos recentes: placar e certificado, retiradas, páginas e seções ligáveis, tema claro e escuro e as telas de prestação de contas e histórias renovadas. Falta a etapa de endurecimento e SEO (pré-renderização e cartões de compartilhamento) e a implantação no servidor da Univille. A revisão de código mais recente e o que continua aberto estão em [docs/REVIEW.md](docs/REVIEW.md).
