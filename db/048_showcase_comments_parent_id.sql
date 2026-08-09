-- Threaded replies for DSM Showcase comments.
-- A reply points at its parent comment; top-level comments have parent_id null.
-- One level of nesting is used by the UI: replies to a reply are stored against
-- the same top-level parent.

alter table public.showcase_comments
  add column if not exists parent_id uuid
    references public.showcase_comments(id) on delete cascade;

create index if not exists showcase_comments_parent_idx
  on public.showcase_comments (parent_id);
