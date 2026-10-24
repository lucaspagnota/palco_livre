-- Libera as tabelas e funções para quem está logado.
-- Desde 2026 o Supabase não faz mais isso sozinho em projetos novos: sem estas linhas,
-- toda consulta do site e do app responde "permission denied" (42501).
-- Quem vê e edita o quê continua decidido pelas políticas (row level security) de inicio.sql.
-- Pode rodar mais de uma vez sem problema.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;
