# Patinhas Carentes Joinville: protótipo do site e do painel

Projeto de extensão (Univille, Engenharia de Software) para a ONG Patinhas Carentes Joinville.

## Como ver o site

Abra `site/index.html` no navegador. Precisa de internet para carregar as fontes (Google Fonts) e a biblioteca do QR code (cdnjs). As fotos ficam na mesma pasta.

O painel da equipe abre pelo link "Área da equipe" no topo do site. O login é só uma demonstração: qualquer dado entra.

## O que tem aqui

```
site/        site pronto (index.html) e as imagens
src/         código-fonte
  build-v4.js     gera site/index.html juntando tudo abaixo
  v4.css          estilos do site público
  v4.js           comportamento do site (medidor, busca de pontos, mapa, cartaz)
  admin.html      painel administrativo
  admin.css       estilos do painel
  admin.js        comportamento do painel
  pontos-line.txt os 166 pontos de coleta (nome, bairro, endereço, telefone, posição)
  mapdata-line.txt mapa vetorial de Joinville (dados do OpenStreetMap)
  map-js.txt      código do mapa
  legacy/         versão anterior do protótipo (o build lê dela alguns trechos)
```

## Como gerar o site de novo

Com Node.js instalado:

```
cd src
node build-v4.js
```

O resultado é gravado em `site/index.html`.

## Dados confirmados pela ONG (pesquisa respondida em 19/10/2026)

- Pontos de coleta: a ONG informa cerca de 110 ativos, mas pediu para manter as 166 entradas da lista. O site exibe 166.
- O quilo de tampinha rende R$ 2,00 e uma castração custa em média R$ 350, ou seja, cerca de 175 kg por castração (a conta antiga de 500 kg não vale mais).
- Arrecadação média: 1.500 kg por mês, o que paga cerca de 8 castrações por mês.
- CNPJ 45.559.299/0001-57, usado no rodapé e como chave Pix. A ONG informou que está em processo de formalização.
- WhatsApp oficial (47) 99145-7757. Respondem pedidos de escolas e empresas em até 2 horas.
- Números públicos pedidos: quilos de tampinha, pontos de coleta e animais atendidos no ano. O painel tem um cartão para editá-los.
- Painel: um único acesso (login único) da administradora, com experiência em painéis, usado uma vez por mês.
- Fotos do Instagram podem ser usadas (o perfil exige login para baixar; as fotos precisam ser salvas pela equipe). Histórias em primeira pessoa: depende do caso.
- Hoje não há site próprio, domínio nem hospedagem paga.

## O que ainda é exemplo (marcado no site)

Os pedidos recebidos no painel, os meses já publicados e as histórias de resgate são ilustrativos. Faltam: número de animais atendidos no ano (a ONG não soube informar; fica escondido até ser informado), uma história de resgate real e mais fotos.

## Premissa nossa

Uma tampinha pesa em média 2,5 g (400 por kg). Usada para converter quilos em unidades no medidor (aceita pela ONG). O medidor vai de 0 a 2.000 tampinhas, a escala de quem doa pouco, e mostra o valor em reais e o efeito de 100 pessoas doando o mesmo.

## Limitações do protótipo

- Salvar, publicar e remover no painel só mostram um aviso. Nada é gravado.
- O QR do cartaz leva a um endereço de exemplo.
- O mapa usa dados do OpenStreetMap embutidos. Mantenha o crédito "Mapa: OpenStreetMap".
- A posição de alguns pontos é aproximada pelo bairro (marcados na lista).

## Plano de implantação (decidido)

Site em React (Vite) com CMS headless (Strapi) em servidor Linux da Univille. O link para adoção aponta para o perfil da ONG no Adoteca.
