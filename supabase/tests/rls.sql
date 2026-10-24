-- Teste local das permissões (rodar com psql numa base com tests/stub-auth-local.sql e a migração).
\set ON_ERROR_STOP on
grant usage on schema public, auth to authenticated;
grant all on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'lucas@x.com', '{"nome":"Lucas","nick":"lucas","uf":"SP"}'),
  ('00000000-0000-0000-0000-00000000000b', 'rafa@x.com', '{"nome":"Rafa"}'),
  ('00000000-0000-0000-0000-00000000000c', 'fora@x.com', '{"nick":"lucas"}');
select nick from perfis order by email;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
insert into musicas (id, titulo, letra, publica) values ('10000000-0000-0000-0000-000000000001', 'Minha', 'C\nla', false);
insert into musicas (id, titulo) values ('10000000-0000-0000-0000-000000000002', 'Só minha');
insert into repertorios (id, titulo) values ('20000000-0000-0000-0000-000000000001', 'Show');
select salvar_itens('20000000-0000-0000-0000-000000000001', '[{"momento":"1º bloco"},{"musicaId":"10000000-0000-0000-0000-000000000001"}]');
insert into grupos (id, titulo) values ('30000000-0000-0000-0000-000000000001', 'Banda');
select id, nick from achar_perfil('RAFA@x.com');
insert into grupo_membros values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');
insert into grupo_repertorios (grupo_id, repertorio_id) values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');

-- Rafa (membro) vê o repertório e só a música dele, não pode editar.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select 'rafa vê músicas' t, string_agg(titulo, ',') from musicas;
select 'rafa vê repertórios' t, string_agg(titulo, ',') from repertorios;
select 'rafa vê itens' t, count(*) from repertorio_itens;
select 'rafa vê perfis' t, string_agg(nick, ',' order by nick) from perfis;
update musicas set titulo = 'hack' where id = '10000000-0000-0000-0000-000000000001';
select 'título depois do rafa' t, titulo from musicas;
select contar_copia('musicas', '10000000-0000-0000-0000-000000000001');
do $$ begin
  begin
    perform salvar_itens('20000000-0000-0000-0000-000000000001', '[]');
    raise exception 'rafa conseguiu editar itens';
  exception when others then
    if sqlerrm like 'rafa conseguiu%' then raise; end if;
  end;
end $$;

-- Lucas libera edição pública: Rafa passa a editar, mas não muda o dono.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
update musicas set publica = true where id = '10000000-0000-0000-0000-000000000001';
select 'cópias' t, copias from musicas where id = '10000000-0000-0000-0000-000000000001';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
update musicas set titulo = 'Editada pelo Rafa', dono_id = '00000000-0000-0000-0000-00000000000b' where id = '10000000-0000-0000-0000-000000000001';
select 'depois da edição pública' t, titulo, dono_id = '00000000-0000-0000-0000-00000000000a' as dono_ok from musicas;
-- Rafa sai do grupo.
delete from grupo_membros where perfil_id = '00000000-0000-0000-0000-00000000000b';
select 'rafa depois de sair' t, count(*) from musicas;

-- Pessoa de fora não vê nada.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
select 'fora' t, (select count(*) from musicas) m, (select count(*) from repertorios) r, (select count(*) from grupos) g;
