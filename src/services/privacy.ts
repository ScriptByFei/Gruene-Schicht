import type { Json } from '../lib/database.types'
import { supabase } from '../lib/supabase'

export async function exportMyData(): Promise<Json> {
  const { data, error } = await supabase.rpc('export_my_data')
  if (error) throw error
  return data
}

export async function deleteMyAccount(expectedEmail: string): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account', {
    p_expected_email: expectedEmail,
  })
  if (error) throw error
}
