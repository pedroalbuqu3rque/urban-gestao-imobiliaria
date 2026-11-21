-- Run in a disposable database after schema.sql. Fixtures are rolled back.
begin;
do $test$
declare
  owner_a uuid := gen_random_uuid();
  owner_b uuid := gen_random_uuid();
  broker uuid := gen_random_uuid();
  broker_email text := broker::text || '@urban.example';
  org_a uuid;
  org_b uuid;
  accepted uuid;
  invitation_code text := gen_random_uuid()::text;
  state_one jsonb := '{"properties":[{"id":"p1","data":{"code":"IM-049"}}]}';
  state_two jsonb := '{"properties":[{"id":"p1","data":{"code":"IM-049"}},{"id":"p2","data":{"code":" im-049 "}}]}';
  role_name text;
begin
  insert into auth.users(id,email,email_confirmed_at) values
    (owner_a,owner_a::text || '@urban.example',now()),
    (owner_b,owner_b::text || '@urban.example',now()),
    (broker,broker_email,now());
  org_a := public.urban_bootstrap(owner_a,'Imobiliária A','João',state_one);
  org_b := public.urban_bootstrap(owner_b,'Imobiliária B','Rita',state_one);
  if org_a = org_b then raise exception 'Failed: tenant isolation'; end if;
  if public.urban_bootstrap(owner_a,'Outro nome','Teste',state_one) <> org_a then
    raise exception 'Failed: idempotent first access';
  end if;
  if not public.urban_commit(org_a,0,state_one,'Imobiliária A') then
    raise exception 'Failed: matching version';
  end if;
  if public.urban_commit(org_a,0,state_one,'Nome desatualizado') then
    raise exception 'Failed: stale version must be rejected';
  end if;
  begin
    perform public.urban_commit(org_a,1,state_two,'Imobiliária A');
    raise exception 'Failed: duplicate property code accepted';
  exception when check_violation then null;
  end;
  if (select version from public.urban_workspaces where id = org_a) <> 1 or
     (select version from public.urban_workspaces where id = org_b) <> 0 then
    raise exception 'Failed: versions changed incorrectly';
  end if;

  insert into public.urban_invitations(code,org_id,email,name,team,expires_at)
    values(invitation_code,org_a,upper(broker_email),'Rita Nunes','Venda residencial',now()+interval '1 day');
  begin
    perform public.urban_accept(invitation_code,owner_b,broker_email);
    raise exception 'Failed: email impersonation accepted' using errcode = '22000';
  exception when sqlstate 'P0001' then null;
  end;
  update public.urban_invitations set expires_at=now()-interval '1 day' where code=invitation_code;
  begin
    perform public.urban_accept(invitation_code,broker,broker_email);
    raise exception 'Failed: expired invitation accepted' using errcode = '22000';
  exception when sqlstate 'P0001' then null;
  end;
  update public.urban_invitations set expires_at=now()+interval '1 day' where code=invitation_code;
  accepted := public.urban_accept(invitation_code,broker,broker_email);
  if accepted <> org_a or not exists (
    select 1 from public.urban_members where user_id=broker and org_id=org_a
      and role='broker' and team='Venda residencial'
  ) then raise exception 'Failed: membership assignment'; end if;
  if exists(select 1 from public.urban_invitations where code=invitation_code) then
    raise exception 'Failed: invitation not consumed';
  end if;
  insert into public.urban_invitations(code,org_id,email,name,team,expires_at)
    values(invitation_code,org_b,broker_email,'Rita Nunes','Venda residencial',now()+interval '1 day');
  begin
    perform public.urban_accept(invitation_code,broker,broker_email);
    raise exception 'Failed: tenant switching accepted' using errcode = '22000';
  exception when sqlstate 'P0001' then null;
  end;
  foreach role_name in array array['anon','authenticated'] loop
    if has_table_privilege(role_name,'public.urban_workspaces','SELECT')
      or has_table_privilege(role_name,'public.urban_members','INSERT')
      or has_table_privilege(role_name,'public.urban_invitations','SELECT')
      or has_function_privilege(role_name,'public.urban_commit(uuid,integer,jsonb,text)','EXECUTE')
      or has_function_privilege(role_name,'public.urban_bootstrap(uuid,text,text,jsonb)','EXECUTE')
      or has_function_privilege(role_name,'public.urban_accept(text,uuid,text)','EXECUTE')
    then raise exception 'Failed: unexpected grant for role %',role_name; end if;
  end loop;
end;
$test$;
-- Exercise RPC and direct read grants with the same database role as the API.
select set_config('urban.test_user', gen_random_uuid()::text, true);
insert into auth.users(id,email,email_confirmed_at)
values(current_setting('urban.test_user')::uuid, current_setting('urban.test_user') || '@urban.example', now());
set local role service_role;
do $service$
declare tenant uuid;
begin
  tenant := public.urban_bootstrap(current_setting('urban.test_user')::uuid, 'Acesso API', 'Ana', '{"properties":[]}');
  if not public.urban_commit(tenant,0,'{"properties":[]}','Acesso API')
    or not exists(select 1 from public.urban_members where org_id=tenant and role='admin')
  then raise exception 'Failed: service API bootstrap and commit'; end if;
end;
$service$;
reset role;
rollback;
