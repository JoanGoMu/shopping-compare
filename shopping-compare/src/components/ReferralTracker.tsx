'use client';

import { useEffect } from 'react';
import { recordReferral } from '@/app/dashboard/actions';

export default function ReferralTracker() {
  useEffect(() => {
    const ref = localStorage.getItem('pending_ref');
    if (!ref) return;
    recordReferral(ref).finally(() => localStorage.removeItem('pending_ref'));
  }, []);

  return null;
}
