"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { getHealth } from "@/lib/api";
import type { HealthResponse } from "@/types/api";

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-foreground">
              Welcome to onotebook
            </h1>
            <p className="mt-2 text-muted-foreground">
              Select a notebook from the sidebar or create a new one
            </p>
            {health && (
              <div className="mt-4 text-sm text-muted-foreground">
                <p>
                  API Status:{" "}
                  <span className="text-green-600">{health.status}</span>
                </p>
                <p>Version: {health.version}</p>
                <p>
                  Ollama:{" "}
                  {health.ollama_connected ? (
                    <span className="text-green-600">Connected</span>
                  ) : (
                    <span className="text-red-600">Disconnected</span>
                  )}
                </p>
              </div>
            )}
            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-600">
                <p>Failed to connect to API</p>
                <p className="text-xs">{error}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
