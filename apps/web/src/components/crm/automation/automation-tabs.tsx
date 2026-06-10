'use client';

import { usePathname, useRouter } from 'next/navigation';

const TABS = [
  { id: 'rules', label: 'Reglas', href: '/crm/automation/rules' },
  { id: 'labels', label: 'Etiquetas', href: '/crm/automation/labels' },
];

export function AutomationTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = pathname.endsWith('/labels') ? 'labels' : 'rules';

  return (
    <div className="flex gap-0 border-b border-border">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => router.push(tab.href)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab.id
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
