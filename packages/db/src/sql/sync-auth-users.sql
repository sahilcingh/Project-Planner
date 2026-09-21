-- Keeps public.users (the app-owned table Drizzle manages, referenced by
-- projects.owner_id) in sync with Supabase's own auth.users. Supabase Auth
-- owns signup/login; this only mirrors the id + a display name into our
-- schema so the FK on projects.owner_id has something to point at.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
