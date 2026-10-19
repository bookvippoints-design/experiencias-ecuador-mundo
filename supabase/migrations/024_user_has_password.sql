-- Una cuenta está activa cuando ya creó su contraseña (entrar con el enlace no basta).
create or replace function public.auth_user_has_password(p_user_id uuid) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select coalesce((select encrypted_password is not null and encrypted_password <> '' from auth.users where id = p_user_id), false)
$$;
revoke all on function public.auth_user_has_password(uuid) from public, anon, authenticated;

create or replace function public.company_users()
 returns table(user_id uuid, full_name text, email text, phone text, created_at timestamptz, activated boolean)
 language plpgsql stable security definer set search_path to 'public', 'auth'
as $function$
begin
  if public.current_app_role() <> 'company' then raise exception 'Acceso no autorizado'; end if;
  return query
    select p.user_id, p.full_name, p.email, p.phone, p.created_at,
           (u.encrypted_password is not null and u.encrypted_password <> '')
    from public.profiles p join auth.users u on u.id = p.user_id
    where p.company_id = public.current_company_id() and p.role = 'user'
    order by p.created_at desc;
end; $function$;
