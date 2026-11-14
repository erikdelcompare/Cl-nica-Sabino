# Projetista Solar 3D — Rio Branco Solar

Sistema privado para cadastrar clientes, montar projetos fotovoltaicos de **telhado** ou **solo**
(editor 2D e 3D sobre a mesma geometria), calcular materiais, preparar orçamentos e publicar
**propostas com link individual e PIN**. Feito para usar no celular.

- **Stack:** Next.js 16 (App Router, TypeScript), React Three Fiber / Three.js, Supabase (PostgreSQL, Auth, Storage), Zod, pdf-lib.
- **Idioma e unidades:** português do Brasil, valores em reais (centavos no banco), medidas no sistema métrico.

---

## 1. O que o sistema faz

| Área | Entrega |
| --- | --- |
| Acesso | Login exclusivo do proprietário (conferido no servidor e no banco). Cadastro público desativado. |
| Clientes | Busca por nome (sem acento) e telefone. Vários locais, projetos e orçamentos por cliente. Histórico com data, projeto, versão, valor e status. Continuar rascunho, duplicar e arquivar. |
| Criar projeto | **Montar pelas medidas**, **Analisar foto com IA** (Gemini, cota gratuita) ou **Importar análise do ChatGPT** (prompt copiável, JSON validado e prévia antes de aplicar). Fotos do celular, de ângulos diferentes, ficam em bucket privado. |
| Editor | Planta 2D (grade, cotas, arraste de módulos, obstáculos, áreas e vértices do contorno) e vista 3D (girar, superior, lateral, camadas). Distribuição automática com dimensões reais do módulo, afastamentos e espaçamentos. Conflitos em vermelho/âmbar. Estrutura de telhado (trilhos, emendas, grampos, fixações) e de solo (postes, vigas, terças, fundações). Modelos reutilizáveis. |
| Salvamento | Automático com indicador de status (Salvo / Salvando / Não salvou / Alterado em outro aparelho) e botão **Salvar agora**. Tudo fica no servidor: ao reabrir, em outro aparelho, o último salvamento volta. Controle de revisão evita sobrescrever uma edição feita em outro lugar. |
| Catálogo | Módulos, inversores, perfis, estruturas, fixações, acessórios e serviços. Cada item com fonte, data de consulta e situação dos dados (confirmado, pendente, demonstrativo). Cadastrar, editar e desativar. |
| Kit | Módulos e inversores, kWp e kW, geração mensal estimada com origem, e **verificação elétrica** (Voc no frio, faixa de MPPT, corrente, strings) com itens manuais para confirmar. |
| Orçamento | Lista de materiais agrupada por material, perfil e dimensão. Recalcular destaca quantidades que mudaram, preserva avulsos e preços ajustados à mão. Custo, preço final e margem (só no painel). Validade, garantias, condições à vista, cartão e financiamento. Mostrar só o total, por grupo ou por item. |
| Publicação | Versão congelada (equipamentos, descrições, quantidades, preços e condições do momento). Link com token aleatório de 256 bits e PIN de 6 dígitos com botões de copiar separados. Trocar PIN, revogar, definir vencimento, marcar aceita/recusada. Histórico mostra exatamente o que foi enviado. |
| Proposta do cliente | Capa, projeto em 2D e 3D (com 2D de reserva), kit e materiais **sem valores**. Valores só depois do PIN. PDF comercial com a identidade da Rio Branco Solar. Sem conta. Não indexável. |

---

## 2. Rodar localmente

Pré-requisitos: Node 22+, Docker (para o Supabase local).

```bash
npm install
cp .env.example .env.local        # ajuste PROPOSTA_SEGREDO (openssl rand -base64 48)
npm run db:start                  # sobe o Supabase local (PostgreSQL, Auth, Storage)
npm run db:reset                  # aplica migrações e seed.sql
npm run proprietario:criar -- --email voce@exemplo.com.br --senha "senha-forte-aqui"
npm run seed:catalogo             # catálogo inicial com fontes
npm run seed:demo                 # dois projetos completos, clientes e orçamentos fictícios
npm run dev                       # http://localhost:3000
```

As chaves do `.env.local` de desenvolvimento são as **padrões do Supabase local** (não são segredos de produção).

### Testes

```bash
npm run typecheck     # TypeScript
npm run lint          # ESLint
npm run test:unit     # 42 testes: geometria, distribuição, estrutura, materiais, orçamento, dinheiro, análise
npm run build && npm run start -- -p 3100 &   # servidor de produção
npm run test:e2e      # fluxo completo do painel e da proposta (Playwright)
```

Para o Playwright usar o Chromium já instalado no ambiente, defina `PW_CHROMIUM=/caminho/do/chrome`.

---

## 3. Implantação

### 3.1 Supabase (produção)

1. Crie um projeto em <https://supabase.com>. Anote **Project URL**, **publishable (anon) key** e **secret (service_role) key** (Project Settings → API).
2. Vincule e aplique as migrações:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-do-projeto>
   npm run db:migrar-producao          # supabase db push
   ```
   As migrações criam tabelas, RLS, funções de publicação e de PIN, e os buckets privados `fotos` e `capas`.
3. **Desative o cadastro público:** Authentication → Sign In / Providers → Email → desligue *Allow new users to sign up*.
   (Também consta em `supabase/config.toml` para o ambiente local: `enable_signup = false`.)
4. Cadastre o proprietário com a chave de serviço, a partir da sua máquina:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=<secret-key> \
   npm run proprietario:criar -- --email voce@suaempresa.com.br --senha "senha-forte"
   ```
   Depois, carregue o catálogo: `npm run seed:catalogo` (mesmas variáveis).
   Demonstrações (opcional, dados fictícios): `npm run seed:demo`.

### 3.2 Vercel

1. Importe o repositório. Framework: **Next.js**. Node: 22.
2. Cadastre as variáveis de ambiente (Settings → Environment Variables). Use **Production** e **Preview** conforme o caso.

| Variável | Onde fica | Obrigatória | Observação |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | público | sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | público | sim | chave publicável; acesso limitado por RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **somente servidor** | sim | proposta pública e scripts. Nunca no navegador |
| `OWNER_EMAIL` | servidor | sim | e-mail do único proprietário |
| `PROPOSTA_SEGREDO` | servidor | sim | ≥ 32 caracteres aleatórios. Gere com `openssl rand -base64 48`. Trocar invalida PIN, sessões e links existentes |
| `NEXT_PUBLIC_APP_URL` | público | sim | domínio final, ex.: `https://propostas.suaempresa.com.br` (usado nos links) |
| `PROPOSTA_SESSAO_MINUTOS` | servidor | não | duração do desbloqueio por PIN (padrão 120) |
| `EMPRESA_NOME`, `EMPRESA_CONTATO`, `EMPRESA_CIDADE` | servidor | não | identidade nas propostas e no PDF |
| `GEMINI_API_KEY` | **somente servidor** | não | sem ela, a análise por foto fica indisponível (o resto funciona) |
| `GEMINI_MODEL` | servidor | não | padrão `gemini-3.8-flash` |

3. Faça o deploy. Depois, em Supabase → Authentication → URL Configuration, deixe a **Site URL** no domínio do sistema.
4. Confira: `https://<dominio>/login` deve abrir; `/clientes` sem sessão redireciona ao login; `/p/<token>` mostra a proposta.

Cabeçalhos de segurança já configurados em `next.config.ts`: `X-Robots-Tag: noindex`, `X-Frame-Options: DENY`, `Referrer-Policy`, e `no-store` nas rotas de proposta. O `robots.txt` bloqueia indexação.

### 3.3 Gemini (análise de foto, opcional)

1. Em <https://aistudio.google.com>, crie uma chave de API **em um projeto sem faturamento** (cota gratuita).
2. Defina `GEMINI_API_KEY` no servidor (Vercel e `.env.local`). Não use `NEXT_PUBLIC_`.
3. O modelo padrão é `gemini-3.8-flash` (entrada de imagem e saída de texto; listado na cota gratuita em 14/11/2026). Mude com `GEMINI_MODEL` se o Google alterar a cota.
4. **Antes de enviar a foto**, a tela mostra o aviso: no nível gratuito, o Google pode usar o conteúdo para melhorar produtos e revisores humanos podem ler as entradas e saídas. O envio só acontece com o aceite marcado.
5. Erros tratados: chave ausente (503, orienta a usar o editor ou o ChatGPT), cota atingida (429), projeto restrito (403), indisponibilidade (503), resposta fora do formato (502).
6. O cliente que abre a proposta **nunca** dispara chamadas de IA.

### 3.4 Importar análise do ChatGPT (sem chave)

1. Em **Novo projeto → Importar do ChatGPT**, copie o prompt (já traz as medidas cadastradas e o JSON esperado).
2. No ChatGPT Plus, anexe a foto do local e cole o prompt.
3. Copie a resposta JSON e cole no sistema. **Ver prévia** valida o formato e mostra o que veio da foto e o que precisa de confirmação. Só então **Aplicar e criar projeto**.

As medidas informadas por você sempre prevalecem sobre a foto. Ex.: foto + medidas de 4 × 12 m gera o rascunho em 4 × 12 m, com inclinação e obstáculos ajustáveis.

---

## 4. Como testar a primeira proposta (passo a passo)

1. Entre com o e-mail do proprietário em `/login`.
2. **Clientes → + Novo cliente** (nome e telefone).
3. Dentro do cliente: **+ Novo projeto → Montar pelas medidas**: telhado, 12 × 4 m. Crie.
4. No desenho, aba **Módulos**: escolha o modelo (ex.: Trina 620 Wp). A distribuição aparece; confira "0 com erro".
5. Aba **Kit** (botão no topo): adicione o inversor, estime a geração e **Salvar kit**.
6. Botão **Orçamento** → **Criar orçamento deste projeto**. Ajuste mão de obra, frete e condições. Use **Recalcular lista de materiais** se mudar o desenho.
7. **Finalizar orçamento e publicar** → copie o **link** e o **PIN** (são mostrados uma vez; o PIN pode ser trocado depois).
8. Abra o link **no celular** (ou em janela anônima): você verá capa, projeto e kit. Não há valores. **Ver orçamento** → digite o PIN → valores, parcelas e **Baixar PDF**.
9. Na versão publicada: **Trocar PIN** encerra o desbloqueio anterior; **Revogar** desativa o link; **Ver o que foi enviado** mostra o registro congelado.

---

## 5. Segurança (resumo)

- **Autenticação:** senha do Supabase Auth; cadastro público desligado; `proxy.ts` renova a sessão; cada página e ação chama `exigirProprietario()`, que confere o usuário no servidor **e** a tabela `proprietarios`.
- **RLS:** todas as tabelas exigem `eh_proprietario()`. `anon` não tem privilégio algum. Visitantes da proposta não acessam o banco: o servidor consulta por hash do token.
- **Storage:** buckets `fotos` e `capas` privados. Políticas só para o proprietário. A capa do cliente é entregue pelo servidor, depois de conferir o link.
- **Link:** token de 256 bits; o banco guarda apenas o SHA-256; o painel recupera o link pela versão cifrada (AES-256-GCM).
- **PIN:** 6 dígitos gerados com CSPRNG; hash **scrypt** com sal, pimenta (HMAC com `PROPOSTA_SEGREDO`) e vínculo à versão. Limite de 5 tentativas com bloqueio de 15 min dobrando a cada ciclo. A tentativa é contada no banco com a linha travada.
- **Sessão de desbloqueio:** cookie `HttpOnly`, `SameSite=Lax`, assinado (HMAC) e com validade. Carrega a época do PIN: trocar PIN ou revogar invalida todos os desbloqueios anteriores.
- **Dados antes do PIN:** o HTML, as respostas da API e os arquivos não contêm preços, custos, margem nem o hash do PIN (coberto por teste E2E).
- **Versões imutáveis:** trigger no banco impede alterar snapshots e o token de uma versão publicada. Não há política de exclusão de versões para o painel.

---

## 6. Dados de demonstração e fontes

`npm run seed:demo` cria:

1. **Telhado de fibrocimento sobre madeira, 4 × 12 m** (cliente *Marta Oliveira (demonstração)*): 9 módulos Trina 620 Wp em retrato, trilhos, grampos, fixações, caixa d'água, inversor Auxsol ASN-5SL-G2, orçamento e proposta publicada.
2. **Estrutura de solo, 20 módulos em 2 fileiras de 10** (cliente *Sítio Boa Esperança (demonstração)*): postes de concreto, vigas e terças de perfil U, fundações, inversor Solplanet ASW10000-S, orçamento e proposta publicada.

Os PINs e links de demonstração ficam em `.demo-acessos.json` (local, fora do Git).

**Fontes dos dados técnicos** (consultadas em 14/11/2026, registradas em cada item do catálogo):

| Item | Fonte |
| --- | --- |
| Trina Vertex N TSM-620/630NED19RC.20 (620 e 630 W) | Datasheet Trina TSM_AUS_EN_2025_PA4 (dimensões 2382×1134×30 mm, dados STC) |
| Canadian Solar HiKu7 CS7N-650MS (650 W) | Datasheet CSI HiKu7 CS7N-MS v2.41 EN (2384×1303×35 mm) |
| Solis S6-GR1P5K-S | Datasheet Ginlong/Solis S6-GR1P(4-5)K-S, IND V2.1 (2024-09) |
| Sofar 5KTLM-G3 e 6KTLM-G3 | Ficha técnica SOFAR 3K~6KTLM-G3 (português, Brasil) |
| Auxsol ASN-5SL-G2 e ASN-6SL-G2 | Datasheet AUX ASN-(3-3.3)SL / ASN-(3.6-6)SL-G2 (2025_05) |
| Solplanet ASW10000-S | Ficha técnica Série ASW S 6 a 10 kW (pt, 09/2021) |
| Postes, vigas, terças, trilhos, grampos, acessórios e serviços | **Demonstrativos** (sem fonte pública confirmada) |

Pontos a confirmar antes de usar em proposta real (todos marcados como **pendente** no catálogo):

- **"Planet"** foi tratada como **Solplanet (AISWEI)**, a marca de inversores com esse nome vendida no Brasil. Se for outra marca, ajuste ou desative o item.
- Os dados dos módulos são das fichas globais/australianas. Confirme a ficha do lote vendido e o registro no INMETRO.
- Preços, custos, validade, garantias e condições de pagamento das demonstrações são **fictícios**.
- Não há fotos reais nas demonstrações: os projetos foram montados a partir das medidas. A capa é capturada pela vista 3D do próprio projeto (botão **Capturar capa**).

---

## 7. Estrutura do código

```
src/
  app/
    (painel)/        clientes, projetos (editor, kit, orçamento), orçamentos, catálogo, modelos
    p/[token]/       proposta pública (cliente, sem conta)
    api/             fotos, capa, análise Gemini, rotas públicas da proposta (PIN, comercial, PDF, capa)
    login/           acesso do proprietário
  components/        UI, planta 2D, cena 3D (R3F), editor e painéis
  lib/
    dominio/         geometria, cena, distribuição, estrutura, kit, materiais, orçamento, validação, análise
    catalogo/        catálogo inicial com fontes
    demo/            projetos de demonstração
    servidor/        Supabase, auth, publicação, sessão da proposta, Gemini, PDF
    seguranca/       tokens, PIN (scrypt), cookies assinados
    pdf/             PDF comercial
supabase/
  migrations/        esquema, RLS, storage, funções de publicação e de PIN
scripts/             proprietário, seed do catálogo e das demonstrações
tests/               unit (Vitest) e e2e (Playwright)
```

---

## 8. Limitações conhecidas

- A análise real por Gemini **não foi executada** nesta entrega (sem chave disponível no ambiente). O caminho sem chave foi testado.
- Não há fotos reais nos dados de demonstração.
- Os cálculos de estrutura e de geração são **de apoio**: representação prevista e estimativa, sujeitas a validação técnica e a projeto assinado por profissional habilitado.
- O 3D depende de WebGL. Quando o aparelho não tem, a planta 2D é mostrada.
- Alterar o catálogo ou o rascunho não muda propostas já publicadas. Para refletir um novo preço ao cliente, publique uma nova versão.
