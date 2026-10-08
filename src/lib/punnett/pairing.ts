/** Application domain values. Database columns must be mapped after schema verification. */
export type CaptionCandidate = Readonly<{ id: string; imageId: string; text: string }>;

export type CaptionPair = Readonly<{
  imageId: string;
  left: CaptionCandidate;
  right: CaptionCandidate;
}>;

function randomIndex(length: number, random: () => number): number {
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new RangeError("Random samples must be finite numbers in [0, 1).");
  }
  return Math.floor(sample * length);
}

/** Choose one eligible image uniformly, then two of its unjudged captions. */
export function selectPair(
  candidates: readonly CaptionCandidate[],
  votedIds: ReadonlySet<string>,
  random: () => number = Math.random,
): CaptionPair | null {
  const seen = new Set<string>();
  const groups = new Map<string, CaptionCandidate[]>();
  for (const candidate of candidates) {
    if (!candidate.id.trim() || !candidate.imageId.trim() || !candidate.text.trim() ||
        seen.has(candidate.id) || votedIds.has(candidate.id)) continue;
    // First valid occurrence wins, so repeated ids cannot count toward another dish.
    seen.add(candidate.id);
    const group = groups.get(candidate.imageId);
    if (group) group.push(candidate);
    else groups.set(candidate.imageId, [candidate]);
  }
  const eligible = [...groups.entries()].filter(([, group]) => group.length >= 2);
  if (!eligible.length) return null;
  const [imageId, group] = eligible[randomIndex(eligible.length, random)];
  const leftIndex = randomIndex(group.length, random);
  // Sample from the remaining positions without shuffling or mutating the input.
  const remainingIndex = randomIndex(group.length - 1, random);
  const rightIndex = remainingIndex >= leftIndex ? remainingIndex + 1 : remainingIndex;
  return { imageId, left: group[leftIndex], right: group[rightIndex] };
}
