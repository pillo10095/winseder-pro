'use client';

import { useState } from 'react';
import { Plus, X, FileText, DollarSign, User } from 'lucide-react';

export function QuickAddBar() {
  const [showMenu, setShowMenu] = useState(false);

  const actions = [
    { label: 'Log Activity', icon: FileText, onClick: () => {} },
    { label: 'Add Deal', icon: DollarSign, onClick: () => {} },
    { label: 'Add Contact', icon: User, onClick: () => {} },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {showMenu && (
        <div className="mb-3 flex flex-col gap-2 animate-geo-fade-in">
          {actions.map(({ label, icon: Icon, onClick }) => (
            <button
              key={label}
              onClick={() => { setShowMenu(false); onClick(); }}
              className="flex items-center gap-2 rounded-sm bg-card border border-border px-4 py-2.5 text-sm font-medium text-foreground shadow-constructivist hover:shadow-constructivist-hover hover:-translate-x-0.5 transition-all"
            >
              <Icon className="h-4 w-4 text-primary" />
              {label}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex h-14 w-14 items-center justify-center rounded-sm bg-primary text-primary-foreground shadow-constructivist hover:brightness-110 transition-all"
      >
        {showMenu ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
