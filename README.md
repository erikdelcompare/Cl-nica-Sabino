# Sabino Especialidades Médicas — Landing Page

Landing page premium da Sabino Especialidades Médicas (São Gabriel do Oeste — MS), construída para
apresentar a clínica, destacar o atendimento pediátrico e os exames laboratoriais, e conduzir o
visitante para agendamento pelo WhatsApp.

## Stack

- **Vite + React 19 + TypeScript**
- **Tailwind CSS v4** (tokens de design em `src/index.css`, via `@theme`)
- **Framer Motion** para reveals no scroll, parallax discreto no Hero e o menu mobile
- Sem bibliotecas de 3D/WebGL — a profundidade e os elementos "tridimensionais" são feitos com
  gradientes CSS e SVG (`src/components/decor`), mantendo o bundle leve

## Estrutura

```
src/
  assets/         # logo oficial da clínica (recortada do material enviado, sem redesenho)
  components/      # Header, Footer, botões, ícones, elementos decorativos
  hooks/           # scroll, parallax, lock de scroll do menu mobile
  lib/             # site-config.ts — dados centrais da clínica (endereço, WhatsApp, textos)
  sections/        # uma seção por arquivo (Hero, About, Pediatria, Services, ...)
```

Todos os textos são autorais, em português, sem Lorem Ipsum e sem alegações médicas não
comprovadas pelos materiais fornecidos pela clínica.

## Rodando localmente

```bash
npm install
npm run dev       # ambiente de desenvolvimento
npm run build     # build de produção (tsc + vite build)
npm run lint       # oxlint
npm run preview    # pré-visualiza o build de produção
```

## Antes de publicar

- **Domínio**: atualize `SITE_URL` em `src/lib/site-config.ts` e as URLs absolutas em
  `index.html` (canonical, Open Graph, Twitter) e em `public/robots.txt` / `public/sitemap.xml`
  para o domínio real da clínica.
- **Mapa**: a seção de Localização usa o embed público do Google Maps (sem chave de API). Em
  ambientes com acesso à internet ele carrega normalmente.

## Decisões de conteúdo

- **Depoimentos e galeria de fotos** foram deliberadamente omitidos: não havia depoimentos
  verificáveis nem fotografias em resolução suficiente para representar a clínica com honestidade.
- **Dados do médico**: apenas nome, especialidade e tempo de experiência (informações públicas
  confirmadas) foram usados. CRM, RQE, formação e certificações não constam por não estarem
  disponíveis nos materiais fornecidos.
- **Elementos visuais** (esferas douradas, moléculas em SVG, partículas) são composições
  conceituais/abstratas — não se apresentam como fotografias reais da clínica.
