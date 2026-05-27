'use client';

interface MediaPreviewProps {
  url: string;
  type: 'image' | 'video' | 'document' | 'audio';
  onClose: () => void;
}

export function MediaPreview({ url, type, onClose }: MediaPreviewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100"
        >
          <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {type === 'image' && (
          <img src={url} alt="Preview" className="max-h-[85vh] rounded-lg object-contain" />
        )}
        {type === 'video' && (
          <video src={url} controls className="max-h-[85vh] rounded-lg" autoPlay />
        )}
        {type === 'audio' && (
          <audio src={url} controls className="w-96" autoPlay />
        )}
        {type === 'document' && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg bg-white p-6 shadow-lg"
          >
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Abrir documento</span>
          </a>
        )}
      </div>
    </div>
  );
}
