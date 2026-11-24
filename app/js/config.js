// Configuração do DM Logístic.
//
// Sem as chaves do Supabase o app roda em MODO DEMO: os dados ficam no
// navegador (localStorage) e já vêm preenchidos com exemplos de roupas.
//
// Para usar o banco real (dados compartilhados entre todos os usuários),
// crie um projeto gratuito em https://supabase.com, rode os scripts da pasta
// /supabase e preencha os dois valores abaixo (Project Settings > API).
// A "anon key" é pública por design — a segurança vem das regras RLS do banco.

export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";

export const APP_NAME = "DM Logístic";
export const APP_VERSION = "0.1.0";
