-- ============================================================
-- JOGO DE PERGUNTAS E RESPOSTAS — Viktor vs Lucas
-- Schema completo para Supabase (PostgreSQL)
-- Versão 2 — corrigido para login anônimo de vendedores
-- Cole no SQL Editor do Supabase e execute tudo de uma vez
-- ============================================================


-- ============================================================
-- EXTENSÕES
-- ============================================================
create extension if not exists "uuid-ossp";


-- ============================================================
-- LIMPEZA (caso esteja reexecutando)
-- Remove tudo na ordem certa para evitar erros de dependência
-- ============================================================

drop trigger  if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user() cascade;
drop function if exists calculate_question_result(uuid, uuid) cascade;
drop function if exists is_admin() cascade;

drop view if exists leaderboard cascade;
drop view if exists session_summary cascade;

drop table if exists session_players  cascade;
drop table if exists question_results cascade;
drop table if exists answers          cascade;
drop table if exists game_sessions    cascade;
drop table if exists questions        cascade;
drop table if exists profiles         cascade;

drop type if exists game_status cascade;
drop type if exists team_name   cascade;
drop type if exists player_role cascade;


-- ============================================================
-- ENUM TYPES
-- ============================================================
create type player_role as enum ('admin', 'player');
create type team_name   as enum ('viktor', 'lucas');
create type game_status as enum (
  'waiting',    -- sala de espera, vendedores entrando
  'question',   -- pergunta ativa, timer rodando
  'revealing',  -- timer zerou, revelando respostas
  'result',     -- mostrando resultado + vídeo vencedor
  'finished'    -- jogo encerrado, placar final
);


-- ============================================================
-- TABELA: profiles
-- Estende o auth.users do Supabase com dados do jogo.
--
-- IMPORTANTE: Esta tabela é preenchida de duas formas:
--   1. Trigger on_auth_user_created → cria o perfil base (só id + role padrão)
--   2. Upsert pelo cliente após login → preenche name, team (para vendedores)
--                                       ou apenas confirma role='admin' (para admin)
-- ============================================================
create table profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  name        text,                              -- preenchido pelo cliente após login anônimo
  team        team_name,                         -- null para admin; preenchido pelo cliente
  role        player_role not null default 'player',
  avatar_url  text,
  created_at  timestamptz not null default now()
);


-- ============================================================
-- TRIGGER: handle_new_user
--
-- Cria o perfil base assim que qualquer usuário é criado no Auth.
-- Propositalmente minimalista: só grava id e role='player'.
-- O nome e a equipe são preenchidos depois via upsert pelo cliente.
--
-- Isso evita o erro anterior, que tentava ler raw_user_meta_data
-- (que é NULL no login anônimo) e fazer cast para enum player_role.
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'player')
  on conflict (id) do nothing;   -- idempotente: não quebra se já existir

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ============================================================
-- TABELA: questions
-- Perguntas do quiz com 4 alternativas
-- ============================================================
create table questions (
  id               uuid        primary key default uuid_generate_v4(),
  text             text        not null,
  options          jsonb       not null,   -- ["opção A", "opção B", "opção C", "opção D"]
  correct_index    smallint    not null check (correct_index between 0 and 3),
  order_index      smallint    not null,
  video_url_viktor text,
  video_url_lucas  text,
  created_at       timestamptz not null default now(),

  constraint valid_options check (jsonb_array_length(options) = 4)
);


-- ============================================================
-- TABELA: game_sessions
-- Uma sessão por evento/apresentação
-- ============================================================
create table game_sessions (
  id                     uuid        primary key default uuid_generate_v4(),
  status                 game_status not null default 'waiting',
  current_question_id    uuid        references questions(id),
  current_question_index smallint    default 0,
  question_started_at    timestamptz,
  created_by             uuid        references profiles(id),
  created_at             timestamptz not null default now(),
  finished_at            timestamptz
);


-- ============================================================
-- TABELA: answers
-- Respostas dos jogadores por questão
-- ============================================================
create table answers (
  id               uuid        primary key default uuid_generate_v4(),
  session_id       uuid        not null references game_sessions(id) on delete cascade,
  question_id      uuid        not null references questions(id),
  user_id          uuid        not null references profiles(id),
  team             team_name   not null,
  chosen_index     smallint    not null check (chosen_index between 0 and 3),
  is_correct       boolean     not null,
  response_time_ms integer     not null,
  answered_at      timestamptz not null default now(),

  unique (session_id, question_id, user_id)
);

create index answers_session_question on answers (session_id, question_id);
create index answers_team             on answers (session_id, question_id, team);
create index answers_speed            on answers (session_id, question_id, is_correct, response_time_ms);


-- ============================================================
-- TABELA: question_results
-- Resultado calculado ao fechar cada questão
-- ============================================================
create table question_results (
  id             uuid         primary key default uuid_generate_v4(),
  session_id     uuid         not null references game_sessions(id) on delete cascade,
  question_id    uuid         not null references questions(id),
  viktor_correct smallint     not null default 0,
  viktor_total   smallint     not null default 0,
  viktor_pct     numeric(5,2) not null default 0,
  lucas_correct  smallint     not null default 0,
  lucas_total    smallint     not null default 0,
  lucas_pct      numeric(5,2) not null default 0,
  winner_team    team_name,
  calculated_at  timestamptz  not null default now(),

  unique (session_id, question_id)
);


-- ============================================================
-- TABELA: session_players
-- Rastreia quem está online na sessão
-- ============================================================
create table session_players (
  session_id uuid        not null references game_sessions(id) on delete cascade,
  user_id    uuid        not null references profiles(id),
  team       team_name   not null,
  joined_at  timestamptz not null default now(),
  is_online  boolean     not null default true,

  primary key (session_id, user_id)
);


-- ============================================================
-- VIEW: leaderboard
-- Ranking por velocidade (apenas acertos)
-- ============================================================
create or replace view leaderboard as
select
  a.session_id,
  a.question_id,
  p.name,
  p.team,
  a.response_time_ms,
  a.is_correct,
  rank() over (
    partition by a.session_id, a.question_id
    order by a.response_time_ms asc
  ) as speed_rank
from answers a
join profiles p on p.id = a.user_id
where a.is_correct = true;


-- ============================================================
-- VIEW: session_summary
-- Placar geral por sessão
-- ============================================================
create or replace view session_summary as
select
  session_id,
  sum(case when winner_team = 'viktor' then 1 else 0 end) as viktor_wins,
  sum(case when winner_team = 'lucas'  then 1 else 0 end) as lucas_wins,
  sum(case when winner_team is null    then 1 else 0 end) as ties,
  count(*) as total_questions
from question_results
group by session_id;


-- ============================================================
-- FUNCTION: calculate_question_result
-- Calcula resultado de uma questão e grava em question_results
-- ============================================================
create or replace function calculate_question_result(
  p_session_id  uuid,
  p_question_id uuid
)
returns question_results
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viktor_correct  smallint;
  v_viktor_total    smallint;
  v_viktor_pct      numeric(5,2);
  v_lucas_correct   smallint;
  v_lucas_total     smallint;
  v_lucas_pct       numeric(5,2);
  v_winner          team_name;
  v_result          question_results;
begin
  select
    count(*) filter (where team = 'viktor' and is_correct),
    count(*) filter (where team = 'viktor'),
    count(*) filter (where team = 'lucas'  and is_correct),
    count(*) filter (where team = 'lucas')
  into v_viktor_correct, v_viktor_total, v_lucas_correct, v_lucas_total
  from answers
  where session_id = p_session_id and question_id = p_question_id;

  v_viktor_pct := case when v_viktor_total > 0
    then round((v_viktor_correct::numeric / v_viktor_total) * 100, 2)
    else 0
  end;

  v_lucas_pct := case when v_lucas_total > 0
    then round((v_lucas_correct::numeric / v_lucas_total) * 100, 2)
    else 0
  end;

  v_winner := case
    when v_viktor_pct > v_lucas_pct  then 'viktor'::team_name
    when v_lucas_pct  > v_viktor_pct then 'lucas'::team_name
    else null
  end;

  insert into question_results (
    session_id, question_id,
    viktor_correct, viktor_total, viktor_pct,
    lucas_correct,  lucas_total,  lucas_pct,
    winner_team
  ) values (
    p_session_id, p_question_id,
    v_viktor_correct, v_viktor_total, v_viktor_pct,
    v_lucas_correct,  v_lucas_total,  v_lucas_pct,
    v_winner
  )
  on conflict (session_id, question_id) do update set
    viktor_correct = excluded.viktor_correct,
    viktor_total   = excluded.viktor_total,
    viktor_pct     = excluded.viktor_pct,
    lucas_correct  = excluded.lucas_correct,
    lucas_total    = excluded.lucas_total,
    lucas_pct      = excluded.lucas_pct,
    winner_team    = excluded.winner_team,
    calculated_at  = now()
  returning * into v_result;

  return v_result;
end;
$$;


-- ============================================================
-- HELPER: is_admin()
-- Verifica se o usuário autenticado tem role = 'admin'
-- ============================================================
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table profiles         enable row level security;
alter table questions        enable row level security;
alter table game_sessions    enable row level security;
alter table answers          enable row level security;
alter table question_results enable row level security;
alter table session_players  enable row level security;

-- ── profiles ─────────────────────────────────────────────────
-- Todos leem qualquer perfil (necessário para listar jogadores)
create policy "profiles_select_all"
  on profiles for select
  using (true);

-- Cada usuário pode inserir/atualizar o PRÓPRIO perfil
-- (usado pelo cliente após login anônimo para gravar name+team)
create policy "profiles_upsert_own"
  on profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id);

-- ── questions ────────────────────────────────────────────────
create policy "questions_select_all"
  on questions for select
  using (true);

create policy "questions_admin_write"
  on questions for all
  using (is_admin());

-- ── game_sessions ────────────────────────────────────────────
create policy "sessions_select_all"
  on game_sessions for select
  using (true);

create policy "sessions_admin_write"
  on game_sessions for all
  using (is_admin());

-- ── answers ──────────────────────────────────────────────────
create policy "answers_select_all"
  on answers for select
  using (true);

create policy "answers_insert_own"
  on answers for insert
  with check (auth.uid() = user_id);

-- ── question_results ─────────────────────────────────────────
create policy "results_select_all"
  on question_results for select
  using (true);

create policy "results_admin_write"
  on question_results for all
  using (is_admin());

-- ── session_players ──────────────────────────────────────────
create policy "sp_select_all"
  on session_players for select
  using (true);

create policy "sp_insert_own"
  on session_players for insert
  with check (auth.uid() = user_id);

create policy "sp_update_own"
  on session_players for update
  using (auth.uid() = user_id);


-- ============================================================
-- REALTIME
-- Habilita live updates nas tabelas que precisam
-- ============================================================
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table
    game_sessions,
    answers,
    question_results,
    session_players;
commit;


-- ============================================================
-- ÍNDICES ADICIONAIS
-- ============================================================
create index game_sessions_status    on game_sessions (status);
create index session_players_session on session_players (session_id, team);


-- ============================================================
-- PERGUNTAS DE EXEMPLO
-- Adapte ao conteúdo real do seu evento
-- ============================================================
insert into questions (text, options, correct_index, order_index, video_url_viktor, video_url_lucas) values
(
  'Qual é o principal diferencial do nosso produto frente à concorrência?',
  '["Preço mais baixo", "Qualidade superior", "Atendimento 24h", "Entrega gratuita"]',
  1, 1, null, null
),
(
  'Qual é o prazo máximo de entrega para clientes Gold?',
  '["24 horas", "48 horas", "72 horas", "5 dias úteis"]',
  1, 2, null, null
);


-- ============================================================
-- PÓS-DEPLOY: Como promover um usuário a admin
--
-- 1. Crie o usuário no Supabase Dashboard → Authentication → Add User
--    (email + senha)
-- 2. Copie o UUID gerado
-- 3. Execute:
--
--    UPDATE profiles SET role = 'admin' WHERE id = '<uuid-do-admin>';
--
-- ============================================================


-- ============================================================
-- CHECKLIST DE CONFIGURAÇÃO NO DASHBOARD DO SUPABASE
--
--  ✅ Authentication → Settings → "Allow anonymous sign-ins" = ENABLED
--     (obrigatório para os vendedores entrarem sem email/senha)
--
--  ✅ Database → Realtime → Tabelas habilitadas (já feito acima via publication)
--
--  ✅ Criar o usuário admin e executar o UPDATE de role acima
--
-- ============================================================

-- FIM DO SCHEMA
