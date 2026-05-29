"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { exportTransactionsCsv } from "@/app/actions/csv";

export function CsvExportButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const csv = await exportTransactionsCsv();
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `banana-sheet-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-sm font-medium transition-opacity disabled:opacity-50"
    >
      <Download size={18} />
      {loading ? "กำลังส่งออก…" : "ส่งออก CSV"}
    </button>
  );
}
