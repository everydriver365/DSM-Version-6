-- Add deleted_at to support soft deletes
alter table if exists notes         add column if not exists deleted_at timestamptz;
alter table if exists todos         add column if not exists deleted_at timestamptz;
alter table if exists lessons       add column if not exists deleted_at timestamptz;
alter table if exists pupils        add column if not exists deleted_at timestamptz;
alter table if exists expenses      add column if not exists deleted_at timestamptz;
alter table if exists mileage_logs  add column if not exists deleted_at timestamptz;
alter table if exists payments      add column if not exists deleted_at timestamptz;

create index if not exists notes_deleted_at_idx        on notes        (deleted_at);
create index if not exists todos_deleted_at_idx        on todos        (deleted_at);
create index if not exists lessons_deleted_at_idx      on lessons      (deleted_at);
create index if not exists pupils_deleted_at_idx       on pupils       (deleted_at);
create index if not exists expenses_deleted_at_idx     on expenses     (deleted_at);
create index if not exists mileage_logs_deleted_at_idx on mileage_logs (deleted_at);
create index if not exists payments_deleted_at_idx     on payments     (deleted_at);
