import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseServiceKey)

export type Client = {
  id: string
  name: string
  device: 'whoop' | 'oura' | 'both'
  onboard_token: string
  whoop_access_token: string | null
  whoop_refresh_token: string | null
  whoop_token_expires_at: string | null
  oura_access_token: string | null
  oura_refresh_token: string | null
  oura_token_expires_at: string | null
  google_sheet_id: string | null
  connected_at: string | null
}