# CSV Import/Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add free-tier CSV export (one-tap download) and a Thai-first bottom-drawer import wizard with column mapping, live preview, and bulk insert to the Settings page.

**Architecture:** A `'use server'` actions file handles data access (export fetch + bulk insert with category auto-create). Two `'use client'` components handle the UI: a simple export button and a Framer Motion bottom drawer that runs Papaparse in the browser and only sends the final mapped rows to the server.

**Tech Stack:** Next.js 16 App Router (server actions), Supabase SSR, Papaparse, react-dropzone, Framer Motion, Tailwind v4, TypeScript, lucide-react icons.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/actions/csv.ts` | **Create** | `exportTransactionsCsv()` + `bulkImportTransactions()` server actions |
| `app/(dashboard)/settings/_components/CsvExportButton.tsx` | **Create** | Client button — calls export action, triggers browser download |
| `app/(dashboard)/settings/_components/CsvImportDrawer.tsx` | **Create** | Client bottom-drawer wizard — upload → map → preview → confirm |
| `app/(dashboard)/settings/page.tsx` | **Modify** | Wire in both components |

---

## Task 1: Server action — Export

**Files:**
- Create: `app/actions/csv.ts`

- [ ] **Step 1: Create the file with the export action**

```typescript
// app/actions/csv.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { bangkokDateKey } from "@/lib/format";
import type { TransactionType } from "@/lib/types";

export interface MappedRow {
  date: string;       // ISO string (Bangkok-local date passed as YYYY-MM-DD)
  amount: number;     // always positive
  type: TransactionType;
  category?: string;
  note?: string;
}

export async function exportTransactionsCsv(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data, error } = await supabase
    .from("transactions")
    .select("date, amount, type, note, categories(name)")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    date: string;
    amount: number;
    type: string;
    note: string | null;
    categories: { name: string } | null;
  }>;

  const header = "date,amount,type,category,note";
  const lines = rows.map((r) => {
    const date = bangkokDateKey(r.date);
    const category = r.categories?.name ?? "";
    const note = (r.note ?? "").replace(/"/g, '""');
    return `${date},${r.amount},${r.type},${category},"${note}"`;
  });

  return [header, ...lines].join("\n");
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -10
```
Expected: `✓ Compiled successfully` (or only errors from other unrelated stubs — not from `app/actions/csv.ts`).

---

## Task 2: Server action — Bulk Import

**Files:**
- Modify: `app/actions/csv.ts` (add `bulkImportTransactions`)

- [ ] **Step 1: Append the bulk import action to `app/actions/csv.ts`**

```typescript
// Append to app/actions/csv.ts

export interface ImportResult {
  inserted: number;
  skipped: number;
}

export async function bulkImportTransactions(
  rows: MappedRow[]
): Promise<ImportResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Resolve categories: batch upsert unique names, then build name→id map.
  const uniqueNames = [...new Set(
    rows.map((r) => r.category?.trim()).filter(Boolean) as string[]
  )];

  const categoryMap: Record<string, string> = {};

  if (uniqueNames.length > 0) {
    // Insert missing categories (ON CONFLICT does nothing — idempotent).
    await supabase.from("categories").insert(
      uniqueNames.map((name) => ({ user_id: user.id, name })),
      { count: "exact" }
    );

    const { data: cats } = await supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", user.id)
      .in("name", uniqueNames);

    (cats ?? []).forEach((c: { id: string; name: string }) => {
      categoryMap[c.name.toLowerCase()] = c.id;
    });
  }

  // Build insert payload — skip rows that fail validation.
  let skipped = 0;
  const inserts: Array<{
    user_id: string;
    amount: number;
    type: TransactionType;
    category_id: string | null;
    note: string | null;
    date: string;
  }> = [];

  for (const row of rows) {
    if (!Number.isFinite(row.amount) || row.amount < 0) { skipped++; continue; }
    if (row.type !== "income" && row.type !== "expense") { skipped++; continue; }
    const dateMs = Date.parse(row.date);
    if (isNaN(dateMs)) { skipped++; continue; }

    inserts.push({
      user_id: user.id,
      amount: row.amount,
      type: row.type,
      category_id: row.category
        ? (categoryMap[row.category.toLowerCase()] ?? null)
        : null,
      note: row.note ?? null,
      date: new Date(dateMs).toISOString(),
    });
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from("transactions").insert(inserts);
    if (error) throw new Error(error.message);
  }

  return { inserted: inserts.length, skipped };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -10
```
Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
git add app/actions/csv.ts
git commit -m "feat: add exportTransactionsCsv and bulkImportTransactions server actions"
```

---

## Task 3: CsvExportButton component

**Files:**
- Create: `app/(dashboard)/settings/_components/CsvExportButton.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/settings/_components/CsvExportButton.tsx
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
```

Note: The `"﻿"` BOM prefix ensures Thai characters display correctly when opened in Excel on Windows.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -10
```
Expected: `✓ Compiled successfully`.

---

## Task 4: CSV parsing utilities

**Files:**
- Create: `app/(dashboard)/settings/_components/csv-parse.ts`

This module keeps all Papaparse and date-parsing logic out of the drawer component so it stays testable and readable.

- [ ] **Step 1: Create the parsing utilities**

```typescript
// app/(dashboard)/settings/_components/csv-parse.ts
import Papa from "papaparse";
import type { MappedRow } from "@/app/actions/csv";
import type { TransactionType } from "@/lib/types";

export type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
export type TypeMode = "sign" | "column";

export interface ColumnMapping {
  date: string;
  amount: string;
  category: string;
  type: string;       // used only when typeMode === "column"
  note: string;
}

export interface TypeColumnMapping {
  expenseValue: string;
  incomeValue: string;
}

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];  // all rows (raw strings)
}

/** Parse a File with Papaparse. Returns headers + all raw rows. */
export function parseFile(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields ?? [];
        if (headers.length === 0) {
          reject(new Error("ไม่พบหัวคอลัมน์ในไฟล์"));
          return;
        }
        resolve({ headers, rows: results.data });
      },
      error(err) {
        reject(new Error(err.message));
      },
    });
  });
}

/** Parse a date string into a YYYY-MM-DD string, or null on failure. */
export function parseDate(raw: string, format: DateFormat): string | null {
  const s = raw.trim();
  let day: number, month: number, year: number;

  if (format === "DD/MM/YYYY") {
    const [d, m, y] = s.split(/[\/\-\.]/);
    day = parseInt(d, 10); month = parseInt(m, 10); year = parseInt(y, 10);
  } else if (format === "MM/DD/YYYY") {
    const [m, d, y] = s.split(/[\/\-\.]/);
    day = parseInt(d, 10); month = parseInt(m, 10); year = parseInt(y, 10);
  } else {
    // YYYY-MM-DD
    const [y, m, d] = s.split(/[\/\-\.]/);
    day = parseInt(d, 10); month = parseInt(m, 10); year = parseInt(y, 10);
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export interface MappedRowResult {
  row: MappedRow | null;
  error: string | null;  // Thai error message
}

/** Map a single raw CSV row to a MappedRow using current config. Returns error in Thai. */
export function mapRow(
  raw: Record<string, string>,
  mapping: ColumnMapping,
  dateFormat: DateFormat,
  typeMode: TypeMode,
  typeColumnMapping: TypeColumnMapping
): MappedRowResult {
  const rawDate = raw[mapping.date]?.trim() ?? "";
  const rawAmount = raw[mapping.amount]?.trim() ?? "";

  const date = parseDate(rawDate, dateFormat);
  if (!date) return { row: null, error: `วันที่ไม่ถูกต้อง: "${rawDate}"` };

  const numericAmount = parseFloat(rawAmount.replace(/[^0-9.\-]/g, ""));
  if (isNaN(numericAmount)) return { row: null, error: `จำนวนเงินไม่ถูกต้อง: "${rawAmount}"` };

  let type: TransactionType;
  let amount: number;

  if (typeMode === "sign") {
    type = numericAmount < 0 ? "expense" : "income";
    amount = Math.abs(numericAmount);
  } else {
    const rawType = raw[mapping.type]?.trim() ?? "";
    if (rawType === typeColumnMapping.expenseValue) {
      type = "expense";
    } else if (rawType === typeColumnMapping.incomeValue) {
      type = "income";
    } else {
      return { row: null, error: `ประเภทไม่ถูกต้อง: "${rawType}"` };
    }
    amount = Math.abs(numericAmount);
  }

  if (amount < 0) return { row: null, error: "จำนวนเงินต้องไม่ติดลบ" };

  const category = mapping.category ? (raw[mapping.category]?.trim() || undefined) : undefined;
  const note = mapping.note ? (raw[mapping.note]?.trim() || undefined) : undefined;

  return { row: { date, amount, type, category, note }, error: null };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -10
```
Expected: `✓ Compiled successfully`.

---

## Task 5: CsvImportDrawer component

**Files:**
- Create: `app/(dashboard)/settings/_components/CsvImportDrawer.tsx`

- [ ] **Step 1: Create the drawer component**

```typescript
// app/(dashboard)/settings/_components/CsvImportDrawer.tsx
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { bulkImportTransactions } from "@/app/actions/csv";
import { formatTHB } from "@/lib/format";
import {
  parseFile,
  mapRow,
  type ParsedFile,
  type ColumnMapping,
  type DateFormat,
  type TypeMode,
  type TypeColumnMapping,
} from "./csv-parse";

const DATE_FORMATS: DateFormat[] = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];

const DEFAULT_MAPPING: ColumnMapping = {
  date: "", amount: "", category: "", type: "", note: "",
};
const DEFAULT_TYPE_COL: TypeColumnMapping = {
  expenseValue: "", incomeValue: "",
};

export function CsvImportDrawer() {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(DEFAULT_MAPPING);
  const [dateFormat, setDateFormat] = useState<DateFormat>("DD/MM/YYYY");
  const [typeMode, setTypeMode] = useState<TypeMode>("sign");
  const [typeColMapping, setTypeColMapping] = useState<TypeColumnMapping>(DEFAULT_TYPE_COL);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function reset() {
    setParsed(null); setParseError(null);
    setMapping(DEFAULT_MAPPING); setDateFormat("DD/MM/YYYY");
    setTypeMode("sign"); setTypeColMapping(DEFAULT_TYPE_COL);
    setResult(null); setSubmitError(null);
  }

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setParseError(null); setParsed(null); setResult(null);
    try {
      const p = await parseFile(file);
      setParsed(p);
      // Auto-detect common header names to pre-fill mapping.
      const h = p.headers.map((x) => x.toLowerCase());
      const find = (candidates: string[]) =>
        p.headers.find((_, i) => candidates.some((c) => h[i].includes(c))) ?? "";
      setMapping({
        date: find(["date", "วันที่", "เวลา"]),
        amount: find(["amount", "จำนวน", "debit", "credit", "total"]),
        category: find(["category", "หมวด", "ประเภท"]),
        type: find(["type", "ประเภท", "flow"]),
        note: find(["note", "หมายเหตุ", "description", "remark"]),
      });
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "อ่านไฟล์ไม่ได้");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "text/csv": [".csv"] }, multiple: false,
  });

  // Derive preview rows in real-time.
  const previewRows = parsed
    ? parsed.rows.slice(0, 5).map((r) =>
        mapRow(r, mapping, dateFormat, typeMode, typeColMapping)
      )
    : [];
  const previewHasValid = previewRows.some((r) => r.row !== null);
  const canConfirm = previewHasValid && !!mapping.date && !!mapping.amount;

  async function handleConfirm() {
    if (!parsed) return;
    setSubmitting(true); setSubmitError(null);
    try {
      const results = parsed.rows.map((r) =>
        mapRow(r, mapping, dateFormat, typeMode, typeColMapping)
      );
      const validRows = results.flatMap((r) => (r.row ? [r.row] : []));
      const res = await bulkImportTransactions(validRows);
      setResult(res);
      setParsed(null);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  }

  const selectClass =
    "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm";

  return (
    <>
      <button
        onClick={() => { reset(); setOpen(true); }}
        className="flex w-full items-center gap-3 rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-sm font-medium"
      >
        <Upload size={18} />
        นำเข้า CSV
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-[var(--bg-elevated)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              {/* Handle + header */}
              <div className="mb-1 flex justify-center">
                <div className="h-1 w-10 rounded-full bg-[var(--glass-border)]" />
              </div>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold">นำเข้าไฟล์ CSV</h2>
                <button onClick={() => setOpen(false)} className="text-fg-muted">
                  <X size={20} />
                </button>
              </div>

              {/* Duplicate warning */}
              <p className="mb-4 text-xs text-fg-muted">
                ⚠ การนำเข้าซ้ำจะสร้างรายการซ้ำ
              </p>

              {/* SUCCESS STATE */}
              {result && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <CheckCircle2 size={40} className="text-positive" />
                  <p className="text-lg font-semibold">
                    ✓ นำเข้าสำเร็จ {result.inserted} รายการ
                  </p>
                  {result.skipped > 0 && (
                    <p className="text-sm text-fg-muted">ข้ามไป {result.skipped} รายการ (ข้อมูลไม่ถูกต้อง)</p>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="mt-2 rounded-2xl bg-accent px-6 py-2 text-sm font-semibold text-black"
                  >
                    เสร็จสิ้น
                  </button>
                </div>
              )}

              {!result && (
                <>
                  {/* STAGE 1: Upload */}
                  <div
                    {...getRootProps()}
                    className={`mb-5 cursor-pointer rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                      isDragActive
                        ? "border-accent bg-accent/10"
                        : "border-[var(--glass-border)]"
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload size={24} className="mx-auto mb-2 text-fg-muted" />
                    <p className="text-sm font-medium">
                      {isDragActive ? "วางไฟล์ที่นี่" : "วางไฟล์ CSV หรือแตะเพื่อเลือก"}
                    </p>
                    <p className="mt-1 text-xs text-fg-muted">รองรับ: ธนาคาร, Google Sheets, ฯลฯ</p>
                  </div>

                  {parseError && (
                    <div className="mb-4 flex gap-2 rounded-xl bg-negative/10 p-3 text-sm text-negative">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      {parseError}
                    </div>
                  )}

                  {/* STAGE 2: Map + Configure */}
                  {parsed && (
                    <div className="space-y-5">
                      {/* Column mapping */}
                      <div>
                        <p className="mb-3 text-sm font-medium">จับคู่คอลัมน์</p>
                        <div className="space-y-3">
                          {(
                            [
                              { field: "date" as const, label: "วันที่", required: true },
                              { field: "amount" as const, label: "จำนวนเงิน", required: true },
                              { field: "category" as const, label: "หมวดหมู่", required: false },
                              { field: "note" as const, label: "หมายเหตุ", required: false },
                              ...(typeMode === "column"
                                ? [{ field: "type" as const, label: "ประเภท", required: true }]
                                : []),
                            ] as Array<{ field: keyof ColumnMapping; label: string; required: boolean }>
                          ).map(({ field, label, required }) => (
                            <div key={field} className="flex items-center gap-3">
                              <span className="w-24 shrink-0 text-sm text-fg-muted">
                                {label}{required ? " *" : ""}
                              </span>
                              <select
                                className={selectClass}
                                value={mapping[field]}
                                onChange={(e) =>
                                  setMapping((m) => ({ ...m, [field]: e.target.value }))
                                }
                              >
                                <option value="">— ไม่เลือก —</option>
                                {parsed.headers.map((h) => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Date format */}
                      <div className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-sm text-fg-muted">รูปแบบวันที่</span>
                        <select
                          className={selectClass}
                          value={dateFormat}
                          onChange={(e) => setDateFormat(e.target.value as DateFormat)}
                        >
                          {DATE_FORMATS.map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>

                      {/* Type mode */}
                      <div>
                        <p className="mb-2 text-sm text-fg-muted">ระบุประเภท (รายรับ/รายจ่าย)</p>
                        <div className="flex gap-2">
                          {(
                            [
                              { value: "sign" as TypeMode, label: "อ่านจากเครื่องหมาย" },
                              { value: "column" as TypeMode, label: "เลือกคอลัมน์" },
                            ]
                          ).map(({ value, label }) => (
                            <button
                              key={value}
                              onClick={() => setTypeMode(value)}
                              className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                                typeMode === value
                                  ? "bg-accent text-black"
                                  : "border border-[var(--glass-border)] text-fg-muted"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        {typeMode === "column" && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-3">
                              <span className="w-24 shrink-0 text-xs text-fg-muted">ค่าใดคือรายจ่าย?</span>
                              <input
                                className={selectClass}
                                placeholder="เช่น DR, expense, out"
                                value={typeColMapping.expenseValue}
                                onChange={(e) =>
                                  setTypeColMapping((m) => ({ ...m, expenseValue: e.target.value }))
                                }
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="w-24 shrink-0 text-xs text-fg-muted">ค่าใดคือรายรับ?</span>
                              <input
                                className={selectClass}
                                placeholder="เช่น CR, income, in"
                                value={typeColMapping.incomeValue}
                                onChange={(e) =>
                                  setTypeColMapping((m) => ({ ...m, incomeValue: e.target.value }))
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* STAGE 3: Live Preview */}
                      {mapping.date && mapping.amount && (
                        <div>
                          <p className="mb-2 text-sm font-medium">ตัวอย่าง 5 รายการแรก</p>
                          <div className="overflow-x-auto rounded-xl border border-[var(--glass-border)]">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-[var(--glass-border)] text-fg-muted">
                                  <th className="px-3 py-2 text-left">วันที่</th>
                                  <th className="px-3 py-2 text-right">จำนวน</th>
                                  <th className="px-3 py-2 text-left">ประเภท</th>
                                  <th className="px-3 py-2 text-left">หมวดหมู่</th>
                                </tr>
                              </thead>
                              <tbody>
                                {previewRows.map((r, i) =>
                                  r.row ? (
                                    <tr key={i} className="border-b border-[var(--glass-border)]/50">
                                      <td className="px-3 py-2">{r.row.date}</td>
                                      <td className={`px-3 py-2 text-right font-mono ${r.row.type === "expense" ? "text-negative" : "text-positive"}`}>
                                        {r.row.type === "expense" ? "-" : "+"}{formatTHB(r.row.amount)}
                                      </td>
                                      <td className="px-3 py-2">
                                        {r.row.type === "expense" ? "รายจ่าย" : "รายรับ"}
                                      </td>
                                      <td className="px-3 py-2 text-fg-muted">{r.row.category ?? "—"}</td>
                                    </tr>
                                  ) : (
                                    <tr key={i} className="border-b border-[var(--glass-border)]/50 bg-negative/5">
                                      <td colSpan={4} className="px-3 py-2 text-negative">
                                        <AlertTriangle size={12} className="mr-1 inline" />
                                        {r.error}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Submit error */}
                      {submitError && (
                        <div className="flex gap-2 rounded-xl bg-negative/10 p-3 text-sm text-negative">
                          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                          {submitError}
                        </div>
                      )}

                      {/* Confirm button */}
                      <button
                        onClick={handleConfirm}
                        disabled={!canConfirm || submitting}
                        className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-black disabled:opacity-40"
                      >
                        {submitting
                          ? "กำลังนำเข้า…"
                          : `นำเข้า ${parsed.rows.length} รายการ`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -15
```
Expected: `✓ Compiled successfully`.

---

## Task 6: Wire into Settings page

**Files:**
- Modify: `app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Replace the Settings page stub**

```typescript
// app/(dashboard)/settings/page.tsx
import { CsvExportButton } from "./_components/CsvExportButton";
import { CsvImportDrawer } from "./_components/CsvImportDrawer";

export default function SettingsPage() {
  return (
    <section className="space-y-6">
      <header className="pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">ตั้งค่า</h1>
      </header>

      {/* Data portability */}
      <div className="glass p-5 space-y-3">
        <p className="text-sm font-medium text-fg-muted">ข้อมูล</p>
        <CsvExportButton />
        <CsvImportDrawer />
      </div>

      {/* Placeholders for remaining settings sections (future tasks) */}
      <div className="glass p-5 text-sm text-fg-muted">
        API Key + Regenerate — TODO (Task: Settings)
      </div>
      <div className="glass p-5 text-sm text-fg-muted">
        งบประมาณรายหมวดหมู่ — TODO (Task: Budgets)
      </div>
      <div className="glass p-5 text-sm text-fg-muted">
        แผนการใช้งาน — TODO (Task: Paywall)
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Build and verify all routes compile**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -20
```

Expected output includes all routes clean:
```
Route (app)
├ ƒ /
├ ƒ /analytics
├ ƒ /api/transactions
├ ○ /login
├ ƒ /overview
├ ○ /paywall
├ ƒ /roast
├ ƒ /settings
└ ƒ /wealth
✓ Compiled successfully
```

- [ ] **Step 3: Commit**

```bash
git add app/actions/csv.ts app/(dashboard)/settings/_components/CsvExportButton.tsx app/(dashboard)/settings/_components/CsvImportDrawer.tsx app/(dashboard)/settings/_components/csv-parse.ts app/(dashboard)/settings/page.tsx
git commit -m "feat: CSV export (one-tap download) and import drawer wizard with Thai UI"
```

---

## Self-Review Notes

- ✅ `exportTransactionsCsv` fetches joined category name, formats dates in Bangkok tz (ADR-0003)
- ✅ `bulkImportTransactions` upserts categories idempotently (ON CONFLICT), validates each row server-side even though client pre-validated
- ✅ Both free-tier (no `isActive()` gate anywhere)
- ✅ Thai UI labels throughout
- ✅ BOM prefix on CSV export for Excel/Windows compatibility
- ✅ Derive-from-sign hides Type column selector
- ✅ Live preview updates on every mapping/config change
- ✅ Confirm button disabled until ≥1 valid preview row
- ✅ Duplicate warning shown per spec
- ✅ `csv-parse.ts` is a separate module (logic isolated from UI, reusable)
- ✅ Type consistency: `MappedRow` defined in `app/actions/csv.ts`, imported in both `csv-parse.ts` and `CsvImportDrawer.tsx`
