-- Projetista Solar 3D — Rio Branco Solar
-- Esquema inicial: clientes, projetos, catálogo, orçamentos, versões publicadas,
-- políticas de segurança (RLS) e armazenamento privado.
--
-- Regra geral de acesso: somente o proprietário (usuário listado em public.proprietarios)
-- lê ou grava qualquer dado. Visitantes das propostas nunca acessam o banco diretamente:
-- o servidor do aplicativo consulta a versão publicada pelo hash do token.

create extension if not exists unaccent with schema extensions;
create schema if not exists privado;

-- ---------------------------------------------------------------- utilitários

create or replace function public.sem_acento(texto text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, texto));
$$;

create or replace function privado.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- --------------------------------------------------------------- proprietário

create table public.proprietarios (
  user_id uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);
comment on table public.proprietarios is
  'Usuários com acesso ao painel. Só é preenchida pelo script scripts/criar-proprietario.ts (chave de serviço).';

create or replace function privado.eh_proprietario()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.proprietarios p where p.user_id = (select auth.uid())
  );
$$;

-- Usada pelo servidor do aplicativo para confirmar a identidade do proprietário.
create or replace function public.sou_proprietario()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select privado.eh_proprietario();
$$;

-- -------------------------------------------------------------------- tabelas

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  nome_busca text generated always as (public.sem_acento(nome)) stored,
  telefone text,
  telefone_digitos text generated always as (regexp_replace(coalesce(telefone, ''), '\D', '', 'g')) stored,
  email text,
  cidade text,
  endereco text,
  observacoes text,
  demonstracao boolean not null default false,
  arquivado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index clientes_nome_busca_idx on public.clientes (nome_busca);
create index clientes_telefone_idx on public.clientes (telefone_digitos);

create table public.locais (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  nome text not null check (length(trim(nome)) > 0),
  tipo text not null default 'telhado' check (tipo in ('telhado', 'solo')),
  endereco text,
  cidade text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index locais_cliente_idx on public.locais (cliente_id);

create table public.catalogo_itens (
  id uuid primary key default gen_random_uuid(),
  -- Código estável dos itens iniciais (permite reaplicar a carga sem duplicar).
  codigo text unique,
  tipo text not null check (tipo in ('modulo', 'inversor', 'perfil', 'estrutura', 'fixacao', 'acessorio', 'servico')),
  fabricante text not null default '',
  modelo text not null check (length(trim(modelo)) > 0),
  descricao text not null default '',
  unidade text not null default 'un',
  specs jsonb not null default '{}'::jsonb,
  custo_centavos bigint not null default 0 check (custo_centavos >= 0),
  preco_centavos bigint not null default 0 check (preco_centavos >= 0),
  preco_demonstrativo boolean not null default false,
  status_dados text not null default 'pendente' check (status_dados in ('confirmado', 'pendente', 'demonstrativo')),
  fonte_url text,
  fonte_titulo text,
  fonte_consultada_em date,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index catalogo_tipo_idx on public.catalogo_itens (tipo, ativo);

create table public.projetos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  local_id uuid references public.locais (id) on delete set null,
  nome text not null check (length(trim(nome)) > 0),
  tipo text not null check (tipo in ('telhado', 'solo')),
  origem text not null default 'medidas' check (origem in ('medidas', 'gemini', 'chatgpt', 'modelo')),
  -- Medidas conhecidas informadas pelo proprietário.
  medidas jsonb not null default '{}'::jsonb,
  -- Geometria do editor: fonte única das vistas 2D e 3D (superfícies, módulos, estrutura).
  cena jsonb not null,
  -- Equipamentos do kit, geração estimada e verificação elétrica.
  kit jsonb not null default '{}'::jsonb,
  -- Última análise de IA recebida (auditoria do que veio da foto).
  analise jsonb,
  capa_caminho text,
  revisao integer not null default 1,
  demonstracao boolean not null default false,
  arquivado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index projetos_cliente_idx on public.projetos (cliente_id);

create table public.projeto_fotos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  caminho text not null unique,
  nome_original text,
  tipo_mime text,
  tamanho_bytes bigint,
  criado_em timestamptz not null default now()
);
create index projeto_fotos_projeto_idx on public.projeto_fotos (projeto_id);

create table public.modelos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  tipo text not null check (tipo in ('telhado', 'solo')),
  descricao text not null default '',
  conteudo jsonb not null,
  demonstracao boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create sequence public.orcamento_numero_seq;

create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique default (
    'ORC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.orcamento_numero_seq')::text, 4, '0')
  ),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  projeto_id uuid not null references public.projetos (id) on delete restrict,
  titulo text not null default 'Orçamento',
  validade date,
  garantias text not null default '',
  observacoes text not null default '',
  -- Valores monetários em centavos (inteiros).
  mao_de_obra_custo bigint not null default 0 check (mao_de_obra_custo >= 0),
  mao_de_obra_preco bigint not null default 0 check (mao_de_obra_preco >= 0),
  frete_custo bigint not null default 0 check (frete_custo >= 0),
  frete_preco bigint not null default 0 check (frete_preco >= 0),
  desconto bigint not null default 0 check (desconto >= 0),
  condicoes jsonb not null default '{}'::jsonb,
  exibicao jsonb not null default '{"modo":"total"}'::jsonb,
  total_centavos bigint not null default 0,
  custo_centavos bigint not null default 0,
  revisao integer not null default 1,
  revisao_publicada integer,
  demonstracao boolean not null default false,
  arquivado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index orcamentos_cliente_idx on public.orcamentos (cliente_id);
create index orcamentos_projeto_idx on public.orcamentos (projeto_id);
create index orcamentos_criado_idx on public.orcamentos (criado_em desc);

create table public.orcamento_itens (
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  id text not null,
  ordem integer not null default 0,
  origem text not null default 'manual' check (origem in ('desenho', 'kit', 'manual', 'servico')),
  -- Chave de agrupamento (material + perfil + dimensão) dos itens vindos do desenho.
  chave text,
  grupo text not null default '',
  descricao text not null default '',
  unidade text not null default 'un',
  quantidade numeric(14, 3) not null default 0 check (quantidade >= 0),
  -- Quantidade antes do último recálculo (para destacar o que mudou).
  quantidade_anterior numeric(14, 3),
  custo_unit bigint not null default 0 check (custo_unit >= 0),
  preco_unit bigint not null default 0 check (preco_unit >= 0),
  -- Preço ajustado à mão: não é sobrescrito pelo catálogo.
  preco_manual boolean not null default false,
  catalogo_id uuid references public.catalogo_itens (id) on delete set null,
  mostrar_descricao boolean not null default true,
  mostrar_preco boolean not null default false,
  primary key (orcamento_id, id)
);

create table public.proposta_versoes (
  id uuid primary key,
  orcamento_id uuid not null references public.orcamentos (id) on delete restrict,
  projeto_id uuid not null references public.projetos (id) on delete restrict,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  versao integer not null check (versao > 0),
  publicado_em timestamptz not null default now(),
  -- Conteúdo congelado no momento da publicação.
  snapshot_publico jsonb not null,   -- o que aparece antes do PIN (sem valores)
  snapshot_comercial jsonb not null, -- preços autorizados (somente após o PIN)
  snapshot_interno jsonb not null,   -- custos e margem (somente painel)
  total_centavos bigint not null,
  validade date,
  modo_exibicao text not null default 'total' check (modo_exibicao in ('total', 'grupos', 'itens')),
  capa_caminho text,
  -- Link individual: guardamos o hash para localizar e o token cifrado para o painel copiar de novo.
  token_hash text not null unique,
  token_cifrado text not null,
  -- PIN: apenas o hash (scrypt com sal e pimenta do servidor).
  pin_hash text not null,
  -- Incrementado ao trocar o PIN ou revogar: invalida todas as sessões de desbloqueio anteriores.
  pin_versao integer not null default 1,
  pin_tentativas integer not null default 0,
  pin_bloqueios integer not null default 0,
  pin_bloqueado_ate timestamptz,
  link_expira_em timestamptz,
  revogada_em timestamptz,
  status text not null default 'publicada' check (status in ('publicada', 'aceita', 'recusada', 'vencida', 'arquivada')),
  status_alterado_em timestamptz,
  visualizacoes integer not null default 0,
  ultima_visualizacao_em timestamptz,
  desbloqueios integer not null default 0,
  ultimo_desbloqueio_em timestamptz,
  unique (orcamento_id, versao)
);
create index proposta_versoes_cliente_idx on public.proposta_versoes (cliente_id, publicado_em desc);

-- ----------------------------------------------------- gatilhos de manutenção

create trigger clientes_atualizado before update on public.clientes
  for each row execute function privado.tocar_atualizado_em();
create trigger locais_atualizado before update on public.locais
  for each row execute function privado.tocar_atualizado_em();
create trigger catalogo_atualizado before update on public.catalogo_itens
  for each row execute function privado.tocar_atualizado_em();
create trigger projetos_atualizado before update on public.projetos
  for each row execute function privado.tocar_atualizado_em();
create trigger modelos_atualizado before update on public.modelos
  for each row execute function privado.tocar_atualizado_em();
create trigger orcamentos_atualizado before update on public.orcamentos
  for each row execute function privado.tocar_atualizado_em();

-- Uma versão publicada nunca muda: alterações no catálogo ou no rascunho não a afetam,
-- e nem a chave de serviço consegue reescrever o que foi apresentado ao cliente.
create or replace function privado.proteger_versao_publicada()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.orcamento_id is distinct from old.orcamento_id
    or new.projeto_id is distinct from old.projeto_id
    or new.cliente_id is distinct from old.cliente_id
    or new.versao is distinct from old.versao
    or new.publicado_em is distinct from old.publicado_em
    or new.snapshot_publico is distinct from old.snapshot_publico
    or new.snapshot_comercial is distinct from old.snapshot_comercial
    or new.snapshot_interno is distinct from old.snapshot_interno
    or new.total_centavos is distinct from old.total_centavos
    or new.validade is distinct from old.validade
    or new.modo_exibicao is distinct from old.modo_exibicao
    or new.capa_caminho is distinct from old.capa_caminho
    or new.token_hash is distinct from old.token_hash
    or new.token_cifrado is distinct from old.token_cifrado
  then
    raise exception 'Versões publicadas são imutáveis: publique uma nova versão.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger proposta_versoes_imutavel before update on public.proposta_versoes
  for each row execute function privado.proteger_versao_publicada();

-- -------------------------------------------------------------------- visões

create view public.versoes_resumo
with (security_invoker = true) as
select
  v.id,
  v.orcamento_id,
  v.projeto_id,
  v.cliente_id,
  v.versao,
  v.publicado_em,
  v.total_centavos,
  v.validade,
  v.modo_exibicao,
  v.link_expira_em,
  v.revogada_em,
  v.pin_bloqueado_ate,
  v.visualizacoes,
  v.ultima_visualizacao_em,
  v.desbloqueios,
  v.ultimo_desbloqueio_em,
  (v.capa_caminho is not null) as tem_capa,
  v.status as status_registrado,
  case
    when v.status = 'publicada'
      and v.validade is not null
      and v.validade < (now() at time zone 'America/Rio_Branco')::date
    then 'vencida'
    else v.status
  end as status
from public.proposta_versoes v;

create view public.orcamentos_resumo
with (security_invoker = true) as
select
  o.id,
  o.numero,
  o.titulo,
  o.cliente_id,
  o.projeto_id,
  o.total_centavos,
  o.custo_centavos,
  o.validade,
  o.revisao,
  o.demonstracao,
  o.arquivado_em,
  o.criado_em,
  o.atualizado_em,
  c.nome as cliente_nome,
  c.nome_busca as cliente_nome_busca,
  c.telefone_digitos as cliente_telefone_digitos,
  p.nome as projeto_nome,
  p.tipo as projeto_tipo,
  uv.id as ultima_versao_id,
  uv.versao as ultima_versao,
  uv.publicado_em as ultima_publicacao,
  uv.total_centavos as ultima_versao_total,
  (uv.id is not null and o.revisao > coalesce(o.revisao_publicada, 0)) as rascunho_alterado,
  case
    when o.arquivado_em is not null then 'arquivada'
    when uv.id is null then 'rascunho'
    else uv.status
  end as status
from public.orcamentos o
join public.clientes c on c.id = o.cliente_id
join public.projetos p on p.id = o.projeto_id
left join lateral (
  select vr.* from public.versoes_resumo vr
  where vr.orcamento_id = o.id
  order by vr.versao desc
  limit 1
) uv on true;

-- ------------------------------------------------------------------- funções

-- Salva o rascunho do orçamento inteiro de forma atômica (dados + itens), com controle de revisão.
-- Retorna a nova revisão, ou -1 quando o rascunho foi alterado em outro aparelho.
create or replace function public.salvar_orcamento(
  p_id uuid,
  p_revisao integer,
  p_dados jsonb,
  p_itens jsonb,
  p_total bigint,
  p_custo bigint
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_revisao integer;
begin
  update public.orcamentos o set
    titulo = coalesce(nullif(trim(p_dados ->> 'titulo'), ''), o.titulo),
    validade = nullif(p_dados ->> 'validade', '')::date,
    garantias = coalesce(p_dados ->> 'garantias', ''),
    observacoes = coalesce(p_dados ->> 'observacoes', ''),
    mao_de_obra_custo = coalesce((p_dados ->> 'mao_de_obra_custo')::bigint, 0),
    mao_de_obra_preco = coalesce((p_dados ->> 'mao_de_obra_preco')::bigint, 0),
    frete_custo = coalesce((p_dados ->> 'frete_custo')::bigint, 0),
    frete_preco = coalesce((p_dados ->> 'frete_preco')::bigint, 0),
    desconto = coalesce((p_dados ->> 'desconto')::bigint, 0),
    condicoes = coalesce(p_dados -> 'condicoes', '{}'::jsonb),
    exibicao = coalesce(p_dados -> 'exibicao', '{"modo":"total"}'::jsonb),
    total_centavos = p_total,
    custo_centavos = p_custo,
    revisao = o.revisao + 1
  where o.id = p_id and o.revisao = p_revisao
  returning o.revisao into v_revisao;

  if v_revisao is null then
    if exists (select 1 from public.orcamentos where id = p_id) then
      return -1;
    end if;
    raise exception 'Orçamento não encontrado.' using errcode = 'P0002';
  end if;

  delete from public.orcamento_itens where orcamento_id = p_id;
  insert into public.orcamento_itens (
    orcamento_id, id, ordem, origem, chave, grupo, descricao, unidade, quantidade,
    quantidade_anterior, custo_unit, preco_unit, preco_manual, catalogo_id,
    mostrar_descricao, mostrar_preco
  )
  select
    p_id, x.id, coalesce(x.ordem, 0), coalesce(x.origem, 'manual'), x.chave, coalesce(x.grupo, ''),
    coalesce(x.descricao, ''), coalesce(x.unidade, 'un'), coalesce(x.quantidade, 0),
    x.quantidade_anterior, coalesce(x.custo_unit, 0), coalesce(x.preco_unit, 0),
    coalesce(x.preco_manual, false),
    (select c.id from public.catalogo_itens c where c.id = x.catalogo_id),
    coalesce(x.mostrar_descricao, true), coalesce(x.mostrar_preco, false)
  from jsonb_to_recordset(coalesce(p_itens, '[]'::jsonb)) as x(
    id text, ordem integer, origem text, chave text, grupo text, descricao text, unidade text,
    quantidade numeric, quantidade_anterior numeric, custo_unit bigint, preco_unit bigint,
    preco_manual boolean, catalogo_id uuid, mostrar_descricao boolean, mostrar_preco boolean
  );

  return v_revisao;
end;
$$;

-- Grava uma versão publicada (congelada) do orçamento.
create or replace function public.publicar_orcamento(
  p_id uuid,
  p_orcamento_id uuid,
  p_snapshot_publico jsonb,
  p_snapshot_comercial jsonb,
  p_snapshot_interno jsonb,
  p_total bigint,
  p_validade date,
  p_modo text,
  p_capa_caminho text,
  p_token_hash text,
  p_token_cifrado text,
  p_pin_hash text,
  p_link_expira_em timestamptz,
  p_revogar_anteriores boolean
)
returns public.proposta_versoes
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_orc public.orcamentos;
  v_versao integer;
  v_nova public.proposta_versoes;
begin
  select * into v_orc from public.orcamentos where id = p_orcamento_id for update;
  if not found then
    raise exception 'Orçamento não encontrado.' using errcode = 'P0002';
  end if;

  select coalesce(max(versao), 0) + 1 into v_versao
  from public.proposta_versoes where orcamento_id = p_orcamento_id;

  if p_revogar_anteriores then
    update public.proposta_versoes
    set revogada_em = now(), pin_versao = pin_versao + 1
    where orcamento_id = p_orcamento_id and revogada_em is null;
  end if;

  insert into public.proposta_versoes (
    id, orcamento_id, projeto_id, cliente_id, versao, snapshot_publico, snapshot_comercial,
    snapshot_interno, total_centavos, validade, modo_exibicao, capa_caminho, token_hash,
    token_cifrado, pin_hash, link_expira_em
  ) values (
    p_id, p_orcamento_id, v_orc.projeto_id, v_orc.cliente_id, v_versao, p_snapshot_publico,
    p_snapshot_comercial, p_snapshot_interno, p_total, p_validade, p_modo, p_capa_caminho,
    p_token_hash, p_token_cifrado, p_pin_hash, p_link_expira_em
  )
  returning * into v_nova;

  update public.orcamentos
  set revisao_publicada = revisao, arquivado_em = null
  where id = p_orcamento_id;

  return v_nova;
end;
$$;

-- PIN da proposta: a tentativa é contada ANTES de conferir o PIN, com a linha travada,
-- para que pedidos em paralelo não escapem do limite.
create or replace function public.proposta_iniciar_tentativa(p_token_hash text, p_max integer default 5)
returns table (resultado text, id uuid, pin_hash text, pin_versao integer, bloqueado_ate timestamptz, restantes integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.proposta_versoes;
  v_ate timestamptz;
begin
  select * into v from public.proposta_versoes pv where pv.token_hash = p_token_hash for update;
  if not found then
    return query select 'inexistente'::text, null::uuid, null::text, null::integer, null::timestamptz, 0;
    return;
  end if;
  if v.revogada_em is not null then
    return query select 'revogada'::text, v.id, null::text, null::integer, null::timestamptz, 0;
    return;
  end if;
  if v.link_expira_em is not null and v.link_expira_em < now() then
    return query select 'expirada'::text, v.id, null::text, null::integer, null::timestamptz, 0;
    return;
  end if;
  if v.pin_bloqueado_ate is not null and v.pin_bloqueado_ate > now() then
    return query select 'bloqueada'::text, v.id, null::text, null::integer, v.pin_bloqueado_ate, 0;
    return;
  end if;
  if v.pin_tentativas >= p_max then
    v_ate := now() + least(interval '15 minutes' * power(2, least(v.pin_bloqueios, 10)), interval '24 hours');
    update public.proposta_versoes pv
    set pin_tentativas = 0, pin_bloqueios = pv.pin_bloqueios + 1, pin_bloqueado_ate = v_ate
    where pv.id = v.id;
    return query select 'bloqueada'::text, v.id, null::text, null::integer, v_ate, 0;
    return;
  end if;
  update public.proposta_versoes pv set pin_tentativas = pv.pin_tentativas + 1 where pv.id = v.id;
  return query select 'ok'::text, v.id, v.pin_hash, v.pin_versao, null::timestamptz, p_max - (v.pin_tentativas + 1);
end;
$$;

create or replace function public.proposta_concluir_tentativa(p_id uuid, p_sucesso boolean, p_max integer default 5)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.proposta_versoes;
  v_ate timestamptz;
begin
  select * into v from public.proposta_versoes pv where pv.id = p_id for update;
  if not found then
    return null;
  end if;
  if p_sucesso then
    update public.proposta_versoes pv
    set pin_tentativas = 0, pin_bloqueios = 0, pin_bloqueado_ate = null,
        desbloqueios = pv.desbloqueios + 1, ultimo_desbloqueio_em = now()
    where pv.id = p_id;
    return null;
  end if;
  if v.pin_tentativas >= p_max then
    v_ate := now() + least(interval '15 minutes' * power(2, least(v.pin_bloqueios, 10)), interval '24 hours');
    update public.proposta_versoes pv
    set pin_tentativas = 0, pin_bloqueios = pv.pin_bloqueios + 1, pin_bloqueado_ate = v_ate
    where pv.id = p_id;
    return v_ate;
  end if;
  return null;
end;
$$;

create or replace function public.proposta_registrar_visualizacao(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.proposta_versoes
  set visualizacoes = visualizacoes + 1, ultima_visualizacao_em = now()
  where id = p_id;
$$;

-- ------------------------------------------------------- segurança por linha

alter table public.proprietarios enable row level security;
alter table public.clientes enable row level security;
alter table public.locais enable row level security;
alter table public.catalogo_itens enable row level security;
alter table public.projetos enable row level security;
alter table public.projeto_fotos enable row level security;
alter table public.modelos enable row level security;
alter table public.orcamentos enable row level security;
alter table public.orcamento_itens enable row level security;
alter table public.proposta_versoes enable row level security;

create policy proprietarios_ver_o_proprio on public.proprietarios
  for select to authenticated using (user_id = (select auth.uid()));

create policy clientes_proprietario on public.clientes
  for all to authenticated
  using ((select privado.eh_proprietario())) with check ((select privado.eh_proprietario()));
create policy locais_proprietario on public.locais
  for all to authenticated
  using ((select privado.eh_proprietario())) with check ((select privado.eh_proprietario()));
create policy catalogo_proprietario on public.catalogo_itens
  for all to authenticated
  using ((select privado.eh_proprietario())) with check ((select privado.eh_proprietario()));
create policy projetos_proprietario on public.projetos
  for all to authenticated
  using ((select privado.eh_proprietario())) with check ((select privado.eh_proprietario()));
create policy projeto_fotos_proprietario on public.projeto_fotos
  for all to authenticated
  using ((select privado.eh_proprietario())) with check ((select privado.eh_proprietario()));
create policy modelos_proprietario on public.modelos
  for all to authenticated
  using ((select privado.eh_proprietario())) with check ((select privado.eh_proprietario()));
create policy orcamentos_proprietario on public.orcamentos
  for all to authenticated
  using ((select privado.eh_proprietario())) with check ((select privado.eh_proprietario()));
create policy orcamento_itens_proprietario on public.orcamento_itens
  for all to authenticated
  using ((select privado.eh_proprietario())) with check ((select privado.eh_proprietario()));

-- Versões publicadas: o proprietário lê, cria e atualiza (status, PIN, vencimento, revogação).
-- Não há política de exclusão: o histórico apresentado ao cliente não pode ser apagado pelo painel.
create policy versoes_ler on public.proposta_versoes
  for select to authenticated using ((select privado.eh_proprietario()));
create policy versoes_criar on public.proposta_versoes
  for insert to authenticated with check ((select privado.eh_proprietario()));
create policy versoes_atualizar on public.proposta_versoes
  for update to authenticated
  using ((select privado.eh_proprietario())) with check ((select privado.eh_proprietario()));

-- ------------------------------------------------------------------ concessões

revoke all on schema privado from public;
grant usage on schema privado to authenticated, service_role;
revoke all on all functions in schema privado from public;
grant execute on function privado.eh_proprietario() to authenticated, service_role;

-- Visitantes (anon) não recebem nenhum privilégio sobre as tabelas do aplicativo.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon, public;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon, public;
alter default privileges in schema public revoke all on sequences from anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
revoke delete on public.proposta_versoes from authenticated;
revoke insert, update, delete on public.proprietarios from authenticated;
grant usage on all sequences in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage on all sequences in schema public to service_role;

grant execute on function public.sem_acento(text) to authenticated, service_role;
grant execute on function public.sou_proprietario() to authenticated, service_role;
grant execute on function public.salvar_orcamento(uuid, integer, jsonb, jsonb, bigint, bigint) to authenticated, service_role;
grant execute on function public.publicar_orcamento(uuid, uuid, jsonb, jsonb, jsonb, bigint, date, text, text, text, text, text, timestamptz, boolean) to authenticated, service_role;
-- Fluxo do PIN: somente o servidor (chave de serviço).
grant execute on function public.proposta_iniciar_tentativa(text, integer) to service_role;
grant execute on function public.proposta_concluir_tentativa(uuid, boolean, integer) to service_role;
grant execute on function public.proposta_registrar_visualizacao(uuid) to service_role;

-- ------------------------------------------------------- armazenamento privado

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('fotos', 'fotos', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('capas', 'capas', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Fotos originais e capas: somente o proprietário. As capas das propostas publicadas
-- são entregues ao cliente pelo servidor, depois de conferir o token do link.
create policy armazenamento_proprietario_ler on storage.objects
  for select to authenticated
  using (bucket_id in ('fotos', 'capas') and (select privado.eh_proprietario()));
create policy armazenamento_proprietario_criar on storage.objects
  for insert to authenticated
  with check (bucket_id in ('fotos', 'capas') and (select privado.eh_proprietario()));
create policy armazenamento_proprietario_atualizar on storage.objects
  for update to authenticated
  using (bucket_id in ('fotos', 'capas') and (select privado.eh_proprietario()))
  with check (bucket_id in ('fotos', 'capas') and (select privado.eh_proprietario()));
create policy armazenamento_proprietario_excluir on storage.objects
  for delete to authenticated
  using (bucket_id in ('fotos', 'capas') and (select privado.eh_proprietario()));
