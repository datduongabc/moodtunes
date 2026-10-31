/** Mood Guess rules (AC-11.1.3). Scores are computed on the server; these mirror them for display and tests. */
export const QUESTIONS_PER_ROUND = 10;
export const CLIP_SECONDS = 15;
export const ANSWER_SECONDS = 20;
export const ANSWER_SECONDS_EXTENDED = 40;

export const pointsFor = (streak: number): number => (streak > 0 ? 100 + 20 * (streak - 1) : 0);

export const maxRoundScore = (): number => {
  let total = 0;
  for (let k = 1; k <= QUESTIONS_PER_ROUND; k++) total += pointsFor(k);
  return total;
};

export const answerSeconds = (extended: boolean) => (extended ? ANSWER_SECONDS_EXTENDED : ANSWER_SECONDS);
