import type { Json } from '../lib/database.types'
import { client } from '../lib/neon'

export async function exportMyData(): Promise<Json> {
  const { data, error } = await client.rpc('export_my_data')
  if (error) throw error
  return data
}

export async function deleteMyAccount(expectedEmail: string): Promise<void> {
  const { error } = await client.rpc('delete_my_account', {
    p_expected_email: expectedEmail,
  })
  if (error) throw error
}
