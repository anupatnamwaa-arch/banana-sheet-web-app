# CSV Import/Export — Design Spec

## Summary

Both CSV export and import are **free-tier** features available to all authenticated users. Export is a one-tap download. Import is a bottom-drawer wizard with inline column mapping, live preview, and bulk insert.

---

## Architecture

### Server actions — `app/actions/csv.ts`

**`exportTransactionsCsv()`**
- Authenticated server action (reads `auth.uid()` via the server Supabase client).
- Fetches all user transactions joined to category name (`categories.name`).
- Serializes to a standard CSV string: `date,amount,type,category,note`.
- Returns the CSV string to the client for browser-side Blob download.
- Dates formatted in Asia/Bangkok timezone (ADR-0003).

**`bulkImportTransactions(rows: MappedRow[])`**
- Authenticated server action.
- Each `MappedRow`: `{ date: string, amount: number, type: 'income'|'expense', category?: string, note?: string }`.
- For each unique category name: upsert against `categories` table (same auto-create logic as the ingestion API — `INSERT ... ON CONFLICT (user_id, name) DO NOTHING` then select).
- Bulk-inserts into `transactions` via a single `insert` call.
- Returns `{ inserted: number, skipped: number }`.

### Client components

**`CsvExportButton`** (`app/(dashboard)/settings/_components/CsvExportButton.tsx`)
- `'use client'` button that calls `exportTransactionsCsv()`, wraps the result in a `Blob`, and triggers `<a download>` click programmatically.
- Label: "ส่งออก CSV".

**`CsvImportDrawer`** (`app/(dashboard)/settings/_components/CsvImportDrawer.tsx`)
- `'use client'` bottom sheet/drawer, triggered from Settings.
- Manages all wizard state locally (no URL navigation).
- Papaparse runs entirely in the browser — raw rows never leave the client until the final mapped payload is sent to `bulkImportTransactions`.

---

## Import Drawer — 3 Inline Stages

The drawer slides up from the bottom (Framer Motion). A single scrollable panel; stages appear progressively as the user completes each one.

### Stage 1 — Upload

- Title: **"นำเข้าไฟล์ CSV"**
- `react-dropzone` area accepts `.csv` files.
- On drop: Papaparse parses with `header: true` and **stores the raw results in state** (full file, all rows). The first 20 rows are used for live preview rendering; all rows are sent on confirm.
- Advances automatically to Stage 2 on successful parse.
- Error state if no headers detected or file is not valid CSV.

### Stage 2 — Map + Configure

Appears inline below the drop zone. Sections:

**Column mapping** — for each target field, a `<select>` of detected CSV headers:
| Thai label | Field | Required |
|---|---|---|
| วันที่ | date | ✅ |
| จำนวนเงิน | amount | ✅ |
| หมวดหมู่ | category | optional |
| ประเภท | type | conditional |
| หมายเหตุ | note | optional |

**Date format picker** — defaults to `DD/MM/YYYY`; options: `MM/DD/YYYY`, `YYYY-MM-DD`.

**Type mode toggle** — two options:
- **"อ่านจากเครื่องหมาย"** (derive from sign) — default. Negative amount → expense; positive → income. Amount stored as absolute value.
- **"เลือกคอลัมน์"** (map a column) — shows the Type column selector plus two value-mapping inputs: "ค่าใดคือรายจ่าย?" and "ค่าใดคือรายรับ?".

When type mode is "derive from sign", the Type field in column mapping is hidden.

### Stage 3 — Live Preview

Updates in real-time as user changes any mapping or config. Shows the first **5 rows** parsed with current settings in a compact table:

`วันที่ | จำนวน (฿) | ประเภท | หมวดหมู่ | หมายเหตุ`

- Rows that fail to parse (bad date, non-numeric amount) show a red ⚠ inline with the reason in Thai.
- Confirm button disabled until at least 1 row previews without errors.

### Confirm

Button label: **"นำเข้า X รายการ"** (X = total valid rows in full file).
- Calls `bulkImportTransactions` with all valid mapped rows (full file parse happens client-side on confirm, not preview).
- Loading state on button.
- On success: toast **"✓ นำเข้าสำเร็จ X รายการ"**, drawer closes.
- On error: inline error message in Thai, drawer stays open.

---

## Settings Page Integration

`app/(dashboard)/settings/page.tsx` renders:
- `<CsvExportButton />` — always visible, free.
- `<CsvImportDrawer />` trigger button **"นำเข้า CSV"** — always visible, free.

---

## Data Constraints

- `amount` must be `>= 0` after sign-stripping; rows with non-numeric or negative-after-absolute values are skipped (counted in `skipped`).
- Dates parsed client-side using the chosen format; invalid dates are skipped.
- Category auto-create is case-insensitive match on `name` (same as ingestion API).
- No deduplication — importing the same file twice creates duplicate transactions. User is warned in the UI: "การนำเข้าซ้ำจะสร้างรายการซ้ำ".
