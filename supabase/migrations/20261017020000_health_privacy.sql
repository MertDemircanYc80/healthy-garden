-- A privacy gate also blocks an analysis already in flight from recreating deleted data.
alter table public.profiles add column health_data_enabled boolean not null default true;
create function public.require_health_consent() returns trigger
language plpgsql security definer set search_path = '' as $$
declare enabled boolean;
begin
  select health_data_enabled into enabled from public.profiles where id = new.user_id for share;
  if enabled is distinct from true then
    raise exception 'Health syncing is disabled for this account' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.require_health_consent() from public;
create trigger health_consent before insert or update on public.health_days for each row execute function public.require_health_consent();
create trigger goals_consent before insert or update on public.goals for each row execute function public.require_health_consent();
create trigger insights_consent before insert or update on public.insights for each row execute function public.require_health_consent();
create trigger reports_consent before insert or update on public.reports for each row execute function public.require_health_consent();
create trigger alerts_consent before insert or update on public.alerts for each row execute function public.require_health_consent();
create trigger runs_consent before insert or update on public.ai_runs for each row execute function public.require_health_consent();

create function public.delete_my_health_data() returns void
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  update public.profiles set health_data_enabled = false where id = owner_id;
  delete from public.health_days where user_id = owner_id;
  delete from public.goals where user_id = owner_id;
  delete from public.insights where user_id = owner_id;
  delete from public.reports where user_id = owner_id;
  delete from public.alerts where user_id = owner_id;
  delete from public.ai_runs where user_id = owner_id;
end;
$$;
create function public.resume_my_health_sync() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  update public.profiles set health_data_enabled = true where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_health_data(), public.resume_my_health_sync() from public, anon;
grant execute on function public.delete_my_health_data(), public.resume_my_health_sync() to authenticated;
grant execute on function public.valid_health_totals(jsonb,boolean) to service_role;
