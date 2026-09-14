-- R2.5.98 — Canonical Question Paper persistence for the live Academic Assignment model.
-- The current project uses school_subject_teacher_assignments as the source of truth;
-- Question Papers therefore store the canonical assignment UUID directly and do not
-- depend on the retired edunixo_teacher_assignments projection.

create table if not exists public.edunixo_question_papers (
  id uuid primary key default gen_random_uuid(),
  owner_teacher_id uuid not null,
  supersedes_paper_id uuid null references public.edunixo_question_papers(id) on delete set null,
  assignment_id uuid not null references public.school_subject_teacher_assignments(id) on delete restrict,
  exam text not null,
  material_ids text[] not null default '{}',
  chapters text[] not null default '{}',
  total_marks numeric not null,
  duration_minutes integer not null,
  medium text not null default 'School Medium',
  title text not null,
  instructions text[] not null default '{}',
  pattern jsonb not null default '[]'::jsonb,
  review_status text not null default 'final',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.edunixo_question_paper_questions (
  id uuid primary key default gen_random_uuid(),
  question_paper_id uuid not null references public.edunixo_question_papers(id) on delete cascade,
  text text not null,
  marks numeric not null,
  type text not null default 'Other',
  order_no integer not null,
  internal_sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists edunixo_qp_assignment_updated_idx
  on public.edunixo_question_papers (assignment_id, updated_at desc);
create index if not exists edunixo_qp_owner_updated_idx
  on public.edunixo_question_papers (owner_teacher_id, updated_at desc);
create index if not exists edunixo_qpq_paper_order_idx
  on public.edunixo_question_paper_questions (question_paper_id, order_no);

alter table public.edunixo_question_papers enable row level security;
alter table public.edunixo_question_paper_questions enable row level security;

-- These tables are accessed by Classtago's authenticated server-side academic API
-- using the Supabase service role. No direct browser policy is added here.
