/** An explicitly labelled text card for a real database specimen, never a stock animal photo. */
export function specimenFactCard(source: {label:string; notes:string}): string {
  const escape = (text:string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  const lines: string[] = [];
  let line = "";
  for (const word of source.label.split(/\s+/)) {
    if (line.length + word.length > 32) { lines.push(line); line = ""; }
    line += `${line ? " " : ""}${word}`;
  }
  if (line) lines.push(line);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" rx="24" fill="#070D12"/><rect x="28" y="28" width="744" height="544" rx="18" fill="#0E1719" stroke="#5DCAA5"/><text x="65" y="110" fill="#9FE1CB" font-family="sans-serif" font-size="18" letter-spacing="3">SPECIMEN FACT CARD</text>${lines.slice(0,7).map((text,i)=>`<text x="65" y="${190+i*42}" fill="#D8F3EA" font-family="sans-serif" font-size="32">${escape(text)}</text>`).join("")}<text x="65" y="505" fill="#9FE1CB" font-family="sans-serif" font-size="19">Real flora, fauna, and fungi. Questionable behavior.</text><text x="65" y="538" fill="#9FE1CB" font-family="sans-serif" font-size="16">Not a photograph · Facts from the saved public lab record</text></svg>`;
}
