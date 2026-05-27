interface QrScannerProps {
  qrDataUrl: string | null;
  status: 'connecting' | 'qr_ready' | 'connected' | 'expired';
  onRefresh: () => void;
}

export function QrScanner({ qrDataUrl, status, onRefresh }: QrScannerProps) {
  if (status === 'qr_ready' && qrDataUrl) {
    return (
      <div className="flex flex-col items-center gap-4">
        <img
          src={qrDataUrl}
          alt="WhatsApp QR"
          className="h-64 w-64 rounded-lg border"
        />
        <p className="text-sm text-gray-500">
          Escaneá con WhatsApp en tu teléfono
        </p>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-red-600">QR expirado</p>
        <button
          onClick={onRefresh}
          className="rounded-md bg-green-600 px-4 py-2 text-sm text-white"
        >
          Generar nuevo QR
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-green-600" />
    </div>
  );
}
