'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AutomationPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/crm/automation/rules'); }, [router]);
  return null;
}
