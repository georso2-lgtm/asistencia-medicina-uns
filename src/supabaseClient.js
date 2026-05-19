import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://stnzihiegqhedqojwmrv.supabase.co'

const supabaseAnonKey = 'sb_publishable_czf3OElH6YiroI00vLe_nQ_6VboC5DS'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)