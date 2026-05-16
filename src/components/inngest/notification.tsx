"use client";

import { useEffect, useState, useCallback } from "react";

import { ToastType } from "@/inngest/utils/types";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

// ─── Per-toast config ────────────────────────────────────────────────────────
const TOAST_CONFIG: Record<ToastType, { icon: string; bar: string; bg: string; title: string }> = {
  step_start: {
    icon: "⏳",
    bar: "from-blue-500 to-cyan-400",
    bg: "border-blue-500/30 bg-blue-500/10",
    title: "text-blue-300",
  },
  step_end: {
    icon: "✅",
    bar: "from-indigo-500 to-purple-400",
    bg: "border-indigo-500/30 bg-indigo-500/10",
    title: "text-indigo-300",
  },
  function_complete: {
    icon: "🎉",
    bar: "from-green-500 to-emerald-400",
    bg: "border-green-500/30 bg-green-500/10",
    title: "text-green-300",
  },
  function_error: {
    icon: "❌",
    bar: "from-red-500 to-rose-400",
    bg: "border-red-500/30 bg-red-500/10",
    title: "text-red-300",
  },
  info: {
    icon: "ℹ️",
    bar: "from-gray-500 to-gray-400",
    bg: "border-gray-500/30 bg-gray-500/10",
    title: "text-gray-300",
  },
};

const DISMISS_AFTER_MS = 5000;

// ─── Single Toast card ───────────────────────────────────────────────────────
function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const cfg = TOAST_CONFIG[toast.type];

  useEffect(() => {
    const t = setTimeout(onDismiss, DISMISS_AFTER_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={`relative flex items-start gap-3 min-w-[300px] max-w-[360px] rounded-2xl border backdrop-blur-xl p-4 shadow-2xl ${cfg.bg}`}
      style={{
        animation: "slideIn 0.3s ease-out forwards",
      }}
    >
      {/* Progress bar that drains over DISMISS_AFTER_MS */}
      <div className="absolute bottom-0 left-0 h-[2px] w-full rounded-b-2xl overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${cfg.bar}`}
          style={{ animation: "shrink 5s linear forwards" }}
        />
      </div>

      {/* Icon */}
      <span className="text-xl leading-none mt-0.5 select-none">{cfg.icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm leading-tight ${cfg.title}`}>{toast.title}</p>
        <p className="text-gray-400 text-xs mt-0.5 leading-relaxed truncate">{toast.message}</p>
      </div>

      {/* Close */}
      <button
        onClick={onDismiss}
        className="text-gray-600 hover:text-gray-300 transition-colors text-lg leading-none -mt-0.5 ml-1 shrink-0"
        aria-label="dismiss"
      >
        ×
      </button>

      {/* Keyframes */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Toast Container (exported hook + portal) ────────────────────────────────
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, title: string, message: string) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

// ─── Rendered stack of toasts ────────────────────────────────────────────────
export function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard toast={t} onDismiss={() => removeToast(t.id)} />
        </div>
      ))}
    </div>
  );
}
