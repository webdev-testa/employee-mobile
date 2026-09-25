import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// PostgreSQL engine, actual roles/RLS/functions; fixtures reflect the inspected live schema.
const db = new PGlite()
const uid = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
const attempt = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
const photo = `${uid}/cccccccc-cccc-4ccc-cccc-cccccccccccc.jpg`
beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema hr; create schema pos; create schema storage;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,hr to authenticated,anon;
    create table hr.users(id uuid primary key, name text, emp_id text, role text default 'employee', status text default 'active',
      shift text, salary numeric, phone text, address text, must_change_password boolean default false);
    create table hr.branches(id text primary key,name text,lat double precision,lng double precision,radius integer,is_active boolean);
    create table hr.attendance(id uuid primary key default gen_random_uuid(),user_id uuid references hr.users(id),date date not null,
      clock_in_time timestamptz,clock_out_time timestamptz,clock_in_lat numeric,clock_in_lng numeric,clock_out_lat numeric,clock_out_lng numeric,
      clock_in_photo_url text,clock_out_photo_url text,status text default 'ontime',is_flagged boolean default false,created_at timestamptz default now());
    create table storage.objects(bucket_id text,name text,owner_id text,metadata jsonb);
    create function pos.current_user_role() returns text language sql security definer set search_path='' as $$ select role from hr.users where id=auth.uid() $$;
    grant usage on schema pos to authenticated;
    alter table hr.users enable row level security; alter table hr.attendance enable row level security; alter table hr.branches enable row level security;
    create policy own_profile_read on hr.users for select to authenticated using(id=auth.uid());
    create policy own_profile_update on hr.users for update to authenticated using(id=auth.uid());
    create policy "employee: insert own attendance" on hr.attendance for insert to authenticated with check(user_id=auth.uid());
    create policy own_attendance on hr.attendance for select to authenticated using(user_id=auth.uid());
    create policy "superadmin: full access attendance" on hr.attendance for all to authenticated using(pos.current_user_role()='superadmin') with check(pos.current_user_role()='superadmin');
    grant all on all tables in schema hr to authenticated,anon;
  `)
  await db.exec(readFileSync('supabase/migrations/202609250001_attendance_api.sql', 'utf8'))
  await db.exec(readFileSync('supabase/rollout/attendance_enforcement.sql', 'utf8'))
}, 30_000)
beforeEach(async () => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub','',false);
    truncate hr.attendance_attempts,hr.attendance,hr.users,hr.branches,storage.objects cascade;
    insert into hr.users(id,name,emp_id,shift) values('${uid}','Test','TEST','08:00');
    insert into hr.branches values('office','Office',-8,112,100,true);
    insert into storage.objects values('attendance-photos','${photo}','${uid}','{"mimetype":"image/jpeg","size":100}');
    select set_config('request.jwt.claim.sub','${uid}',false); set role authenticated;`)
})
afterAll(() => db.close())
async function submit(action = 'in', id = attempt, accuracy = 10, lat = -8, stamp = 'clock_timestamp()') {
  return db.query<{ result: { id: string; clock_out_time: string | null } }>(
    `select hr.attendance_submit($1,$2,$3,112,$4,${stamp},$5) as result`, [id,action,lat,accuracy,action === 'in' ? photo : null])
}
describe('attendance database contract', () => {
  it('uses server time, saves audit metadata, and supports clock-out', async () => {
    const result = await submit(); expect(result.rows[0].result.id).toBeTruthy()
    const out = await submit('out','dddddddd-dddd-4ddd-dddd-dddddddddddd')
    expect(out.rows[0].result.clock_out_time).toBeTruthy()
    const rows = await db.query('select clock_in_location from hr.attendance')
    expect(rows.rows[0]).toMatchObject({ clock_in_location: { accuracy: 10, branch_id: 'office', policy_version: 1 } })
  })
  it('replays an identical committed request even after its sample expires', async () => {
    const stamp = "'2026-09-25T01:00:00Z'::timestamptz"
    // First request uses a real timestamp then replays that exact timestamp.
    const time = await db.query<{ t: string }>('select clock_timestamp()::text as t')
    const exact = `'${time.rows[0].t}'::timestamptz`
    const first = await submit('in',attempt,10,-8,exact)
    const second = await submit('in',attempt,10,-8,exact)
    expect(second.rows).toEqual(first.rows)
    await expect(submit('in',attempt,10,-8,stamp)).rejects.toThrow('ATTENDANCE_ATTEMPT_MISMATCH')
    expect((await db.query('select * from hr.attendance')).rows).toHaveLength(1)
  })
  it('rejects duplicate attempts and clock-out without an open attendance record', async () => {
    await expect(submit('out')).rejects.toThrow('ATTENDANCE_NO_OPEN_RECORD')
    await submit()
    await expect(submit('in','eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee')).rejects.toThrow('ATTENDANCE_ALREADY_EXISTS')
  })
  it('rejects direct attendance writes while preserving valid leave submissions', async () => {
    await expect(db.exec(`insert into hr.attendance(user_id,date,clock_in_time) values('${uid}',current_date,now())`)).rejects.toThrow('row-level security')
    await db.exec(`insert into hr.attendance(user_id,date,status,is_flagged) values('${uid}',(now() at time zone 'Asia/Jakarta')::date,'cuti_pending',true)`)
    await expect(submit()).rejects.toThrow('ATTENDANCE_ALREADY_EXISTS')
    await expect(db.exec(`insert into hr.attendance(user_id,date,status,is_flagged,clock_in_lat) values('${uid}',current_date+1,'izin_pending',true,-8)`)).rejects.toThrow('row-level security')
  })
  it.each([[31,-8],[-1,-8],[10,91],[10,-9],[NaN,-8]])('rejects accuracy %s and latitude %s', async (accuracy,lat) => {
    await expect(submit('in',attempt,accuracy,lat)).rejects.toThrow('ATTENDANCE_')
  })
  it('rejects stale and future samples', async () => {
    await expect(submit('in',attempt,10,-8,"clock_timestamp()-interval '16 seconds'")).rejects.toThrow('STALE_LOCATION')
    await expect(submit('in',attempt,10,-8,"clock_timestamp()+interval '10 seconds'")).rejects.toThrow('STALE_LOCATION')
  })
  it('accepts another eligible branch when the nearest branch has too small a radius', async () => {
    await db.exec("reset role; update hr.branches set radius=5; insert into hr.branches values('larger','Larger',-8.0003,112,100,true); set role authenticated;")
    await submit()
  })
  it('rejects another users photo and blocks self-escalation/profile shift changes', async () => {
    await db.exec("reset role; update storage.objects set owner_id='other'; set role authenticated;")
    await expect(submit()).rejects.toThrow('INVALID_PHOTO')
    await expect(db.exec(`update hr.users set role='superadmin' where id='${uid}'`)).rejects.toThrow('PROFILE_PROTECTED_FIELDS')
    await expect(db.exec(`update hr.users set shift='23:59' where id='${uid}'`)).rejects.toThrow('PROFILE_PROTECTED_FIELDS')
    await db.exec(`update hr.users set phone='0812345678' where id='${uid}'`)
  })
  it('denies unauthenticated execution and dangerous table privileges', async () => {
    await expect(db.exec('truncate hr.attendance cascade')).rejects.toThrow('permission denied')
    await db.exec("reset role; select set_config('request.jwt.claim.sub','',false); set role anon;")
    await expect(submit()).rejects.toThrow('permission denied')
  })
})
