import { supabaseBrowser } from '@/lib/supabaseBrowser';

function generateReferralCode(userId: string) {
  return userId.replace(/-/g, '').slice(0, 6) + Math.random().toString(36).slice(2, 6);
}

// Call this on the referrals page (or anywhere you need to show the user's link)
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const { data: profile } = await supabaseBrowser
    .from('profiles')
    .select('referral_code')
    .eq('id', userId)
    .single();

  if (profile?.referral_code) return profile.referral_code;

  const code = generateReferralCode(userId);
  await supabaseBrowser
    .from('profiles')
    .update({ referral_code: code })
    .eq('id', userId);

  return code;
}

// Call this right after a successful signup (once you have the new user's id)
export async function applyReferralCookie(userId: string) {
  const match = document.cookie.match(/(?:^|; )referral_code=([^;]+)/);
  if (!match) return;
  const code = decodeURIComponent(match[1]);

  const { data: referrer } = await supabaseBrowser
    .from('profiles')
    .select('id')
    .eq('referral_code', code)
    .single();

  if (referrer && referrer.id !== userId) {
    await supabaseBrowser
      .from('profiles')
      .update({ referred_by: referrer.id })
      .eq('id', userId);
  }

  // clear the cookie either way so it doesn't get reapplied
  document.cookie = 'referral_code=; Max-Age=0; path=/';
}

export type ReferralRow = {
  id: string;
  referred_id: string;
  status: string;
  created_at: string;
  confirmed_at: string | null;
};

export async function fetchReferrals(userId: string): Promise<ReferralRow[]> {
  const { data, error } = await supabaseBrowser
    .from('referrals')
    .select('id, referred_id, status, created_at, confirmed_at')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
