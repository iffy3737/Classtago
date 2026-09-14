create or replace function public.edunixo_current_school_login_profile(p_expected_school_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Authenticated session is required.';
  end if;

  select jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'full_name', u.full_name,
    'username', u.username,
    'phone_number', u.phone_number,
    'photo_url', u.photo_url,
    'is_active', u.is_active,
    'status', u.status,
    'must_change_password', u.must_change_password,
    'shalarth_id', u.shalarth_id,
    'employee_code', u.employee_code,
    'gr_number', u.gr_number,
    'role_name', lower(coalesce(r.role_name,'')),
    'school_id', m.school_id,
    'role_in_school', lower(coalesce(m.role_in_school,'')),
    'membership_active', m.is_active,
    'staff_profile', case when t.id is null then null else jsonb_build_object(
      'id', t.id,
      'shalarth_id', t.shalarth_id,
      'employee_id', t.employee_id,
      'designation', t.designation,
      'mobile_number', t.mobile_number,
      'is_active', t.is_active
    ) end,
    'student_profile', case when s.id is null then null else jsonb_build_object(
      'id', s.id,
      'gr_number', s.gr_number,
      'class_id', s.class_id,
      'division', s.division,
      'roll_number', s.roll_number,
      'is_active', s.is_active
    ) end
  )
  into v_result
  from public.users u
  left join public.roles r on r.id = u.role_id
  join public.user_school_memberships m
    on m.user_id = u.id
   and coalesce(m.is_active,true) = true
   and (p_expected_school_id is null or m.school_id = p_expected_school_id)
  left join public.teachers t on t.user_id = u.id and t.school_id = m.school_id
  left join public.students s on s.user_id = u.id and s.school_id = m.school_id
  where u.id = v_uid
  order by m.updated_at desc nulls last
  limit 1;

  return v_result;
end;
$$;

revoke all on function public.edunixo_current_school_login_profile(uuid) from public, anon;
grant execute on function public.edunixo_current_school_login_profile(uuid) to authenticated, service_role;
