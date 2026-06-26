import { createClient } from '@supabase/supabase-js'

// La anon key es PÚBLICA y segura para el frontend: está protegida por las
// políticas RLS de Supabase (el público solo lee burgers y suma clics; editar
// requiere login). La service_role NUNCA va acá.
const SUPABASE_URL = 'https://szyzcnubomgpbkhsmrsz.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6eXpjbnVib21ncGJraHNtcnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjU2MTQsImV4cCI6MjA5ODAwMTYxNH0.6iT0YyEgvWUNtaRsK6A0rEIqjKpa_x4x9szVSh8DDK8'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
