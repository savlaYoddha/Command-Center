declare module "archiver" {
  import type { Transform } from "node:stream";

  export interface ArchiverEntryData {
    name?: string;
    prefix?: string;
    date?: Date | string;
    mode?: number;
  }

  export interface ArchiverOptions {
    statConcurrency?: number;
    zlib?: { level?: number };
  }

  export class Archiver extends Transform {
    file(filename: string, data?: ArchiverEntryData): this;
    append(source: Buffer | string | NodeJS.ReadableStream, data?: ArchiverEntryData): this;
    on(event: "error" | "warning", listener: (error: { code: string; message: string }) => void): this;
    on(event: string, listener: (...args: never[]) => void): this;
    pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T;
    finalize(): Promise<void>;
  }
}