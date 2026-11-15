export type RankMovement =
  { kind: 'new'; label: string } | { kind: 'same'; label: string } | { kind: 'up' | 'down'; by: number; label: string };

/** Movement of a chart row against the previous snapshot of the same mood and period (FR-13). */
export function rankMovement(rank: number, previousRank: number | null): RankMovement {
  if (previousRank === null) return { kind: 'new', label: 'New' };
  if (previousRank === rank) return { kind: 'same', label: 'Unchanged' };
  const by = Math.abs(previousRank - rank);
  return previousRank > rank ? { kind: 'up', by, label: `Up ${by}` } : { kind: 'down', by, label: `Down ${by}` };
}
