-- Busca server-side de encontrista por telefone (evita baixar a lista toda no cliente)
create or replace function buscar_encontrista_checkin(p_encontro_id uuid, p_telefone text)
returns table (
  id uuid,
  nome text,
  telefone text,
  grupo_id uuid,
  checkin_dia1_at timestamptz,
  checkin_dia2_at timestamptz,
  grupo_nome text,
  grupo_cor text
)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.nome, e.telefone, e.grupo_id, e.checkin_dia1_at, e.checkin_dia2_at,
         g.nome as grupo_nome, g.cor as grupo_cor
  from encontristas e
  left join grupos g on g.id = e.grupo_id
  where e.encontro_id = p_encontro_id
    and regexp_replace(coalesce(e.telefone, ''), '\D', '', 'g') = regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g')
    and regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g') <> '';
$$;

grant execute on function buscar_encontrista_checkin(uuid, text) to anon, authenticated;
