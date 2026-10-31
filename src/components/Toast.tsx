import { CheckCircle2, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: number;
  message: string;
  tone?: 'info' | 'success' | 'warning';
}

interface ToastProps {
  toast: ToastMessage;
  onClose: () => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  return (
    <div className={`toast toast-${toast.tone ?? 'info'}`} role="status">
      <span className="toast-icon">
        {toast.tone === 'success' ? <CheckCircle2 size={17} /> : <Info size={17} />}
      </span>
      <span>{toast.message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss notification">
        <X size={14} />
      </button>
    </div>
  );
}
