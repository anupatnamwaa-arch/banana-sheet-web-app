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
