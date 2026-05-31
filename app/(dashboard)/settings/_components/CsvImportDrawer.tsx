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
import { useT } from "@/lib/i18n/LanguageProvider";

const DATE_FORMATS: DateFormat[] = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];

const DEFAULT_MAPPING: ColumnMapping = {
  date: "", amount: "", category: "", type: "", note: "",
};
const DEFAULT_TYPE_COL: TypeColumnMapping = {
  expenseValue: "", incomeValue: "",
};

export function CsvImportDrawer() {
  const t = useT();
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
      setParseError(e instanceof Error ? e.message : t.settings.csvImportReadError);
    }
  }, [t]);

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
  // Count valid rows across the full file for the confirm button label.
  const validRowCount = parsed
    ? parsed.rows.filter(
        (r) => mapRow(r, mapping, dateFormat, typeMode, typeColMapping).row !== null
      ).length
    : 0;

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
      setSubmitError(e instanceof Error ? e.message : t.common.error);
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
        {t.settings.csvImportBtn}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (!submitting) setOpen(false); }}
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
                <h2 className="text-lg font-semibold">{t.settings.csvImportTitle}</h2>
                <button onClick={() => { if (!submitting) setOpen(false); }} className="text-fg-muted" disabled={submitting}>
                  <X size={20} />
                </button>
              </div>

              {/* Duplicate warning */}
              <p className="mb-4 text-xs text-fg-muted">
                {t.settings.csvImportDupeWarning}
              </p>

              {/* SUCCESS STATE */}
              {result && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <CheckCircle2 size={40} className="text-positive" />
                  <p className="text-lg font-semibold">
                    {t.settings.csvImportSuccessTemplate.replace("{count}", String(result.inserted))}
                  </p>
                  {result.skipped > 0 && (
                    <p className="text-sm text-fg-muted">
                      {t.settings.csvImportSkippedTemplate.replace("{count}", String(result.skipped))}
                    </p>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="mt-2 rounded-2xl bg-accent px-6 py-2 text-sm font-semibold text-black"
                  >
                    {t.settings.csvImportDone}
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
                      {isDragActive ? t.settings.csvImportDropActive : t.settings.csvImportDropIdle}
                    </p>
                    <p className="mt-1 text-xs text-fg-muted">
                      {t.settings.csvImportDropHint}
                    </p>
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
                        <p className="mb-3 text-sm font-medium">{t.settings.csvImportMapTitle}</p>
                        <div className="space-y-3">
                          {(
                            [
                              { field: "date" as const, label: t.settings.csvImportColDate, required: true },
                              { field: "amount" as const, label: t.settings.csvImportColAmount, required: true },
                              { field: "category" as const, label: t.settings.csvImportColCategory, required: false },
                              { field: "note" as const, label: t.settings.csvImportColNote, required: false },
                              ...(typeMode === "column"
                                ? [{ field: "type" as const, label: t.settings.csvImportColType, required: true }]
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
                                <option value="">{t.settings.csvImportNoSelect}</option>
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
                        <span className="w-24 shrink-0 text-sm text-fg-muted">{t.settings.csvImportDateFormat}</span>
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
                        <p className="mb-2 text-sm text-fg-muted">{t.settings.csvImportTypeMode}</p>
                        <div className="flex gap-2">
                          {(
                            [
                              { value: "sign" as TypeMode, label: t.settings.csvImportTypeModeSign },
                              { value: "column" as TypeMode, label: t.settings.csvImportTypeModeColumn },
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
                              <span className="w-24 shrink-0 text-xs text-fg-muted">{t.settings.csvImportExpenseValue}</span>
                              <input
                                className={selectClass}
                                placeholder="e.g. DR, expense, out"
                                value={typeColMapping.expenseValue}
                                onChange={(e) =>
                                  setTypeColMapping((m) => ({ ...m, expenseValue: e.target.value }))
                                }
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="w-24 shrink-0 text-xs text-fg-muted">{t.settings.csvImportIncomeValue}</span>
                              <input
                                className={selectClass}
                                placeholder="e.g. CR, income, in"
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
                      {mapping.date && (
                        <div>
                          <p className="mb-2 text-sm font-medium">{t.settings.csvImportPreviewTitle}</p>
                          <div className="overflow-x-auto rounded-xl border border-[var(--glass-border)]">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-[var(--glass-border)] text-fg-muted">
                                  <th className="px-3 py-2 text-left">{t.settings.csvImportPreviewDate}</th>
                                  <th className="px-3 py-2 text-right">{t.settings.csvImportPreviewAmount}</th>
                                  <th className="px-3 py-2 text-left">{t.settings.csvImportPreviewType}</th>
                                  <th className="px-3 py-2 text-left">{t.settings.csvImportPreviewCategory}</th>
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
                                        {r.row.type === "expense" ? t.settings.csvImportTypeExpense : t.settings.csvImportTypeIncome}
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
                          ? t.settings.csvImporting
                          : t.settings.csvImportConfirmTemplate.replace("{count}", String(validRowCount))}
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
