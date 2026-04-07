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

    // Wait 1s for content script to initialize, then share session
    let timer: ReturnType<typeof setTimeout>;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      timer = setTimeout(() => postTokens(session.access_token, session.refresh_token), 1000);
    });

    // Re-share on token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) postTokens(session.access_token, session.refresh_token);
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
