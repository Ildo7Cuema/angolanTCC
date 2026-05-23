/** Tipos mínimos para o editor quando o Deno LSP não está activo. */
declare const Deno: {
  serve(handler: (req: Request) => Response | Promise<Response>): void;
  env: { get(key: string): string | undefined };
};
