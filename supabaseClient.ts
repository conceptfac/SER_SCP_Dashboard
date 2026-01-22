import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fusmqwmbsqewxvjubgmd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c21xd21ic3Fld3h2anViZ21kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NTA2MzksImV4cCI6MjA4NDUyNjYzOX0.8elvjb0X3OyB2Yi9PTgc3dbMLhvgdIHmx1oY4f2WWH4';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);