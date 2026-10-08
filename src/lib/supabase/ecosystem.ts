import "server-only";
import { createClient } from "./server";
import { PAGE_SIZE, parseVotedPage, type Page } from "@/lib/punnett/rating";
import { parseEcosystemPage, ecosystemStats, selectSurvivor, type EcosystemSpecimen, type EcosystemState } from "@/lib/punnett/ecosystem";

export async function loadEcosystem(userId: string | null, previousLabel?: string, previousId?: string): Promise<EcosystemState> {
  const client = await createClient();
  async function pages<T>(rpc: string, parse: (value: unknown) => Page<T>): Promise<T[]> {
    const rows: T[] = [];
    for (let offset = 0; offset <= 1000000; offset += PAGE_SIZE) {
      const result = await client.rpc(rpc, { offset_input: offset });
      if (result.error) throw new Error("The ecosystem could not be loaded.");
      const page = parse(result.data);
      rows.push(...page.rows);
      if (!page.hasMore) return rows;
    }
    throw new Error("The ecosystem exceeds the supported pagination window.");
  }
  const [rows, voted] = await Promise.all([
    pages<EcosystemSpecimen>("punnett_ecosystem_page", parseEcosystemPage),
    userId ? pages<string>("punnett_voted_ids", parseVotedPage) : Promise.resolve([]),
  ]);
  const judged = new Set(voted);
  return { specimen: selectSurvivor(rows, judged, previousLabel, previousId), stats: ecosystemStats(rows, judged) };
}
