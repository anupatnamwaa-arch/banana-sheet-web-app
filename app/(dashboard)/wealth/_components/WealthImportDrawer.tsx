"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { bulkImportWealth, type WealthImportRow } from "@/app/actions/wealth-csv";
import { parseFile } from "@/app/(dashboard)/settings/_components/csv-parse";
import type { ParsedFile } from "@/app/(dashboard)/settings/_components/csv-parse";
import { useT } from "@/lib/i18n/LanguageProvider";

interface WealthColumnMapping {
  name: string;
  type: string;
  value: string;
  is_liquid: string;
  monthly_payment: string;
  due_date: string;
}

const DEFAULT_MAPPING: WealthColumnMapping = {
  name: "", type: "", value: "", is_liquid: "", monthly_payment: "", due_date: "",
};

// FIELD_LABELS are built inside the component using t

function mapWealthRow(
  raw: Record<string, string>,
  mapping: WealthColumnMapping,
  errors: { noName: string; badType: string; badValue: string }
): { row: WealthImportRow | null; error: string | null } {
  const name = raw[mapping.name]?.trim() ?? "";
  if (!name) return { row: null, error: errors.noName };

  const rawType = (raw[mapping.type]?.trim() ?? "").toLowerCase();
  const type =
    rawType === "asset" || rawType === "สินทรัพย์"
      ? "asset"
      : rawType === "liability" || rawType === "หนี้สิน"
      ? "liability"
      : null;
  if (!type) return { row: null, error: errors.badType.replace("{val}", rawType) };

  const rawValue = raw[mapping.value]?.trim() ?? "";
  const value = parseFloat(rawValue.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(value) || value < 0) return { row: null, error: errors.badValue.replace("{val}", rawValue) };

  const rawLiquid = raw[mapping.is_liquid]?.trim().toLowerCase() ?? "";
  const is_liquid = rawLiquid === "" ? type === "asset" : rawLiquid === "true" || rawLiquid === "1" || rawLiquid === "yes";

  const rawPayment = mapping.monthly_payment ? raw[mapping.monthly_payment]?.trim() ?? "" : "";
  const monthly_payment = rawPayment ? parseFloat(rawPayment.replace(/[^0-9.]/g, "")) || null : null;

  const rawDue = mapping.due_date ? raw[mapping.due_date]?.trim() ?? "" : "";
  const due_date = rawDue && /^\d{4}-\d{2}-\d{2}$/.test(rawDue) ? rawDue : null;

  return { row: { name, type, value, is_liquid, monthly_payment, due_date }, error: null };
}

interface Props {
  onSuccess: () => void;
}

export function WealthImportDrawer({ onSuccess }: Props) {
  const t = useT();

  const rowErrors = {
    noName: t.wealth.rowErrorNoName,
    badType: t.wealth.rowErrorBadType,
    badValue: t.wealth.rowErrorBadValue,
  };

  const FIELD_LABELS: { field: keyof WealthColumnMapping; label: string; required: boolean }[] = [
    { field: "name", label: t.wealth.fieldName, required: true },
    { field: "type", label: t.wealth.fieldType, required: true },
    { field: "value", label: t.wealth.fieldValue, required: true },
    { field: "is_liquid", label: t.wealth.fieldIsLiquid, required: false },
    { field: "monthly_payment", label: t.wealth.fieldMonthlyPayment, required: false },
    { field: "due_date", label: t.wealth.fieldDueDate, required: false },
  ];
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<WealthColumnMapping>(DEFAULT_MAPPING);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function reset() {
    setParsed(null); setParseError(null);
    setMapping(DEFAULT_MAPPING); setResult(null); setSubmitError(null);
  }

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setParseError(null); setParsed(null); setResult(null);
    try {
      const p = await parseFile(file);
      setParsed(p);
      // Auto-detect common column names.
      const h = p.headers.map((x) => x.toLowerCase());
      const find = (candidates: string[]) =>
        p.headers.find((_, i) => candidates.some((c) => h[i].includes(c))) ?? "";
      setMapping({
        name: find(["name", "ชื่อ", "item", "asset"]),
        type: find(["type", "ประเภท", "category", "kind"]),
        value: find(["value", "amount", "มูลค่า", "จำนวน", "balance"]),
        is_liquid: find(["liquid", "สภาพคล่อง"]),
        monthly_payment: find(["payment", "monthly", "ผ่อน"]),
        due_date: find(["due", "date", "ครบกำหนด"]),
      });
    } catch (e) {
      setParseError(e instanceof Error ? e.message : t.wealth.fileReadError);
    }
  }, [t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
    multiple: false,
  });

  const previewRows = parsed
    ? parsed.rows.slice(0, 5).map((r) => mapWealthRow(r, mapping, rowErrors))
    : [];
  const canConfirm = !!mapping.name && !!mapping.type && !!mapping.value && parsed !== null;
  const validCount = parsed
    ? parsed.rows.filter((r) => mapWealthRow(r, mapping, rowErrors).row !== null).length
    : 0;

  async function handleConfirm() {
    if (!parsed) return;
    setSubmitting(true); setSubmitError(null);
    try {
      const validRows = parsed.rows.flatMap((r) => {
        const { row } = mapWealthRow(r, mapping, rowErrors);
        return row ? [row] : [];
      });
      const res = await bulkImportWealth(validRows);
      setResult(res);
      setParsed(null);
      onSuccess();
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
        className="flex items-center gap-2 rounded-full border border-[var(--glass-border)] px-4 py-1.5 text-xs font-medium text-fg-muted"
      >
        <Upload size={13} />
        {t.wealth.importCsvButton}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (!submitting) setOpen(false); }}
            />
            <motion.div
              key="sheet"
              className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] space-y-4 overflow-y-auto rounded-t-3xl bg-[var(--bg-elevated)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex justify-center">
                <div className="h-1 w-10 rounded-full bg-[var(--glass-border)]" />
              </div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {t.wealth.importTitle}
                </h2>
                <button onClick={() => { if (!submitting) setOpen(false); }} disabled={submitting}>
                  <X size={20} className="text-fg-muted" />
                </button>
              </div>

              {/* Template hint */}
              <div className="rounded-xl bg-[var(--glass-bg)] p-3 text-xs text-fg-muted">
                <p className="mb-1 font-medium text-fg">{t.wealth.importFileFormat}</p>
                <p>{t.wealth.importRequiredCols} <span className="text-accent">name, type, value</span></p>
                <p>{t.wealth.importOptionalCols}</p>
                <p className="mt-1">{t.wealth.importTypeHint} <code>asset</code> {t.wealth.importOrLabel} <code>liability</code></p>
              </div>

              {result ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <CheckCircle2 size={40} className="text-positive" />
                  <p className="text-lg font-semibold">{t.wealth.importSuccess.replace("{count}", String(result.inserted))}</p>
                  {result.skipped > 0 && (
                    <p className="text-sm text-fg-muted">{t.wealth.importSkipped.replace("{count}", String(result.skipped))}</p>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="mt-2 rounded-2xl bg-accent px-6 py-2 text-sm font-semibold text-black"
                  >
                    {t.wealth.importDone}
                  </button>
                </div>
              ) : (
                <>
                  {/* Drop zone */}
                  <div
                    {...getRootProps()}
                    className={`cursor-pointer rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                      isDragActive ? "border-accent bg-accent/10" : "border-[var(--glass-border)]"
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload size={24} className="mx-auto mb-2 text-fg-muted" />
                    <p className="text-sm font-medium">
                      {isDragActive ? t.wealth.dropHere : t.wealth.dropOrTap}
                    </p>
                  </div>

                  {parseError && (
                    <div className="flex gap-2 rounded-xl bg-negative/10 p-3 text-sm text-negative">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      {parseError}
                    </div>
                  )}

                  {parsed && (
                    <div className="space-y-4">
                      {/* Column mapping */}
                      <p className="text-sm font-medium">{t.wealth.mapColumns}</p>
                      <div className="space-y-3">
                        {FIELD_LABELS.map(({ field, label, required }) => (
                          <div key={field} className="flex items-center gap-3">
                            <span className="w-36 shrink-0 text-xs text-fg-muted">
                              {label}{required ? " *" : ""}
                            </span>
                            <select
                              className={selectClass}
                              value={mapping[field]}
                              onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                            >
                              <option value="">{t.wealth.noSelect}</option>
                              {parsed.headers.map((h) => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>

                      {/* Preview table */}
                      {mapping.name && mapping.type && mapping.value && (
                        <div>
                          <p className="mb-2 text-sm font-medium">{t.wealth.previewRows}</p>
                          <div className="overflow-x-auto rounded-xl border border-[var(--glass-border)]">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-[var(--glass-border)] text-fg-muted">
                                  <th className="px-3 py-2 text-left">{t.wealth.previewColName}</th>
                                  <th className="px-3 py-2 text-left">{t.wealth.previewColType}</th>
                                  <th className="px-3 py-2 text-right">{t.wealth.previewColValue}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {previewRows.map((r, i) =>
                                  r.row ? (
                                    <tr key={i} className="border-b border-[var(--glass-border)]/50">
                                      <td className="px-3 py-2">{r.row.name}</td>
                                      <td className={`px-3 py-2 ${r.row.type === "asset" ? "text-positive" : "text-negative"}`}>
                                        {r.row.type === "asset" ? t.wealth.assets : t.wealth.liabilities}
                                      </td>
                                      <td className="px-3 py-2 text-right tabular-nums">
                                        ฿{r.row.value.toLocaleString("th-TH")}
                                      </td>
                                    </tr>
                                  ) : (
                                    <tr key={i} className="border-b border-[var(--glass-border)]/50 bg-negative/5">
                                      <td colSpan={3} className="px-3 py-2 text-negative">
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

                      {submitError && (
                        <div className="flex gap-2 rounded-xl bg-negative/10 p-3 text-sm text-negative">
                          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                          {submitError}
                        </div>
                      )}

                      <button
                        onClick={handleConfirm}
                        disabled={!canConfirm || submitting}
                        className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-black disabled:opacity-40"
                      >
                        {submitting ? t.wealth.importing : t.wealth.importCount.replace("{count}", String(validCount))}
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
