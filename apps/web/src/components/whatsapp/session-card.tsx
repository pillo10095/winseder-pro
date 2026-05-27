import { ConnectionStatus } from './connection-status';

interface SessionCardProps {
  id: string;
  name: string;
  status: string;
  phoneNumber?: string | null;
  lastSeen?: string | null;
  onDisconnect: (id: string) => void;
  onViewQr: (id: string) => void;
}

export function SessionCard({
  id,
  name,
  status,
  phoneNumber,
  lastSeen,
  onDisconnect,
  onViewQr,
}: SessionCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{name}</p>
            {phoneNumber && (
              <p className="text-xs text-gray-500">{phoneNumber}</p>
            )}
          </div>
        </div>
        <ConnectionStatus status={status} />
      </div>

      {lastSeen && (
        <p className="mt-3 text-xs text-gray-400">
          Última vez: {new Date(lastSeen).toLocaleString()}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        {status === 'CONNECTING' || status === 'QR_CODE' ? (
          <button
            onClick={() => onViewQr(id)}
            className="rounded-md bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
          >
            Ver QR
          </button>
        ) : null}
        <button
          onClick={() => onDisconnect(id)}
          className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          Desconectar
        </button>
      </div>
    </div>
  );
}
