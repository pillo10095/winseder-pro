'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface ContactFormProps {
  initial?: { name: string; email: string; phone: string; company_name: string; role: string; source: string; notes: string };
  onClose: () => void;
  onSave: (data: any) => void;
}

export function ContactForm({ initial, onClose, onSave }: ContactFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [companyName, setCompanyName] = useState(initial?.company_name ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [source, setSource] = useState(initial?.source ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-sm bg-card border border-border p-6 shadow-constructivist max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">{initial ? 'Edit Contact' : 'New Contact'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="John Doe"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="+1 555-0123"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Company</label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="Acme Inc"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Role</label>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="CEO"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">Select source</option>
              <option value="website">Website</option>
              <option value="referral">Referral</option>
              <option value="linkedin">LinkedIn</option>
              <option value="cold_outreach">Cold Outreach</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="Any additional info..."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-sm border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted-light hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ name, email: email || undefined, phone: phone || undefined, company_name: companyName || undefined, role: role || undefined, source: source || undefined, notes: notes || undefined })}
            disabled={!name.trim()}
            className="rounded-sm bg-primary px-4 py-2 text-sm text-primary-foreground hover:brightness-110 transition-all disabled:opacity-50"
          >
            {initial ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
