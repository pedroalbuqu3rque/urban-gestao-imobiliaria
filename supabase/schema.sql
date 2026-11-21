-- Apply in the SQL editor of the Supabase project used by the Next.js server.
-- All tenant data passes through the authenticated server API.
begin;

-- Validate the property codes even when the service API writes a complete snapshot.
create or replace function public.urban_property_codes_valid(snapshot jsonb)
returns boolean language sql immutable strict set search_path = '' as $$
  select case when pg_catalog.jsonb_typeof(snapshot->'properties') is distinct from 'array'
    then false else (
      select count(*) = count(distinct upper(nullif(btrim(p.value #>> '{data,code}'), '')))
        and coalesce(bool_and(pg_catalog.jsonb_typeof(p.value #> '{data,code}') = 'string'), true)
      from pg_catalog.jsonb_array_elements(snapshot->'properties') as p(value)
    ) end;
$$;
revoke all on function public.urban_property_codes_valid(jsonb) from public, anon, authenticated;
grant execute on function public.urban_property_codes_valid(jsonb) to service_role;

create table if not exists public.urban_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  state jsonb not null check (jsonb_typeof(state) = 'object' and public.urban_property_codes_valid(state)),
  version integer not null default 0 check (version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.urban_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.urban_workspaces(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  role text not null check (role in ('admin', 'broker')),
  email text,
  team text,
  created_at timestamptz not null default now()
);
create index if not exists urban_members_org on public.urban_members(org_id);

create table if not exists public.urban_invitations (
  code text primary key check (length(btrim(code)) > 0),
  org_id uuid not null references public.urban_workspaces(id) on delete cascade,
  email text not null check (length(btrim(email)) > 0),
  name text not null check (length(btrim(name)) > 0),
  team text not null default '',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists urban_invitations_org_email
  on public.urban_invitations(org_id, lower(btrim(email)));

alter table public.urban_workspaces enable row level security;
alter table public.urban_members enable row level security;
alter table public.urban_invitations enable row level security;
revoke all on public.urban_workspaces, public.urban_members, public.urban_invitations
  from public, anon, authenticated;
grant select on public.urban_workspaces, public.urban_members to service_role;
grant select, insert, update, delete on public.urban_invitations to service_role;

create or replace function public.urban_bootstrap(p_user uuid, p_org text, p_name text, p_state jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  workspace_id uuid;
  user_email text;
begin
  -- Both first access and invitation acceptance serialize on this identity.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text, 0));
  select m.org_id into workspace_id from public.urban_members m where m.user_id = p_user;
  if found then return workspace_id; end if;

  select u.email into strict user_email from auth.users u where u.id = p_user;
  insert into public.urban_workspaces(name, state)
    values (btrim(p_org), p_state) returning id into workspace_id;
  insert into public.urban_members(user_id, org_id, role, name, email)
    values (p_user, workspace_id, 'admin', btrim(p_name), user_email);
  return workspace_id;
end;
$$;

create or replace function public.urban_commit(p_org uuid, p_version integer, p_state jsonb, p_name text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.urban_workspaces
    set name = btrim(p_name), state = p_state, version = version + 1, updated_at = now()
    where id = p_org and version = p_version;
  return found;
end;
$$;

create or replace function public.urban_accept(p_code text, p_user uuid, p_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  invitation public.urban_invitations%rowtype;
  verified_email text;
  current_org uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text, 0));
  select lower(btrim(u.email)) into verified_email from auth.users u
    where u.id = p_user and u.email_confirmed_at is not null;
  select * into invitation from public.urban_invitations i where i.code = p_code for update;
  if not found or invitation.expires_at <= clock_timestamp()
    or verified_email is null
    or verified_email is distinct from lower(btrim(p_email))
    or verified_email is distinct from lower(btrim(invitation.email)) then
    raise exception 'Convite inválido, expirado ou destinado a outro e-mail.' using errcode = 'P0001';
  end if;

  select m.org_id into current_org from public.urban_members m where m.user_id = p_user;
  if found and current_org <> invitation.org_id then
    raise exception 'O usuário já pertence a outra imobiliária.' using errcode = 'P0001';
  end if;
  -- A duplicate invite for an existing member may be consumed without changing their role.
  if current_org is null then
    insert into public.urban_members(user_id, org_id, name, role, email, team)
      values (p_user, invitation.org_id, invitation.name, 'broker', verified_email, invitation.team);
  end if;
  delete from public.urban_invitations where org_id = invitation.org_id
    and lower(btrim(email)) = verified_email;
  return invitation.org_id;
end;
$$;

revoke all on function public.urban_bootstrap(uuid,text,text,jsonb),
  public.urban_commit(uuid,integer,jsonb,text), public.urban_accept(text,uuid,text)
  from public, anon, authenticated;
grant execute on function public.urban_bootstrap(uuid,text,text,jsonb),
  public.urban_commit(uuid,integer,jsonb,text), public.urban_accept(text,uuid,text)
  to service_role;

commit;
