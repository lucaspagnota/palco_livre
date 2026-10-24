-- Palco Livre: contas, músicas, repertórios e grupos.
-- Regras: cada um edita o que é seu. Quem está num grupo enxerga os repertórios
-- do grupo e as músicas deles; se o dono marcou "Edição pública", também pode editar.

create extension if not exists pgcrypto;

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  nick text not null unique,
  email text not null default '',
  uf text not null default '',
  criado_em timestamptz not null default now()
);

create table public.musicas (
  id uuid primary key default gen_random_uuid(),
  dono_id uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  titulo text not null,
  artista text not null default '',
  estilo text not null default '',
  tom text not null default '',
  capo smallint check (capo between 1 and 12),
  letra text not null default '',
  publica boolean not null default false,
  copias integer not null default 0,
  atualizado_em timestamptz not null default now()
);
create index musicas_dono on public.musicas (dono_id);

create table public.repertorios (
  id uuid primary key default gen_random_uuid(),
  dono_id uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  titulo text not null,
  estilo text not null default '',
  numerar boolean not null default true,
  publica boolean not null default false,
  copias integer not null default 0,
  atualizado_em timestamptz not null default now()
);
create index repertorios_dono on public.repertorios (dono_id);

-- Cada linha é uma música, o título de um bloco ("momento") ou uma pausa entre as músicas (ÁGUA...).
create table public.repertorio_itens (
  repertorio_id uuid not null references public.repertorios (id) on delete cascade,
  posicao integer not null,
  musica_id uuid references public.musicas (id) on delete cascade,
  momento text,
  pausa text,
  primary key (repertorio_id, posicao),
  check (num_nonnulls(musica_id, momento, pausa) = 1)
);
create index repertorio_itens_musica on public.repertorio_itens (musica_id);

create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  dono_id uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  titulo text not null,
  atualizado_em timestamptz not null default now()
);

create table public.grupo_membros (
  grupo_id uuid not null references public.grupos (id) on delete cascade,
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  primary key (grupo_id, perfil_id)
);
create index grupo_membros_perfil on public.grupo_membros (perfil_id);

create table public.grupo_repertorios (
  grupo_id uuid not null references public.grupos (id) on delete cascade,
  repertorio_id uuid not null references public.repertorios (id) on delete cascade,
  adicionado_por uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  primary key (grupo_id, repertorio_id)
);
create index grupo_repertorios_rep on public.grupo_repertorios (repertorio_id);

-- Funções de permissão (security definer para não entrar em laço nas políticas).

create or replace function public.no_grupo(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from grupos where id = g and dono_id = auth.uid())
      or exists (select 1 from grupo_membros where grupo_id = g and perfil_id = auth.uid());
$$;

create or replace function public.ve_repertorio(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from repertorios where id = r and dono_id = auth.uid())
      or exists (select 1 from grupo_repertorios gr where gr.repertorio_id = r and public.no_grupo(gr.grupo_id));
$$;

create or replace function public.edita_repertorio(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from repertorios where id = r and (dono_id = auth.uid() or (publica and public.ve_repertorio(r))));
$$;

create or replace function public.ve_musica(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from musicas where id = m and dono_id = auth.uid())
      or exists (select 1 from repertorio_itens ri where ri.musica_id = m and public.ve_repertorio(ri.repertorio_id));
$$;

create or replace function public.mesmo_grupo(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from grupos g
    where (g.dono_id = auth.uid() or exists (select 1 from grupo_membros x where x.grupo_id = g.id and x.perfil_id = auth.uid()))
      and (g.dono_id = p or exists (select 1 from grupo_membros y where y.grupo_id = g.id and y.perfil_id = p))
  );
$$;

alter table public.perfis enable row level security;
alter table public.musicas enable row level security;
alter table public.repertorios enable row level security;
alter table public.repertorio_itens enable row level security;
alter table public.grupos enable row level security;
alter table public.grupo_membros enable row level security;
alter table public.grupo_repertorios enable row level security;

create policy perfis_ver on public.perfis for select using (id = auth.uid() or public.mesmo_grupo(id));
create policy perfis_editar on public.perfis for update using (id = auth.uid()) with check (id = auth.uid());

create policy musicas_ver on public.musicas for select using (public.ve_musica(id));
create policy musicas_criar on public.musicas for insert with check (dono_id = auth.uid());
create policy musicas_editar on public.musicas for update
  using (dono_id = auth.uid() or (publica and public.ve_musica(id)))
  with check (true);
create policy musicas_apagar on public.musicas for delete using (dono_id = auth.uid());

create policy repertorios_ver on public.repertorios for select using (public.ve_repertorio(id));
create policy repertorios_criar on public.repertorios for insert with check (dono_id = auth.uid());
create policy repertorios_editar on public.repertorios for update using (public.edita_repertorio(id)) with check (true);
create policy repertorios_apagar on public.repertorios for delete using (dono_id = auth.uid());

create policy itens_ver on public.repertorio_itens for select using (public.ve_repertorio(repertorio_id));
create policy itens_mudar on public.repertorio_itens for all
  using (public.edita_repertorio(repertorio_id))
  with check (public.edita_repertorio(repertorio_id) and (musica_id is null or public.ve_musica(musica_id)));

create policy grupos_ver on public.grupos for select using (public.no_grupo(id));
create policy grupos_criar on public.grupos for insert with check (dono_id = auth.uid());
create policy grupos_editar on public.grupos for update using (dono_id = auth.uid()) with check (dono_id = auth.uid());
create policy grupos_apagar on public.grupos for delete using (dono_id = auth.uid());

create policy membros_ver on public.grupo_membros for select using (public.no_grupo(grupo_id));
create policy membros_adicionar on public.grupo_membros for insert
  with check (exists (select 1 from public.grupos g where g.id = grupo_id and g.dono_id = auth.uid()));
-- O dono tira qualquer um; cada membro pode sair ("Deixar grupo").
create policy membros_remover on public.grupo_membros for delete
  using (perfil_id = auth.uid() or exists (select 1 from public.grupos g where g.id = grupo_id and g.dono_id = auth.uid()));

create policy grupo_rep_ver on public.grupo_repertorios for select using (public.no_grupo(grupo_id));
-- Qualquer integrante pode colocar no grupo um repertório que é dele.
create policy grupo_rep_adicionar on public.grupo_repertorios for insert
  with check (public.no_grupo(grupo_id) and adicionado_por = auth.uid()
    and exists (select 1 from public.repertorios r where r.id = repertorio_id and r.dono_id = auth.uid()));
create policy grupo_rep_remover on public.grupo_repertorios for delete
  using (adicionado_por = auth.uid() or exists (select 1 from public.grupos g where g.id = grupo_id and g.dono_id = auth.uid()));

-- Perfil criado junto com a conta. O nick vem do cadastro (ou do começo do e-mail).
create or replace function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text := lower(regexp_replace(coalesce(nullif(new.raw_user_meta_data ->> 'nick', ''), split_part(new.email, '@', 1)), '[^a-zA-Z0-9_.]', '', 'g'));
  apelido text := base;
  n integer := 1;
begin
  if apelido = '' then apelido := 'musico'; base := 'musico'; end if;
  while exists (select 1 from perfis where nick = apelido) loop
    n := n + 1;
    apelido := base || n;
  end loop;
  insert into perfis (id, nome, nick, email, uf)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', ''), apelido, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'uf', ''));
  return new;
end $$;

create trigger ao_criar_conta after insert on auth.users
  for each row execute function public.criar_perfil();

-- Ao editar: atualiza a data da revisão e protege dono, cópias e "Edição pública".
create or replace function public.tocar_data() returns trigger language plpgsql as $$
declare
  copia boolean := coalesce(current_setting('palco.copia', true), '') = '1';
begin
  new.dono_id := old.dono_id;
  if tg_table_name in ('musicas', 'repertorios') then
    if not copia then new.copias := old.copias; end if;
    if auth.uid() is distinct from old.dono_id then new.publica := old.publica; end if;
    if copia then return new; end if;
  end if;
  new.atualizado_em := now();
  return new;
end $$;
create trigger musicas_data before update on public.musicas for each row execute function public.tocar_data();
create trigger repertorios_data before update on public.repertorios for each row execute function public.tocar_data();
create trigger grupos_data before update on public.grupos for each row execute function public.tocar_data();

-- Procura uma conta pelo nick ou e-mail exatos, para adicionar no grupo.
create or replace function public.achar_perfil(busca text)
returns table (id uuid, nome text, nick text, email text, uf text)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.nick, p.email, p.uf from perfis p
  where auth.uid() is not null and (lower(p.nick) = lower(trim(busca)) or lower(p.email) = lower(trim(busca)))
  limit 1;
$$;

-- Salva a sequência inteira de um repertório de uma vez.
create or replace function public.salvar_itens(rep uuid, itens jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if not public.edita_repertorio(rep) then raise exception 'Sem permissão para editar este repertório'; end if;
  delete from repertorio_itens where repertorio_id = rep;
  insert into repertorio_itens (repertorio_id, posicao, musica_id, momento, pausa)
  select rep, (e.ord - 1)::int, nullif(e.val ->> 'musicaId', '')::uuid, nullif(e.val ->> 'momento', ''), nullif(e.val ->> 'pausa', '')
  from jsonb_array_elements(itens) with ordinality as e(val, ord);
  update repertorios set atualizado_em = now() where id = rep;
end $$;

-- Conta uma cópia feita por outra pessoa.
create or replace function public.contar_copia(tabela text, alvo uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('palco.copia', '1', true);
  if tabela = 'musicas' and public.ve_musica(alvo) then
    update musicas set copias = copias + 1 where id = alvo and dono_id <> auth.uid();
  elsif tabela = 'repertorios' and public.ve_repertorio(alvo) then
    update repertorios set copias = copias + 1 where id = alvo and dono_id <> auth.uid();
  end if;
  perform set_config('palco.copia', '', true);
end $$;
