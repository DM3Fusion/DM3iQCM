import { getPublicEnvironment, requireSupabaseEnvironment } from "@/lib/config/env";
export function getSupabaseConfig(){const env=getPublicEnvironment();return {url:env.supabaseUrl,anonKey:env.supabaseAnonKey,configured:env.configured};}
export function requireSupabaseConfig(){return requireSupabaseEnvironment();}
