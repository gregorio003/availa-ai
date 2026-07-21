-- ============================================================
-- Fix: "Database error creating new user"
-- Funções SECURITY DEFINER precisam de search_path explícito e
-- referência qualificada (public.profiles), senão o gatilho falha
-- ao criar usuário no Supabase Auth.
-- Rodar no SQL Editor.
-- ============================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, 'client', new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create or replace function is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'super_admin'
  );
$$;
