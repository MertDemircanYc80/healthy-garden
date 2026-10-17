-- Run after both 20261017 migrations in a development database. All fixtures roll back.
begin;
insert into auth.users (id, aud, role, email) values
 ('00000000-0000-4000-8000-000000000031','authenticated','authenticated','privacy-one@example.invalid'),
 ('00000000-0000-4000-8000-000000000032','authenticated','authenticated','privacy-two@example.invalid');
insert into public.health_days (user_id,date,steps) values
 ('00000000-0000-4000-8000-000000000031','2026-10-17',100),
 ('00000000-0000-4000-8000-000000000032','2026-10-17',200);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000031',true);
select public.delete_my_health_data();
do $$ begin
  if exists (select 1 from public.health_days) then raise exception 'Own health data survived deletion'; end if;
  begin
    insert into public.health_days(user_id,date,steps) values(auth.uid(),'2026-10-17',100);
    raise exception 'Disconnected account accepted new data';
  exception when insufficient_privilege then null;
  end;
end $$;
select public.resume_my_health_sync();
insert into public.health_days(user_id,date,steps) values(auth.uid(),'2026-10-17',100)
on conflict(user_id,date) do update set user_id=excluded.user_id,date=excluded.date,steps=excluded.steps;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000032',true);
do $$ begin
  if (select steps from public.health_days where date='2026-10-17') <> 200 then raise exception 'Deletion changed another account'; end if;
end $$;
set local role anon;
do $$ begin
  begin perform public.delete_my_health_data(); raise exception 'Anonymous deletion allowed';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
