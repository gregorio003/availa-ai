-- Adiciona controle de pagamento no agendamento.
-- Rodar no SQL Editor do Supabase.

alter table appointments
  add column if not exists paid boolean not null default false;
