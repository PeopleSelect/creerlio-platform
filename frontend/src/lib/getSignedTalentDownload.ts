import { supabase } from '@/lib/supabase'

export async function getSignedTalentDownload(path: string) {
  const { data, error } = await supabase.storage.from('talent-bank').createSignedUrl(path, 60)

  if (error) throw error
  return data?.signedUrl
}
