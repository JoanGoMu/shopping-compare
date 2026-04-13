'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function submitFeedback(
  category: string,
  message: string,
  email?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!message.trim()) return { ok: false, error: 'Message is required' };
  if (!category) return { ok: false, error: 'Please select a category' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { error } = await admin.from('feedback').insert({
    category,
    message: message.trim(),
    email: email?.trim() || null,
    user_id: user?.id ?? null,
  });

  if (error) return { ok: false, error: 'Failed to submit feedback. Please try again.' };
  return { ok: true };
}
