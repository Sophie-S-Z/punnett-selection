export function specimenCode(id: string | number): string {
  let h = 2166136261;
  for (const ch of String(id)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  h >>>= 0;
  const bases = "ACGT";
  let letters = "";
  for (let i = 0; i < 4; i++) letters += bases[(h >>> (i * 2)) & 3];
  return `${letters}-${String((h >>> 8) % 10000).padStart(4, "0")}`;
}
