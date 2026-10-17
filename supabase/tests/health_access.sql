-- Run against a disposable Supabase database after all migrations. Everything rolls back.
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
insert into public.health_days(user_id,date,steps) values ('00000000-0000-4000-8000-000000000002','2026-10-17',42);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
insert into public.health_days(user_id,date,steps) values ('00000000-0000-4000-8000-000000000001','2026-10-17',100);
do $$ declare affected integer; begin
  if (select count(*) from public.health_days) <> 1 then raise exception 'Cross-user read leaked'; end if;
  begin
    insert into public.health_days(user_id,date,steps) values ('00000000-0000-4000-8000-000000000002','2026-10-18',1);
    raise exception 'Cross-user insert allowed';
  exception when insufficient_privilege then null; end;
  update public.health_days set steps=1 where user_id='00000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-user update allowed'; end if;
  delete from public.health_days where user_id='00000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-user delete allowed'; end if;
  begin
    update public.health_days set user_id='00000000-0000-4000-8000-000000000002';
    raise exception 'Owner transfer allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.health_days set nutrition='{"waterMl":-1}'::jsonb;
    raise exception 'Invalid totals allowed';
  exception when check_violation then null; end;
  update public.health_days set steps=200 where user_id=auth.uid();
  if (select steps from public.health_days where user_id=auth.uid()) <> 200 then raise exception 'Own update blocked'; end if;
end $$;
set local role anon;
do $$ begin
  begin perform * from public.health_days; raise exception 'Signed-out read allowed';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
