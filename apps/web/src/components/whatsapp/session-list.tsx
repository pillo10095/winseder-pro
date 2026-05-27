'use client';

import { SessionCard } from './session-card';
import { ConnectionStatus } from './connection-status';

interface Session {
  id: string;
  session_name: string;
  status: string;
  phone_number?: string | null;
  last_seen?: string | null;
}

interface SessionListProps {
  sessions: Session[];
  onDisconnect: (id: string) => void;
  onViewQr: (id: string) => void;
}

export function SessionList({ sessions, onDisconnect, onViewQr }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
        <p className="text-sm text-gray-500">
          No hay sesiones de WhatsApp. Conectá una para empezar.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          id={session.id}
          name={session.session_name}
          status={session.status}
          phoneNumber={session.phone_number}
          lastSeen={session.last_seen}
          onDisconnect={onDisconnect}
          onViewQr={onViewQr}
        />
      ))}
    </div>
  );
}
