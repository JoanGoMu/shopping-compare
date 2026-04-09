'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ExtensionAuthBridge() {
  useEffect(() => {
    const supabase = createClient();

    function postTokens(accessToken: string, refreshToken: string) {
      window.postMessage(
        { type: 'COMPARECART_AUTH', access_token: accessToken, refresh_token: refreshToken },
        window.location.origin
      );
    }

    // Post tokens at 500ms, 1.5s, and 4s to handle variable content-script load times
    const timers: ReturnType<typeof setTimeout>[] = [];
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      for (const delay of [500, 1500, 4000]) {
        timers.push(setTimeout(() => postTokens(session.access_token, session.refresh_token), delay));
      }
    });

    // Re-share on token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) postTokens(session.access_token, session.refresh_token);
    });

    return () => {
      timers.forEach(clearTimeout);
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
