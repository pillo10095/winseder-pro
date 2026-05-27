'use client';

import { useCrmStore } from '../../stores/crm-store';
import Link from 'next/link';
import { BarChart3, User, Building2, DollarSign, ClipboardList } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'pipeline', label: 'Pipeline', icon: BarChart3, href: '/crm/pipeline' },
  { id: 'contacts', label: 'Contacts', icon: User, href: '/crm/contacts' },
  { id: 'companies', label: 'Companies', icon: Building2, href: '/crm/companies' },
  { id: 'deals', label: 'Deals', icon: DollarSign, href: '/crm/deals' },
  { id: 'activities', label: 'Activities', icon: ClipboardList, href: '/crm/activities' },
];

export function CrmSidebar() {
  const { activeSection, setActiveSection, recentRecords } = useCrmStore();

  return (
    <div className="flex h-full flex-col gap-1 py-4">
      <div className="mb-4 px-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CRM</h2>
      </div>

      <nav className="flex flex-col gap-1 px-2">
        {NAV_ITEMS.map(({ id, label, icon: Icon, href }) => (
          <Link
            key={id}
            href={href}
            onClick={() => setActiveSection(id)}
            className={`flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-all ${
              activeSection === id
                ? 'bg-primary-muted text-primary border-l-2 border-primary'
                : 'text-muted-foreground hover:bg-muted-light hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {recentRecords.length > 0 && (
        <div className="mt-auto px-2 pt-4">
          <h3 className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Recent
          </h3>
          <div className="flex flex-col gap-1">
            {recentRecords.map((record) => (
              <div
                key={record.id}
                className="flex items-center gap-2 rounded-sm px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted-light"
              >
                <span className="truncate">{record.name}</span>
                <span className="shrink-0 rounded-sm bg-muted-light px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {record.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
