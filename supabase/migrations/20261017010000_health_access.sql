-- Explicit grants: never rely on project-wide default privileges.
revoke all on public.health_days from anon;
revoke all on public.health_days from authenticated;
grant select, delete on public.health_days to authenticated;
grant insert (user_id,date,steps,walking_running_km,active_energy_kcal,active_minutes,running_minutes,workout_minutes,sleep_minutes,bedtime,wake_time,daylight_minutes,screen_minutes,feed_minutes,long_sessions,driving_minutes,app_usage,nutrition,source) on public.health_days to authenticated;
grant update (user_id,date,steps,walking_running_km,active_energy_kcal,active_minutes,running_minutes,workout_minutes,sleep_minutes,bedtime,wake_time,daylight_minutes,screen_minutes,feed_minutes,long_sessions,driving_minutes,app_usage,nutrition,source) on public.health_days to authenticated;
-- Upserts set conflict keys to their existing values. Allow that, but reject identity changes.
create function public.keep_health_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.user_id <> old.user_id or new.date <> old.date then
    raise exception 'Health record identity cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.keep_health_identity() from public;
create trigger keep_health_identity before update on public.health_days
for each row execute function public.keep_health_identity();
alter table public.health_days force row level security;

drop policy "goals: update own" on public.goals;
create policy "goals: update own user goals" on public.goals for update to authenticated
using ((select auth.uid()) = user_id and source = 'user')
with check ((select auth.uid()) = user_id and source = 'user');

create function public.valid_health_totals(value jsonb, nutrition boolean)
returns boolean language plpgsql immutable set search_path = '' as $$
declare entry record;
begin
  if value is null then return true; end if;
  if jsonb_typeof(value) <> 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(value)) > 100 then return false; end if;
  for entry in select * from jsonb_each(value) loop
    if length(entry.key) = 0 or length(entry.key) > 100 or jsonb_typeof(entry.value) <> 'number' then return false; end if;
    if nutrition and entry.key not in ('energyKcal','proteinG','carbsG','fatG','waterMl') then return false; end if;
    if (entry.value::text)::numeric < 0 or (entry.value::text)::numeric > (case when nutrition then 100000 else 1440 end) then return false; end if;
  end loop;
  return true;
end;
$$;
revoke all on function public.valid_health_totals(jsonb,boolean) from public;
grant execute on function public.valid_health_totals(jsonb,boolean) to authenticated;

-- NOT VALID preserves existing records; constraints are enforced on all new/updated rows.
alter table public.health_days add constraint health_bounds check (
  (steps is null or steps <= 200000) and (walking_running_km is null or walking_running_km <= 1000) and
  (active_energy_kcal is null or active_energy_kcal <= 100000) and (long_sessions is null or long_sessions <= 10000) and
  source in ('healthkit','health_export','shortcut','manual','demo') and
  public.valid_health_totals(nutrition,true) and public.valid_health_totals(app_usage,false)
) not valid;
