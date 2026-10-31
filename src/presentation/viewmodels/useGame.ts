import { useEffect, useRef, useState } from 'react';
import type { AppError } from '@/core/errors';
import { answerSeconds, QUESTIONS_PER_ROUND } from '@/domain/game';
import type { AnswerResult, GameRound, Mood } from '@/domain/types';
import { PlayerService } from '@/data/player/PlayerService';
import { useAnswerMutation, useGameStatsQuery, useStartRoundMutation } from '@/data/remote/api';
import { useAppSelector } from '@/store';
import { toggleTag } from '@/store/services';

type Phase = 'starting' | 'notEnough' | 'error' | 'question' | 'feedback' | 'lost' | 'result';

/** View model for SCR-14/15 (UC-10, SD-04). Answers are scored on the server only (AC-11.1.6). */
export function useGame() {
  const extended = useAppSelector((s) => s.ui.extendedAnswerTime);
  const limit = answerSeconds(extended);
  const [start] = useStartRoundMutation();
  const [sendAnswer] = useAnswerMutation();
  const stats = useGameStatsQuery();
  const [round, setRound] = useState<GameRound | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('starting');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [chosen, setChosen] = useState<Mood | null>(null);
  const [left, setLeft] = useState(limit);
  const [tagged, setTagged] = useState(false);
  const [bestBefore, setBestBefore] = useState(0);
  const pendingAnswer = useRef<Mood | null>(null);
  const question = round?.questions[index] ?? null;

  const resetQuestion = () => {
    setChosen(null);
    setTagged(false);
    setLeft(limit);
  };

  const begin = async () => {
    const res = await start();
    setBestBefore(stats.data?.bestScore ?? 0);
    if ('error' in res) {
      setPhase((res.error as AppError).code === 'NOT_ENOUGH_SONGS' ? 'notEnough' : 'error');
      return;
    }
    setRound(res.data);
    setIndex(0);
    setResult(null);
    resetQuestion();
    setPhase('question');
  };

  const answer = async (mood: Mood | null) => {
    if (!round || phase !== 'question') return;
    setChosen(mood);
    pendingAnswer.current = mood;
    PlayerService.stopClip();
    const res = await sendAnswer({ roundId: round.roundId, index, mood });
    if ('error' in res) {
      setPhase('lost');
      return;
    }
    setResult(res.data);
    setPhase('feedback');
  };
  const answerRef = useRef(answer);
  useEffect(() => {
    answerRef.current = answer;
  });

  // start a round when the screen opens
  const beginRef = useRef(begin);
  useEffect(() => {
    void beginRef.current();
    return () => PlayerService.stopClip();
  }, []);

  // clip and answer timer for each question
  const songId = question?.song.id;
  useEffect(() => {
    if (phase !== 'question' || !question) return;
    PlayerService.playClip(question.song, question.clipStartSec);
    const started = Date.now();
    const t = setInterval(() => {
      const remaining = limit - Math.floor((Date.now() - started) / 1000);
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(t);
        void answerRef.current(null); // no answer in time scores 0 (AC-11.1.3)
      }
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, songId, limit]);

  const retryLost = async () => {
    if (!round) return;
    const res = await sendAnswer({ roundId: round.roundId, index, mood: pendingAnswer.current });
    if ('error' in res) return;
    setResult(res.data);
    setPhase('feedback');
  };

  const next = () => {
    if (!result) return;
    if (result.finished || index >= QUESTIONS_PER_ROUND - 1) {
      void stats.refetch();
      setPhase('result');
    } else {
      resetQuestion();
      setIndex(index + 1);
      setPhase('question');
    }
  };

  const tagAs = (mood: Mood) => {
    if (!question) return;
    void toggleTag(question.song.id, mood, { forceOn: true }); // AC-11.1.5
    setTagged(true);
  };

  const total = result?.totalScore ?? 0;
  return {
    phase,
    question,
    index,
    total: QUESTIONS_PER_ROUND,
    left,
    limit,
    chosen,
    result,
    tagged,
    score: total,
    streak: result?.streak ?? 0,
    isNewBest: total > 0 && total > bestBefore,
    answer,
    next,
    tagAs,
    retryLost,
    restart: () => {
      setPhase('starting');
      void begin();
    },
  };
}
