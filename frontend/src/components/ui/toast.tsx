"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "error" | "success" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastId = 0;
const listeners: Set<(toast: Toast) => void> = new Set();

export function showToast(message: string, type: ToastType = "info") {
  const toast: Toast = {
    id: `toast-${++toastId}`,
    message,
    type,
  };
  listeners.forEach((listener) => listener(toast));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const listener = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 5000);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-3 shadow-elevation-3 animate-in slide-in-from-right-full",
            toast.type === "error" &&
              "bg-destructive-muted text-on-destructive-muted border border-destructive/20",
            toast.type === "success" &&
              "bg-success-muted text-on-surface border border-success/20",
            toast.type === "info" &&
              "bg-info-muted text-on-surface border border-info/20",
          )}
        >
          {toast.type === "error" && (
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          )}
          {toast.type === "success" && (
            <CheckCircle className="h-4 w-4 shrink-0 text-success" />
          )}
          {toast.type === "info" && (
            <Info className="h-4 w-4 shrink-0 text-info" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="ml-2 rounded p-0.5 hover:bg-hover"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
