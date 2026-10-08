import "server-only";
import { createClient } from "./server";
import { selectPair, type CaptionCandidate } from "@/lib/punnett/pairing";
import { PAGE_SIZE, parseCaptionPage, parseVotedPage, type Page } from "@/lib/punnett/rating";

export async function loadPair(userId: string | null, preferredImageId?: string, previousImageId?: string) {
  const client = await createClient();
  async function allPages<T>(rpc: "punnett_caption_page" | "punnett_voted_ids", parse: (data: unknown) => Page<T>) {
    const rows: T[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const result = await client.rpc(rpc, { offset_input: offset });
      if (result.error) throw new Error("Rating data could not be loaded.");
      const page = parse(result.data);
      rows.push(...page.rows);
      if (!page.hasMore) return rows;
    }
  }
  const [captions, voted] = await Promise.all([
    allPages<CaptionCandidate>("punnett_caption_page", parseCaptionPage),
    userId ? allPages<string>("punnett_voted_ids", parseVotedPage) : Promise.resolve([]),
  ]);
  const votedIds = new Set(voted);
  if (preferredImageId) {
    const preferred = selectPair(captions.filter((caption) => caption.imageId === preferredImageId), votedIds);
    if (preferred) return preferred;
  }
  if (previousImageId) {
    const another = selectPair(captions.filter((caption) => caption.imageId !== previousImageId), votedIds);
    if (another) return another;
  }
  return selectPair(captions, votedIds);
}
