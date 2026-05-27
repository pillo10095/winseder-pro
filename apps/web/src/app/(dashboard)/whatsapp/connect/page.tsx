'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';

type ConnectionStatus = 'connecting' | 'qr_ready' | 'connected' | 'expired';

export default function WhatsAppConnectPage() {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const connectSocket = useCallback(() => {
    const sock = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/whatsapp`, {
      query: { companyId: 'current' },
      transports: ['websocket'],
    });

    sock.on('connect', () => {
      console.log('WS connected');
    });

    sock.on('wa:qr:generated', (payload: { qrDataUrl: string; expiresAt: string }) => {
      setQrDataUrl(payload.qrDataUrl);
      setStatus('qr_ready');
      setError(null);
    });

    sock.on('wa:qr:expired', () => {
      setQrDataUrl(null);
      setStatus('expired');
      setError('QR code expired. Request a new one.');
    });

    sock.on('wa:session:status', (payload: { status: string }) => {
      if (payload.status === 'CONNECTED') {
        setStatus('connected');
        setError(null);
      }
    });

    sock.on('disconnect', () => {
      console.log('WS disconnected');
    });

    socketRef.current = sock;

    return () => {
      sock.disconnect();
    };
  }, []);

  useEffect(() => {
    const cleanup = connectSocket();
    return cleanup;
  }, [connectSocket]);

  const handleRefreshQr = () => {
    if (socketRef.current) {
      socketRef.current.emit('wa:request:qr', {});
      setStatus('connecting');
      setQrDataUrl(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/whatsapp"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Volver a WhatsApp
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          Conectar WhatsApp
        </h1>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-8">
        {status === 'connecting' && (
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-gray-100" />
            <p className="mt-4 text-sm text-gray-600">Conectando con WhatsApp...</p>
          </div>
        )}

        {status === 'qr_ready' && qrDataUrl && (
          <div className="text-center">
            <img
              src={qrDataUrl}
              alt="WhatsApp QR Code"
              className="mx-auto h-64 w-64"
            />
            <p className="mt-4 text-sm text-gray-600">
              Escaneá este código QR con WhatsApp en tu teléfono
            </p>
            <ol className="mt-4 space-y-2 text-left text-sm text-gray-500">
              <li>1. Abrí WhatsApp en tu teléfono</li>
              <li>2. Tocá Menú o Configuración</li>
              <li>3. Seleccioná Dispositivos vinculados</li>
              <li>4. Tocá Vincular un dispositivo</li>
              <li>5. Escaneá este código QR</li>
            </ol>
          </div>
        )}

        {status === 'connected' && (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-medium text-gray-900">
              ¡WhatsApp conectado!
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Ya podés recibir y responder mensajes.
            </p>
          </div>
        )}

        {status === 'expired' && (
          <div className="text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={handleRefreshQr}
              className="mt-4 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500"
            >
              Generar nuevo QR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
