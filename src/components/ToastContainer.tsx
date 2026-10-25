import React from 'react';
import { X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  surqlSnippet?: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#18181c]/95 border border-white/[0.1] shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                t.type === 'success'
                  ? 'bg-emerald-400'
                  : t.type === 'error'
                  ? 'bg-red-400'
                  : 'bg-white'
              }`}
            />
            <p className="text-[13px] font-medium text-white truncate">{t.title}</p>
          </div>
          <button
            onClick={() => onDismiss(t.id)}
            className="text-zinc-500 hover:text-white p-1 rounded-full transition-colors shrink-0"
            aria-label="Close notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
