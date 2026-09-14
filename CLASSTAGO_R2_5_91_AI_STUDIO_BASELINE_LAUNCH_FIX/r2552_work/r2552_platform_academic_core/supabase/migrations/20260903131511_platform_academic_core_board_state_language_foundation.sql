-- EDUNIXO R2.5.52 — Platform Academic Core foundation
-- ADDITIVE ONLY. Does not mutate existing school operational/result/assignment records.

create extension if not exists pgcrypto;

create table if not exists public.platform_board_families (
  id uuid primary key default gen_random_uuid(),
  family_code text not null unique,
  family_name text not null,
  requires_jurisdiction boolean not null default false,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 1000,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_board_families_code_chk check (family_code ~ '^[a-z0-9_]+$')
);

create table if not exists public.platform_jurisdictions (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_code text not null unique,
  jurisdiction_name text not null,
  jurisdiction_type text not null,
  country_code text not null default 'IN',
  is_active boolean not null default true,
  sort_order integer not null default 1000,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_jurisdictions_type_chk check (jurisdiction_type in ('state','union_territory','national'))
);

create table if not exists public.platform_boards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.platform_board_families(id) on delete restrict,
  jurisdiction_id uuid references public.platform_jurisdictions(id) on delete restrict,
  board_code text not null unique,
  board_name text not null,
  authority_name text,
  recognition_scope text not null default 'platform_routing',
  is_active boolean not null default true,
  sort_order integer not null default 1000,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_boards_code_chk check (board_code ~ '^[A-Z0-9_\-]+$')
);
create unique index if not exists platform_boards_family_jurisdiction_default_idx
  on public.platform_boards(family_id, jurisdiction_id)
  where ((metadata->>'routing_board') = 'true' and is_active = true);
create index if not exists platform_boards_family_idx on public.platform_boards(family_id,is_active,sort_order);
create index if not exists platform_boards_jurisdiction_idx on public.platform_boards(jurisdiction_id,is_active,sort_order);

create table if not exists public.platform_board_rulesets (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.platform_boards(id) on delete cascade,
  version_code text not null,
  status text not null default 'draft',
  effective_from date,
  effective_to date,
  definition jsonb not null default '{}'::jsonb,
  source_notes text,
  source_metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  published_by uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_board_rulesets_status_chk check (status in ('draft','review','published','retired')),
  constraint platform_board_rulesets_date_chk check (effective_to is null or effective_from is null or effective_to >= effective_from),
  unique(board_id,version_code)
);
create unique index if not exists platform_board_rulesets_one_published_idx on public.platform_board_rulesets(board_id)
  where status='published' and effective_to is null;
create index if not exists platform_board_rulesets_board_idx on public.platform_board_rulesets(board_id,status,updated_at desc);

create table if not exists public.platform_academic_template_library (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.platform_boards(id) on delete cascade,
  ruleset_id uuid references public.platform_board_rulesets(id) on delete set null,
  report_type text not null,
  template_code text not null unique,
  template_name text not null,
  class_band text,
  medium_codes text[] not null default '{}'::text[],
  language_codes text[] not null default '{}'::text[],
  status text not null default 'draft',
  is_active boolean not null default true,
  definition jsonb not null default '{}'::jsonb,
  source_metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_academic_template_type_chk check (report_type in ('mark_list','result_book','progress_card','catalogue','certificate','question_paper','other')),
  constraint platform_academic_template_status_chk check (status in ('draft','review','published','retired'))
);
create index if not exists platform_academic_templates_board_idx on public.platform_academic_template_library(board_id,report_type,status,is_active);

create table if not exists public.platform_feature_language_policies (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null unique,
  feature_name text not null,
  supports_input_language boolean not null default true,
  supports_output_language boolean not null default true,
  supports_multilingual boolean not null default true,
  max_languages_per_document integer not null default 3,
  default_language_code text not null default 'en',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_feature_language_max_chk check (max_languages_per_document between 1 and 10)
);

create table if not exists public.school_academic_profiles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null unique references public.schools(id) on delete cascade,
  board_id uuid not null references public.platform_boards(id) on delete restrict,
  ruleset_id uuid references public.platform_board_rulesets(id) on delete restrict,
  medium_codes text[] not null default '{}'::text[],
  enabled_language_codes text[] not null default '{}'::text[],
  configuration_status text not null default 'draft',
  is_locked boolean not null default false,
  locked_at timestamptz,
  locked_by uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_academic_profiles_status_chk check (configuration_status in ('draft','ready','active','migration_required','archived'))
);
create index if not exists school_academic_profiles_board_idx on public.school_academic_profiles(board_id,configuration_status);

alter table public.platform_board_families enable row level security;
alter table public.platform_jurisdictions enable row level security;
alter table public.platform_boards enable row level security;
alter table public.platform_board_rulesets enable row level security;
alter table public.platform_academic_template_library enable row level security;
alter table public.platform_feature_language_policies enable row level security;
alter table public.school_academic_profiles enable row level security;

revoke all on public.platform_board_families from anon,authenticated;
revoke all on public.platform_jurisdictions from anon,authenticated;
revoke all on public.platform_boards from anon,authenticated;
revoke all on public.platform_board_rulesets from anon,authenticated;
revoke all on public.platform_academic_template_library from anon,authenticated;
revoke all on public.platform_feature_language_policies from anon,authenticated;
revoke all on public.school_academic_profiles from anon,authenticated;
grant all on public.platform_board_families to service_role;
grant all on public.platform_jurisdictions to service_role;
grant all on public.platform_boards to service_role;
grant all on public.platform_board_rulesets to service_role;
grant all on public.platform_academic_template_library to service_role;
grant all on public.platform_feature_language_policies to service_role;
grant all on public.school_academic_profiles to service_role;

insert into public.platform_board_families (family_code,family_name,requires_jurisdiction,description,sort_order) values
 ('state_board','State Board',true,'State/UT routed curriculum. A school may consume only its selected jurisdiction/board rules.',10),
 ('cbse','CBSE',false,'Central Board of Secondary Education.',20),
 ('cisce','CISCE / ICSE / ISC',false,'Council for the Indian School Certificate Examinations family.',30),
 ('nios','NIOS / Open School',false,'National open schooling family.',40),
 ('ib','IB',false,'International Baccalaureate curriculum family.',50),
 ('cambridge','Cambridge International',false,'Cambridge international curriculum family.',60),
 ('other','Other Recognized Board',false,'Platform-managed registry for other recognized boards.',900)
on conflict (family_code) do update set family_name=excluded.family_name,requires_jurisdiction=excluded.requires_jurisdiction,description=excluded.description,sort_order=excluded.sort_order,updated_at=now();

insert into public.platform_jurisdictions (jurisdiction_code,jurisdiction_name,jurisdiction_type,sort_order) values
 ('AP','Andhra Pradesh','state',10),('AR','Arunachal Pradesh','state',20),('AS','Assam','state',30),('BR','Bihar','state',40),('CG','Chhattisgarh','state',50),('GA','Goa','state',60),('GJ','Gujarat','state',70),('HR','Haryana','state',80),('HP','Himachal Pradesh','state',90),('JH','Jharkhand','state',100),('KA','Karnataka','state',110),('KL','Kerala','state',120),('MP','Madhya Pradesh','state',130),('MH','Maharashtra','state',140),('MN','Manipur','state',150),('ML','Meghalaya','state',160),('MZ','Mizoram','state',170),('NL','Nagaland','state',180),('OD','Odisha','state',190),('PB','Punjab','state',200),('RJ','Rajasthan','state',210),('SK','Sikkim','state',220),('TN','Tamil Nadu','state',230),('TS','Telangana','state',240),('TR','Tripura','state',250),('UP','Uttar Pradesh','state',260),('UK','Uttarakhand','state',270),('WB','West Bengal','state',280),
 ('AN','Andaman and Nicobar Islands','union_territory',310),('CH','Chandigarh','union_territory',320),('DN','Dadra and Nagar Haveli and Daman and Diu','union_territory',330),('DL','Delhi','union_territory',340),('JK','Jammu and Kashmir','union_territory',350),('LA','Ladakh','union_territory',360),('LD','Lakshadweep','union_territory',370),('PY','Puducherry','union_territory',380)
on conflict (jurisdiction_code) do update set jurisdiction_name=excluded.jurisdiction_name,jurisdiction_type=excluded.jurisdiction_type,sort_order=excluded.sort_order,updated_at=now();

insert into public.platform_boards (family_id,jurisdiction_id,board_code,board_name,recognition_scope,sort_order,metadata)
select f.id,j.id,'STATE_'||j.jurisdiction_code,'State Board — '||j.jurisdiction_name,'platform_routing',j.sort_order,
 jsonb_build_object('routing_board',true,'rules_verified',false,'note','Routing identity only; publish a verified ruleset before live rule enforcement.')
from public.platform_board_families f join public.platform_jurisdictions j on j.jurisdiction_type in ('state','union_territory') and j.is_active=true
where f.family_code='state_board'
on conflict (board_code) do update set board_name=excluded.board_name,family_id=excluded.family_id,jurisdiction_id=excluded.jurisdiction_id,recognition_scope=excluded.recognition_scope,sort_order=excluded.sort_order,updated_at=now();

insert into public.platform_boards (family_id,jurisdiction_id,board_code,board_name,authority_name,recognition_scope,sort_order,metadata)
select f.id,null,seed.board_code,seed.board_name,seed.authority_name,'platform_routing',seed.sort_order,jsonb_build_object('routing_board',true,'rules_verified',false)
from public.platform_board_families f
join (values
 ('cbse','CBSE','Central Board of Secondary Education','Central Board of Secondary Education',20),
 ('cisce','CISCE','CISCE / ICSE / ISC','Council for the Indian School Certificate Examinations',30),
 ('nios','NIOS','NIOS / Open School','National Institute of Open Schooling',40),
 ('ib','IB','International Baccalaureate','International Baccalaureate',50),
 ('cambridge','CAMBRIDGE','Cambridge International','Cambridge International Education',60)
) as seed(family_code,board_code,board_name,authority_name,sort_order) on seed.family_code=f.family_code
on conflict (board_code) do update set board_name=excluded.board_name,authority_name=excluded.authority_name,family_id=excluded.family_id,recognition_scope=excluded.recognition_scope,sort_order=excluded.sort_order,updated_at=now();

insert into public.platform_feature_language_policies (feature_key,feature_name,supports_input_language,supports_output_language,supports_multilingual,max_languages_per_document,default_language_code) values
 ('mark_list','Mark List',true,true,true,3,'en'),('result_book','Result Book',true,true,true,3,'en'),('progress_card','Progress Card',true,true,true,3,'en'),('catalogue','Catalogue / Attendance Register',true,true,true,3,'en'),('question_paper','Question Paper',true,true,true,3,'en'),('homework','Homework',true,true,true,3,'en'),('certificate','Certificate',true,true,true,3,'en'),('notice','Notice / Circular',true,true,true,3,'en'),('remark','Remarks / Observations',true,true,true,3,'en')
on conflict (feature_key) do update set feature_name=excluded.feature_name,supports_input_language=excluded.supports_input_language,supports_output_language=excluded.supports_output_language,supports_multilingual=excluded.supports_multilingual,max_languages_per_document=excluded.max_languages_per_document,updated_at=now();
