export type Flash = { msg?: string; err?: string };

export function flash(searchParams: Record<string, string | string[] | undefined>): Flash {
  const pick = (k: string) => {
    const v = searchParams[k];
    return typeof v === "string" ? v : undefined;
  };
  return { msg: pick("msg"), err: pick("err") };
}
