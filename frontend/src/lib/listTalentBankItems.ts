// NOTE: This file appears unused - talent bank items are queried directly in components
// Keeping for backwards compatibility but should use the main supabase client from @/lib/supabase
import { supabase } from '@/lib/supabase';

export async function listTalentBankItems() {
  const { data: sessionRes } = await supabase.auth.getSession()
  const userId = sessionRes.session?.user?.id
  if (!userId) throw new Error('Not authenticated')
  
  const { data, error } = await supabase
    .from('talent_bank_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
