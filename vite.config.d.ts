declare module "node:fs/promises" {
  export function cp(source: string, destination: string, options?: { recursive?: boolean }): Promise<void>;
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
}

declare module "node:path" {
  export function resolve(...paths: string[]): string;
}
