alter table lessons add column if not exists cancellation_reason text;
alter table lessons add column if not exists cancellation_notes text;
alter table lessons add column if not exists cancelled_at timestamptz;
