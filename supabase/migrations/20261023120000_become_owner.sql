-- =============================================================================
-- BarSafe · Passage d'un compte client à un compte établissement
--
-- Utilisé après une connexion Google (Google ne transmet pas le type de compte
-- choisi : le profil est créé en CUSTOMER puis promu) et depuis "Mon compte".
-- Sans risque d'élévation : être OWNER permet seulement de créer SES bars.
-- Prérequis : 20261023090000_accounts_and_private_orders.sql
-- =============================================================================

create or replace function become_owner()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Connectez-vous à votre compte.' using errcode = '28000';
  end if;
  update profiles set role = 'OWNER' where id = auth.uid();
end;
$$;

-- Nom affiché : Google fournit "full_name" ou "name"
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, role, full_name, phone)
  values (
    new.id,
    case when new.raw_user_meta_data->>'account_type' = 'OWNER' then 'OWNER' else 'CUSTOMER' end,
    left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 80),
    left(coalesce(new.raw_user_meta_data->>'phone', ''), 30)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function become_owner() from public, anon;
grant execute on function become_owner() to authenticated;
