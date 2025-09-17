import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vqlsoyteuywpuuytmnbz.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbHNveXRldXl3cHV1eXRtbmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTY4MjQsImV4cCI6MjA3MDEzMjgyNH0.LsCXN-5Sq_oYwN5uO86nZrU1oMVF8gaS5fedgXZVGEw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 