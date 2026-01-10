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
            "flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg animate-in slide-in-from-right-full",
            toast.type === "error" &&
              "bg-destructive text-destructive-foreground",
            toast.type === "success" && "bg-success text-success-foreground",
            toast.type === "info" && "bg-primary text-primary-foreground",
          )}
        >
          {toast.type === "error" && (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {toast.type === "success" && (
            <CheckCircle className="h-4 w-4 shrink-0" />
          )}
          {toast.type === "info" && <Info className="h-4 w-4 shrink-0" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="ml-2 rounded p-0.5 hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
