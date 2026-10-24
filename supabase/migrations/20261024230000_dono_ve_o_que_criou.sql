-- Corrige "sem permissão" ao criar música, repertório ou grupo.
-- O site cria a linha e já pede ela de volta. As funções ve_musica, ve_repertorio e no_grupo
-- procuram a linha na própria tabela e, nesse momento, ainda não enxergam a linha nova,
-- então o banco recusava. Agora o dono vê o que é dele direto, sem passar pela função.
-- Pode rodar mais de uma vez sem problema.
drop policy if exists musicas_ver on public.musicas;
create policy musicas_ver on public.musicas for select using (dono_id = auth.uid() or public.ve_musica(id));

drop policy if exists repertorios_ver on public.repertorios;
create policy repertorios_ver on public.repertorios for select using (dono_id = auth.uid() or public.ve_repertorio(id));

drop policy if exists grupos_ver on public.grupos;
create policy grupos_ver on public.grupos for select using (dono_id = auth.uid() or public.no_grupo(id));
