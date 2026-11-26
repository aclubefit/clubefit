-- CLUBEFIT — etapas 1 a 4.2: perfis, papéis, aprovação de cadastro e segurança (RLS)
-- Cole tudo no SQL Editor do Supabase e clique em Run.
-- ANTES de rodar, troque TROQUE_PELO_EMAIL_DO_ADMIN (no final do arquivo) pelo e-mail do administrador.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  phone text,
  birth_date date,
  role text not null default 'student' check (role in ('student','admin')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Verifica se quem está logado é administrador aprovado
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'approved'
  );
$$;

-- Cria o perfil (pendente) quando alguém se cadastra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, birth_date)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_user_meta_data->>'birth_date', '')::date
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impede que um aluno altere o próprio papel, status ou ativação
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.status := old.status;
    new.active := old.active;
    new.email := old.email;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Políticas de acesso
drop policy if exists "ler proprio ou admin" on public.profiles;
create policy "ler proprio ou admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "atualizar proprio" on public.profiles;
create policy "atualizar proprio" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "admin atualiza todos" on public.profiles;
create policy "admin atualiza todos" on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin exclui" on public.profiles;
create policy "admin exclui" on public.profiles
  for delete to authenticated
  using (public.is_admin() and role = 'student');

-- Tempo real para o painel do administrador
do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; end $$;

-- Cria perfis para usuários que já existiam antes deste script (ex.: o admin)
insert into public.profiles (id, email, full_name)
select id, email, 'Administrador CLUBEFIT' from auth.users
on conflict (id) do nothing;

-- Define o administrador (TROQUE O E-MAIL)
update public.profiles
set role = 'admin', status = 'approved', active = true, full_name = 'Administrador CLUBEFIT'
where email = 'TROQUE_PELO_EMAIL_DO_ADMIN';
