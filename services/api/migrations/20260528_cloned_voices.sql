-- Kullanıcı ses klonları — sesler Supabase Storage'da, kayıtlar burada
create table if not exists cloned_voices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  name        text not null,
  sample_url  text not null,
  file_name   text,
  created_at  timestamptz not null default now()
);

create index if not exists cloned_voices_user_idx on cloned_voices(user_id);

-- RLS
alter table cloned_voices enable row level security;
create policy "cloned_voices_user" on cloned_voices
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
