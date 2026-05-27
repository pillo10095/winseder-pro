const statusConfig: Record<string, { label: string; color: string }> = {
  CONNECTED: { label: 'Conectado', color: 'bg-green-100 text-green-800' },
  CONNECTING: { label: 'Conectando', color: 'bg-yellow-100 text-yellow-800' },
  QR_CODE: { label: 'Esperando QR', color: 'bg-blue-100 text-blue-800' },
  DISCONNECTED: { label: 'Desconectado', color: 'bg-gray-100 text-gray-800' },
  EXPIRED: { label: 'Expirado', color: 'bg-red-100 text-red-800' },
};

export function ConnectionStatus({ status }: { status: string }) {
  const config = statusConfig[status] ?? {
    label: status,
    color: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
