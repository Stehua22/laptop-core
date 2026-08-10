'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type Tier = 'free' | 'premium' | 'ultra';

// Reads the `plan` column on the `profiles` table
export function useUserTier(): { tier: Tier; loading: boolean } {
  const [tier, setTier] = useState<Tier>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchTier() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) { setTier('free'); setLoading(false); }
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();

      if (!cancelled) {
        setTier(!error && data?.plan ? (data.plan as Tier) : 'free');
        setLoading(false);
      }
    }

    fetchTier();
    return () => { cancelled = true; };
  }, []);

  return { tier, loading };
}
