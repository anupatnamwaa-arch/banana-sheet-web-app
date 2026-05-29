// Currency + time helpers. THB only; all bucketing in Asia/Bangkok (ADR-0003).

export const APP_TIMEZONE = "Asia/Bangkok";

const thb = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

/** Format a THB amount, e.g. ฿1,234. */
export function formatTHB(amount: number): string {
  return thb.format(amount);
}

/**
 * The calendar day (YYYY-MM-DD) a UTC timestamp falls on in Asia/Bangkok.
 * Use this for all day/month bucketing — never bucket by raw UTC.
 */
export function bangkokDateKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  // en-CA gives ISO-like YYYY-MM-DD output.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** The month bucket (YYYY-MM) a UTC timestamp falls in, in Asia/Bangkok. */
export function bangkokMonthKey(iso: string | Date): string {
  return bangkokDateKey(iso).slice(0, 7);
}
