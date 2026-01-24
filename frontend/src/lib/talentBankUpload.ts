import { supabase } from '@/lib/supabase'

export async function uploadTalentBankItem(
  file: File,
  item: {
    item_type: string;
    title: string;
    description?: string;
    is_public?: boolean;
  }
) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new Error('Not authenticated');

  const userId = auth.user.id;
  const safeName = String(file.name || 'file').replace(/[^\w.\-]+/g, '_')
  const path = `${userId}/${item.item_type}/${crypto.randomUUID()}-${safeName}`

  const { error: uploadError } = await supabase
    .storage
    .from('talent-bank')
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase
    .from('talent_bank_items')
    .insert({
      user_id: userId,
      item_type: item.item_type,
      title: item.title,
      description: item.description ?? null,
      file_path: path,
      file_type: file.type,
      file_size: file.size,
      is_public: item.is_public ?? false
    });

  if (insertError) throw insertError;

  return { path };
}
