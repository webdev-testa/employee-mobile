import { createClient } from '@supabase/supabase-js'

export const supabasePos = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    db: {
      schema: 'pos',
    },
  }
)
