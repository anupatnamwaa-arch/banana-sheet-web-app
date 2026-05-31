declare module "papaparse" {
  export interface ParseConfig<T = Record<string, string>> {
    header?: boolean;
    skipEmptyLines?: boolean;
    complete?: (results: ParseResult<T>) => void;
    error?: (error: { message: string }) => void;
  }

  export interface ParseResult<T> {
    data: T[];
    meta: {
      fields?: string[];
    };
  }

  interface PapaStatic {
    parse<T>(file: File | string, config: ParseConfig<T>): void;
  }

  const Papa: PapaStatic;
  export default Papa;
}
