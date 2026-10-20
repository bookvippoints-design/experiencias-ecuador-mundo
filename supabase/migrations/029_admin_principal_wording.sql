-- 029: "Dueño de la cuenta" pasa a llamarse "Administrador principal" en los mensajes.
do $$
declare f record; def text;
begin
  for f in select p.oid from pg_proc p where p.pronamespace = 'public'::regnamespace
    and p.proname in ('company_team_update','company_team_set_status','request_quota_purchase','company_team_report')
  loop
    def := pg_get_functiondef(f.oid);
    def := replace(def, 'al dueño de la cuenta', 'al administrador principal');
    def := replace(def, 'Solo el dueño de la cuenta puede comprar cupos', 'Solo el administrador principal puede comprar cupos');
    def := replace(def, '''Dueño''', '''Administrador principal''');
    execute def;
  end loop;
end $$;
