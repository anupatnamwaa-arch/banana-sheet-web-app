import { th, type Dictionary } from "./dictionaries/th";
import { en } from "./dictionaries/en";

export type Locale = "th" | "en";
export type { Dictionary };

const dicts: Record<Locale, Dictionary> = { th, en };

export function getDictionary(locale: Locale): Dictionary {
  return dicts[locale];
}

/** Replace {key} placeholders in a template string. */
export function format(
  template: string,
  params: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}
