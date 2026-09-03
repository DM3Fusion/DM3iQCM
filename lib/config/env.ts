export interface PublicEnvironment { supabaseUrl: string; supabaseAnonKey: string; configured: boolean }

export function getPublicEnvironment(): PublicEnvironment {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  return { supabaseUrl, supabaseAnonKey, configured: Boolean(supabaseUrl && supabaseAnonKey) };
}

export function requireSupabaseEnvironment() {
  const environment = getPublicEnvironment();
  if (!environment.configured) throw new Error("Supabase environment variables are not configured.");
  return { url: environment.supabaseUrl, anonKey: environment.supabaseAnonKey };
}
