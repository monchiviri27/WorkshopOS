import { createClient } from '@supabase/supabase-js'

// Estas variables de entorno las crearás en el siguiente paso
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)