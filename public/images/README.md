# Fotografias do site — Sabino Especialidades Médicas

Cada arquivo abaixo é um **espaço reservado** no layout. Para publicar uma foto
oficial, basta salvar a imagem com o nome exato indicado — nenhuma alteração de
código é necessária. Enquanto o arquivo não existir, o site exibe um espaço
reservado sóbrio, nunca uma imagem genérica no lugar de uma foto real da clínica.

## Arquivos

| Caminho | Onde aparece | Proporção sugerida |
|---|---|---|
| `clinic/hero.jpg` | Topo da página (destaque principal) | 4:5 (vertical) |
| `clinic/reception.jpg` | Seção "A Clínica" — imagem principal | 4:5 (vertical) |
| `clinic/consulting-room.jpg` | Seção "A Clínica" — recorte menor | 1:1 (quadrada) |
| `clinic/pediatrics.jpg` | Seção "Pediatria" | 4:5 (vertical) |
| `clinic/laboratory.jpg` | Seção "Exames" | 4:3 (horizontal) |
| `clinic/facade.jpg` | Galeria — imagem larga | 21:9 (panorâmica) |
| `clinic/reception-wide.jpg` | Galeria — inferior esquerda | 3:2 (horizontal) |
| `clinic/consulting-room-wide.jpg` | Galeria — inferior direita | 3:2 (horizontal) |
| `clinic/city.jpg` | Seção "Localização" | 21:9 (panorâmica) |
| `team/dr-clodoaldo.jpg` | Seção "Profissional" | 4:5 (vertical) |
| `logo-mark.png` | Cabeçalho, menu e rodapé | quadrada |

## Já publicadas

Estas vieram do perfil oficial **@clinicasabino** e já estão no ar:

- `clinic/hero.jpg` — recepção da clínica
- `clinic/city.jpg` — vista de São Gabriel do Oeste
- `team/dr-clodoaldo.jpg` — Dr. Clodoaldo Sabino

## Orientações para as fotos

- Luz natural, tons neutros, pouca saturação e contraste suave.
- Sem filtros pesados, sem textos ou marcas d'água sobre a imagem.
- Preferir JPG entre 1600 px e 2400 px no lado maior, salvo em qualidade alta.
- Enquadramento com folga nas bordas: o site recorta conforme a proporção da tabela.

## Antes de publicar a versão final

Em `src/lib/clinic-data.ts`, altere `showImagePlaceholders` para `false`. Isso
remove as legendas "Fotografia oficial será inserida após aprovação" dos espaços
que ainda estiverem sem imagem.
