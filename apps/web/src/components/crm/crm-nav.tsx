'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  User,
  Building2,
  DollarSign,
  ClipboardList,
  Calendar,
  Tags,
  Timer,
  Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'pipeline', label: 'Pipeline', icon: BarChart3, href: '/crm/pipeline' },
  { id: 'contacts', label: 'Contactos', icon: User, href: '/crm/contacts' },
  { id: 'companies', label: 'Empresas', icon: Building2, href: '/crm/companies' },
  { id: 'deals', label: 'Negocios', icon: DollarSign, href: '/crm/deals' },
  { id: 'calendar', label: 'Calendario', icon: Calendar, href: '/crm/calendar' },
  { id: 'automation', label: 'Automación', icon: Zap, href: '/crm/automation' },
  { id: 'schedule', label: 'Programación', icon: Timer, href: '/crm/schedule' },
  { id: 'activities', label: 'Actividades', icon: ClipboardList, href: '/crm/activities' },
  { id: 'labels', label: 'Etiquetas', icon: Tags, href: '/crm/labels' },
];

export function CrmNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/crm/pipeline') return pathname === '/crm/pipeline';
    if (href === '/crm/contacts') return pathname.startsWith('/crm/contacts');
    if (href === '/crm/companies') return pathname.startsWith('/crm/companies');
    if (href === '/crm/deals') return pathname.startsWith('/crm/deals');
    return pathname === href;
  };

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border pb-3 mb-6">
      {NAV_ITEMS.map(({ id, label, icon: Icon, href }) => {
        const active = isActive(href);
        return (
          <Link
            key={id}
            href={href}
            className={cn(
              'flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-bold transition-all',
              active
                ? 'bg-primary text-primary-foreground shadow-constructivist'
                : 'text-muted-foreground hover:bg-muted-light hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
