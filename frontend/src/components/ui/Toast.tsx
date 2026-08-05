import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: 'border-l-4 border-green-500 bg-card',
  error:   'border-l-4 border-red-500 bg-card',
  warning: 'border-l-4 border-amber-500 bg-card',
  info:    'border-l-4 border-red-500 bg-card',
};

const iconColors = {
  success: 'text-green-500',
  error:   'text-red-500',
  warning: 'text-amber-500',
  info:    'text-red-500',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const Icon = icons[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`relative flex items-start gap-3 p-4 rounded-lg shadow-2xl min-w-[300px] max-w-[380px] ${styles[toast.type]}`}
    >
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColors[toast.type]}`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm leading-snug">{toast.title}</p>
        {toast.message && (
          <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar */}
      <motion.div
        className={`absolute bottom-0 left-0 h-0.5 rounded-full ${
          toast.type === 'success' ? 'bg-green-500' :
          toast.type === 'error'   ? 'bg-red-500' :
          toast.type === 'warning' ? 'bg-amber-500' : 'bg-red-500'
        }`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 5, ease: 'linear' }}
        onAnimationComplete={() => onDismiss(toast.id)}
      />
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-4), { id, type, title, message }]);
  }, []);

  const ctx: ToastContextValue = {
    toast: addToast,
    success: (t, m) => addToast('success', t, m),
    error:   (t, m) => addToast('error',   t, m),
    warning: (t, m) => addToast('warning', t, m),
    info:    (t, m) => addToast('info',    t, m),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
