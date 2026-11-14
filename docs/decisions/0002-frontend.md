# 0002 Frontend

## Por que Leaflet direto, sem react-leaflet?

O agrupamento de pinos é próprio (por raio em pixels) e o mapa carrega sob demanda. Menos dependências e controle total do ciclo de vida.

## Por que CSS Modules com tokens?

Estilos isolados por componente e cores/espaços em `tokens.css`, fiéis ao protótipo.

## Por que fontsource?

As fontes vêm do próprio build, sem chamar o Google (LGPD e desempenho).

## Como o painel é carregado?

O painel (`/admin`) é um chunk separado, carregado sob demanda. Visitantes do site não baixam o código dele.

## Como o acesso é protegido no front?

`AdminGuard` consulta `/auth/me` e manda para `/admin/login` sem sessão. A proteção real é da API (cookie de sessão, CSRF por Origin, papéis ADMIN e EDITOR). A página Equipe e ajustes só aparece para ADMIN.

## Como a imagem do Instagram é gerada?

No navegador, com canvas (1080x1080 feed, 1080x1920 stories). Os textos vêm de `features/instagram/instagram-post.ts`, com a mesma regra de cálculo da página pública.
