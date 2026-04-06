-- Crear tabla para almacenar las formulas generadas por los usuarios
create table public.formulas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  skin_type text not null,
  goal text not null,
  ingredients text[] not null,
  response text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar Role Level Security (RLS) para que los usuarios solo puedan ver sus propias formulas
alter table public.formulas enable row level security;

create policy "Users can view their own formulas."
  on formulas for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own formulas."
  on formulas for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own formulas."
  on formulas for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own formulas."
  on formulas for delete
  using ( auth.uid() = user_id );
