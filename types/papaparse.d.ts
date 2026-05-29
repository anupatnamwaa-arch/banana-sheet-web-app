declare module "papaparse" {
  export interface ParseConfig {
    header?: boolean;
    skipEmptyLines?: boolean;
    complete?: (results: ParseResult<Record<string, string>>) => void;
    error?: (error: { message: string }) => void;
  }

  export interface ParseResult<T> {
    data: T[];
    meta: {
      fields?: string[];
    };
  }

  function parse<T>(
    file: File | string,
    config: ParseConfig
  ): void;

  export default { parse };
}
