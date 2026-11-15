// Stub minimal agar lib/auth.ts bisa diimpor di luar runtime Next (node --test).
export const cookies = () => ({
  get: () => undefined,
  set: () => {},
  delete: () => {},
});

export function redirect(url: string): never {
  throw new Error(`redirect:${url}`);
}
