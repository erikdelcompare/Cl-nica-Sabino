# Fotografias do site — Sabino Especialidades Médicas

Todos os espaços de fotografia estão **vazios**, aguardando as imagens oficiais
da clínica. Enquanto isso, o site exibe um espaço reservado sóbrio — nunca uma
imagem genérica no lugar de uma foto real da unidade.

## Como publicar uma foto

1. Salve o arquivo nesta pasta (`clinic/` ou `team/`), com o nome da tabela abaixo.
2. Abra `src/lib/clinic-data.ts` e escreva o caminho no campo correspondente:

   ```ts
   images: {
     hero: '/images/clinic/hero.jpg',   // era ''
     ...
   }
   ```

A foto do médico fica em `team[].photo`, no mesmo arquivo.

## Arquivos

| Arquivo | Campo em `clinic-data.ts` | Onde aparece | Proporção |
|---|---|---|---|
| `clinic/hero.jpg` | `images.hero` | Topo da página (destaque principal) | 4:5 (vertical) |
| `clinic/reception.jpg` | `images.reception` | Seção "A Clínica" — imagem principal | 4:5 (vertical) |
| `clinic/consulting-room.jpg` | `images.consultingRoom` | Seção "A Clínica" — recorte menor | 1:1 (quadrada) |
| `clinic/pediatrics.jpg` | `images.pediatrics` | Seção "Pediatria" | 4:5 (vertical) |
| `clinic/laboratory.jpg` | `images.laboratory` | Seção "Exames" | 4:3 (horizontal) |
| `clinic/facade.jpg` | `images.facade` | Galeria — imagem larga | 21:9 (panorâmica) |
| `clinic/reception-wide.jpg` | `images.receptionWide` | Galeria — inferior esquerda | 3:2 (horizontal) |
| `clinic/consulting-room-wide.jpg` | `images.consultingRoomWide` | Galeria — inferior direita | 3:2 (horizontal) |
| `clinic/city.jpg` | `images.city` | Seção "Localização" | 21:9 (panorâmica) |
| `team/dr-clodoaldo.jpg` | `team[].photo` | Seção "Profissional" | 4:5 (vertical) |
| `logo-mark.png` | — (fixo) | Cabeçalho, menu e rodapé | quadrada |

## Orientações para as fotos

- Luz natural, tons neutros, pouca saturação e contraste suave.
- Sem filtros pesados, sem textos ou marcas d'água sobre a imagem.
- Preferir JPG entre 1600 px e 2400 px no lado maior, salvo em qualidade alta.
- Enquadramento com folga nas bordas: o site recorta conforme a proporção da tabela.

## Antes de publicar a versão final

Em `src/lib/clinic-data.ts`, altere `showImagePlaceholders` para `false`. Isso
remove as legendas "Fotografia oficial será inserida após aprovação" dos espaços
que ainda estiverem sem imagem.
