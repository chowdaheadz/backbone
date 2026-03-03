import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sbkdmstxuyyfrtgvkcax.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNia2Rtc3R4dXl5ZnJ0Z3ZrY2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjI1MTEsImV4cCI6MjA4ODEzODUxMX0.NfNe3ey-w8eI820hbRyK4j6uYMhT_BQXwXVxNzLiGlI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
