# Sabino Especialidades Médicas — Landing Page

Página institucional da Sabino Especialidades Médicas (São Gabriel do Oeste — MS).
Direção clean, editorial e médica: o refinamento vem do espaço, do alinhamento,
da fotografia e da tipografia — não de efeitos.

## Stack

- **Vite + React 19 + TypeScript**
- **Tailwind CSS v4** — tokens de design em `src/index.css` (bloco `@theme`)
- **Zero bibliotecas de animação.** As entradas ao rolar usam ~20 linhas de
  `IntersectionObserver` (`src/hooks/useReveal.ts`) + transições CSS.

Bundle de produção: **69 kB gzip** (JS) + 6,6 kB gzip (CSS).

## Onde editar o conteúdo

**Todo o conteúdo editável está em `src/lib/clinic-data.ts`.** Endereço, telefone,
textos, serviços, corpo clínico e credenciais ficam nesse único arquivo — não é
preciso mexer nos componentes.

### Campos que aguardam confirmação da clínica

O arquivo segue uma regra simples: **campo vazio não é renderizado**. Nada de
"[A CONFIRMAR]" aparece para o visitante. Basta preencher quando a clínica
autorizar:

| Campo | O que passa a aparecer |
|---|---|
| `team[].crm` / `team[].rqe` | Registro profissional ao lado da especialidade |
| `yearsExperience` | Faixa "27+ anos dedicados à Pediatria" |
| `openingHours` | Bloco de horários na seção Localização |
| `specialties` | Seção inteira de especialidades (oculta enquanto vazia) |
| `examTypes` | Lista de exames na seção Exames |
| `insurances` | Convênios aceitos |
| `contact.email` | E-mail no rodapé |
| `images.*` e `team[].photo` | Fotografias (hoje todas em espaço reservado) |

> A referência pública aos ~27 anos de experiência e à atuação em Neonatologia
> vem de publicação jornalística local de 2025. `yearsExperience` está como
> `null` de propósito — preencha apenas após autorização da clínica.

## Fotografias

Todos os espaços de fotografia estão **vazios**, aguardando as imagens oficiais
da clínica. Cada um exibe um reservado sóbrio — nenhuma imagem genérica é
apresentada como foto real da unidade.

Os campos ficam em `clinicData.images` (e `team[].photo` para o retrato do
médico). Para publicar uma foto: salve o arquivo em `public/images/` e escreva o
caminho no campo correspondente. A tabela completa de arquivos, campos,
proporções e orientações de fotografia está em
**[`public/images/README.md`](public/images/README.md)**.

## Comandos

```bash
npm install
npm run dev       # desenvolvimento
npm run build     # produção (tsc + vite build)
npm run lint      # oxlint
npm run preview   # pré-visualiza o build
```

## Antes de publicar

1. **Domínio** — trocar `SITE_URL` em `src/lib/clinic-data.ts` e as URLs
   absolutas em `index.html` (canonical, Open Graph, Twitter),
   `public/robots.txt` e `public/sitemap.xml`.
2. **Legendas dos reservados** — mudar `showImagePlaceholders` para `false` em
   `src/lib/clinic-data.ts`, removendo o texto "Fotografia oficial será inserida
   após aprovação" dos espaços ainda sem foto.
3. **Mapa** — a seção Localização usa o embed público do Google Maps, sem chave
   de API. Ele carrega normalmente em ambientes com acesso à internet.

## Sistema visual

| Papel | Cor |
|---|---|
| Fundo principal | `#F7F6F2` |
| Branco | `#FFFFFF` |
| Bege (alternância) | `#F2F0EA` |
| Grafite (áreas escuras) | `#262626` |
| Texto principal | `#252525` |
| Texto secundário | `#696969` |
| Linhas | `#E6E2DA` |
| Dourado (detalhe) | `#C4A24E` |
| Dourado sobre fundo claro | `#84692A` |
| Dourado sobre grafite | `#DCBD77` |

O dourado foi extraído da matiz da própria logo (42°) e escalonado até atingir
contraste AA. Todas as combinações de texto do site passam em WCAG AA
(mínimo aferido: 4,57:1).

Tipografia: **Cormorant Garamond** (títulos) e **Inter** (interface).

A página é predominantemente clara; o grafite aparece só na seção do profissional
e no CTA final, como contraste de fechamento.

## Acessibilidade

HTML semântico, um único `h1`, link "pular para o conteúdo", foco visível em
todos os interativos, menu mobile com `aria-modal`/`inert` e fechamento por
`Esc`, alvos de toque de 44 px, `alt` em todas as imagens e respeito a
`prefers-reduced-motion` (as entradas são desligadas, o conteúdo aparece direto).
