// Escolhe o backend: Supabase se configurado, senão modo demo local.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";
import { localApi } from "./local.js";
import { supabaseApi } from "./supabase.js";

const forcarDemo = new URLSearchParams(location.search).has("demo");

export const api = SUPABASE_URL && SUPABASE_ANON_KEY && !forcarDemo ? supabaseApi(SUPABASE_URL, SUPABASE_ANON_KEY) : localApi;
