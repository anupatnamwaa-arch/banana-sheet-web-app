"use client";

import { useState } from "react";
import { Download, AlertCircle } from "lucide-react";
import { exportTransactionsCsv } from "@/app/actions/csv";
import { useT } from "@/lib/i18n/LanguageProvider";

export function CsvExportButton() {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const csv = await exportTransactionsCsv();
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `banana-sheet-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError(t.common.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleExport}
        disabled={loading}
        className="flex w-full items-center gap-3 rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-sm font-medium transition-opacity disabled:opacity-50"
      >
        <Download size={18} />
        {loading ? t.settings.csvExporting : t.settings.csvExportBtn}
      </button>
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-[var(--negative,#f87171)]/10 px-3 py-2 text-xs text-[var(--negative,#f87171)]">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
