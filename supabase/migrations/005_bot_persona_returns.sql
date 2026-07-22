-- Bot mais rico (personalidade + perguntas configuráveis) e inteligência de retornos.
-- Rodar no SQL Editor do Supabase.

alter table bot_messages
  add column if not exists persona text not null default
    'Seja acolhedor, simpático e natural, como um bom atendente humano. Deixe o cliente à vontade, converse de forma leve — nada de parecer robótico, insistente ou chato.';

alter table bot_messages
  add column if not exists return_message text not null default
    'Olá {nome}! 👋 Já faz um tempinho desde a última vez. Que tal agendar de novo? 🚗✨';

alter table bot_messages
  add column if not exists collect_fields jsonb not null default
    '[{"key":"name","label":"Nome do cliente","enabled":true},{"key":"vehicle","label":"Carro / veículo","enabled":true},{"key":"pickup","label":"Precisa buscar o carro?","enabled":false},{"key":"address","label":"Endereço","enabled":false}]'::jsonb;

alter table businesses
  add column if not exists return_days int not null default 30;
