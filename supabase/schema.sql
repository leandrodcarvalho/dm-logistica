-- =====================================================================
-- DM Logístic — estrutura do banco (Supabase / PostgreSQL)
-- Rode este arquivo inteiro no Supabase: SQL Editor > New query > Run.
-- Pode ser executado de novo sem perder dados (idempotente).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Perfis de acesso (1:1 com auth.users) ----------
create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  perfil text not null default 'funcionario' check (perfil in ('gerente', 'funcionario')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ---------- Centros de distribuição ----------
create table if not exists public.centros (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  cidade text,
  uf char(2),
  endereco text,
  responsavel text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ---------- Produtos (cada tamanho/cor é um SKU) ----------
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  nome text not null,
  categoria text not null,
  marca text,
  tamanho text,
  cor text,
  preco_original numeric(12, 2) not null default 0 check (preco_original >= 0),
  preco_outlet numeric(12, 2) not null default 0 check (preco_outlet >= 0),
  estoque_minimo integer not null default 5 check (estoque_minimo >= 0),
  imagem_url text,
  ativo boolean not null default true,
  atributos jsonb not null default '{}'::jsonb, -- campos extras até definirmos os definitivos
  criado_em timestamptz not null default now()
);
create index if not exists produtos_categoria_idx on public.produtos (categoria);

-- ---------- Saldo por produto x CD ----------
create table if not exists public.estoque (
  produto_id uuid not null references public.produtos (id) on delete cascade,
  centro_id uuid not null references public.centros (id) on delete cascade,
  quantidade integer not null default 0 check (quantidade >= 0),
  atualizado_em timestamptz not null default now(),
  primary key (produto_id, centro_id)
);

-- ---------- Histórico de movimentações ----------
create table if not exists public.movimentacoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrada', 'saida', 'transferencia', 'ajuste')),
  produto_id uuid not null references public.produtos (id),
  centro_origem_id uuid references public.centros (id),
  centro_destino_id uuid references public.centros (id),
  quantidade integer not null, -- em 'ajuste' é a diferença (pode ser negativa)
  observacao text,
  usuario_id uuid references auth.users (id),
  usuario_nome text,
  criado_em timestamptz not null default now()
);
create index if not exists mov_criado_idx on public.movimentacoes (criado_em desc);
create index if not exists mov_tipo_criado_idx on public.movimentacoes (tipo, criado_em desc);

-- ---------- Funções auxiliares de permissão ----------
create or replace function public.usuario_ativo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and ativo);
$$;

create or replace function public.eh_gerente() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and ativo and perfil = 'gerente');
$$;

-- ---------- Cria o perfil automaticamente quando um usuário é criado ----------
-- Todo usuário novo nasce como 'funcionario'. O gerente promove pela tela Usuários.
create or replace function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfis (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
for each row execute function public.criar_perfil();

-- ---------- Movimentação atômica (única forma de alterar o saldo) ----------
create or replace function public.registrar_movimentacao(
  p_tipo text,
  p_produto_id uuid,
  p_centro_origem_id uuid,
  p_centro_destino_id uuid,
  p_quantidade integer,
  p_observacao text default ''
) returns public.movimentacoes
language plpgsql security definer set search_path = public as $$
declare
  v_nome text;
  v_saldo integer;
  v_qtd integer := p_quantidade;
  v_obs text := coalesce(p_observacao, '');
  v_mov movimentacoes;
begin
  select nome into v_nome from perfis where id = auth.uid() and ativo;
  if v_nome is null then raise exception 'Usuário sem acesso.'; end if;
  if not exists (select 1 from produtos where id = p_produto_id) then raise exception 'Produto não encontrado.'; end if;

  if p_tipo = 'ajuste' then
    if not eh_gerente() then raise exception 'Apenas o perfil gerencial pode ajustar inventário.'; end if;
    if p_centro_destino_id is null then raise exception 'Selecione o CD.'; end if;
    if p_quantidade is null or p_quantidade < 0 then raise exception 'Informe a contagem (0 ou mais).'; end if;
    insert into estoque (produto_id, centro_id, quantidade) values (p_produto_id, p_centro_destino_id, 0) on conflict do nothing;
    select quantidade into v_saldo from estoque where produto_id = p_produto_id and centro_id = p_centro_destino_id for update;
    v_qtd := p_quantidade - v_saldo;
    update estoque set quantidade = p_quantidade, atualizado_em = now() where produto_id = p_produto_id and centro_id = p_centro_destino_id;
    v_obs := trim('Contagem: ' || p_quantidade || '. ' || v_obs);
    p_centro_origem_id := null;

  elsif p_tipo in ('entrada', 'saida', 'transferencia') then
    if p_quantidade is null or p_quantidade <= 0 then raise exception 'A quantidade deve ser maior que zero.'; end if;

    if p_tipo in ('saida', 'transferencia') then
      if p_centro_origem_id is null then raise exception 'Selecione o CD de origem.'; end if;
      select quantidade into v_saldo from estoque where produto_id = p_produto_id and centro_id = p_centro_origem_id for update;
      if coalesce(v_saldo, 0) < p_quantidade then
        raise exception 'Saldo insuficiente no CD de origem (disponível: %).', coalesce(v_saldo, 0);
      end if;
      update estoque set quantidade = quantidade - p_quantidade, atualizado_em = now()
       where produto_id = p_produto_id and centro_id = p_centro_origem_id;
    else
      p_centro_origem_id := null;
    end if;

    if p_tipo in ('entrada', 'transferencia') then
      if p_centro_destino_id is null then raise exception 'Selecione o CD de destino.'; end if;
      if p_centro_destino_id = p_centro_origem_id then raise exception 'Origem e destino devem ser diferentes.'; end if;
      insert into estoque (produto_id, centro_id, quantidade) values (p_produto_id, p_centro_destino_id, p_quantidade)
      on conflict (produto_id, centro_id) do update set quantidade = estoque.quantidade + excluded.quantidade, atualizado_em = now();
    else
      p_centro_destino_id := null;
    end if;
  else
    raise exception 'Tipo de movimentação inválido.';
  end if;

  insert into movimentacoes (tipo, produto_id, centro_origem_id, centro_destino_id, quantidade, observacao, usuario_id, usuario_nome)
  values (p_tipo, p_produto_id, p_centro_origem_id, p_centro_destino_id, v_qtd, v_obs, auth.uid(), v_nome)
  returning * into v_mov;
  return v_mov;
end;
$$;

revoke all on function public.registrar_movimentacao(text, uuid, uuid, uuid, integer, text) from public, anon;
grant execute on function public.registrar_movimentacao(text, uuid, uuid, uuid, integer, text) to authenticated;

-- ---------- Segurança por linha (RLS) ----------
alter table public.perfis enable row level security;
alter table public.centros enable row level security;
alter table public.produtos enable row level security;
alter table public.estoque enable row level security;
alter table public.movimentacoes enable row level security;

-- Leitura: qualquer usuário ativo e logado
drop policy if exists perfis_ler on public.perfis;
create policy perfis_ler on public.perfis for select to authenticated using (id = auth.uid() or eh_gerente());
drop policy if exists centros_ler on public.centros;
create policy centros_ler on public.centros for select to authenticated using (usuario_ativo());
drop policy if exists produtos_ler on public.produtos;
create policy produtos_ler on public.produtos for select to authenticated using (usuario_ativo());
drop policy if exists estoque_ler on public.estoque;
create policy estoque_ler on public.estoque for select to authenticated using (usuario_ativo());
drop policy if exists mov_ler on public.movimentacoes;
create policy mov_ler on public.movimentacoes for select to authenticated using (usuario_ativo());

-- Escrita de cadastros: somente gerente
drop policy if exists perfis_gerente on public.perfis;
create policy perfis_gerente on public.perfis for update to authenticated using (eh_gerente()) with check (eh_gerente());
drop policy if exists centros_gerente on public.centros;
create policy centros_gerente on public.centros for all to authenticated using (eh_gerente()) with check (eh_gerente());
drop policy if exists produtos_gerente on public.produtos;
create policy produtos_gerente on public.produtos for all to authenticated using (eh_gerente()) with check (eh_gerente());
-- estoque e movimentacoes: sem política de escrita => só via registrar_movimentacao()

-- ---------- Permissões de API (o RLS acima continua valendo) ----------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.perfis, public.centros, public.produtos, public.estoque, public.movimentacoes to authenticated;
grant execute on function public.eh_gerente(), public.usuario_ativo() to authenticated;
