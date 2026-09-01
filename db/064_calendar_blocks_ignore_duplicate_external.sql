-- Google Calendar sync re-imports events that were already imported.
-- The deployed sync-google-calendar edge function does a plain INSERT, so the
-- second import raises:
--   duplicate key value violates unique constraint "calendar_blocks_external_unique"
-- and the whole sync returns 500.
--
-- Fix, database-side (the edge function source is not in this repo):
-- a BEFORE INSERT trigger that turns a conflicting insert into an UPDATE of the
-- existing row, so re-syncs refresh events instead of failing.
--
-- The trigger body is generated from the actual columns of the unique index,
-- so it stays correct whatever that constraint is defined on.

do $$
declare
  cols text[];
  match_clause text;
  set_clause text;
begin
  select array_agg(a.attname order by k.ord)
    into cols
  from pg_index i
  join pg_class c on c.oid = i.indexrelid
  cross join lateral unnest(i.indkey) with ordinality as k(attnum, ord)
  join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
  where c.relname = 'calendar_blocks_external_unique';

  if cols is null then
    raise notice 'calendar_blocks_external_unique not found - nothing to do';
    return;
  end if;

  select string_agg(format('b.%1$I is not distinct from new.%1$I', col), ' and ')
    into match_clause
  from unnest(cols) as col;

  select string_agg(format('%1$I = new.%1$I', a.attname), ', ')
    into set_clause
  from pg_attribute a
  where a.attrelid = 'public.calendar_blocks'::regclass
    and a.attnum > 0
    and not a.attisdropped
    and a.attname <> 'id'
    and a.attname <> 'created_at'
    and not (a.attname = any(cols));

  execute format($f$
    create or replace function public.calendar_blocks_upsert_external()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $body$
    declare
      existing_id uuid;
    begin
      select b.id into existing_id
      from public.calendar_blocks b
      where %s
      limit 1;

      if existing_id is null then
        return new;
      end if;

      update public.calendar_blocks
      set %s
      where id = existing_id;

      return null; -- skip the duplicate insert
    end;
    $body$;
  $f$, match_clause, coalesce(set_clause, 'id = id'));
end $$;

drop trigger if exists calendar_blocks_upsert_external_trg on public.calendar_blocks;

create trigger calendar_blocks_upsert_external_trg
  before insert on public.calendar_blocks
  for each row
  execute function public.calendar_blocks_upsert_external();
