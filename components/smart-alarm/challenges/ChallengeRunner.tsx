import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontMedium, fontSemiBold } from '@/lib/fonts';
import { uiText } from '@/lib/ui-text';
import type { ChallengeType, Difficulty } from '@/lib/smart-alarm/types';
import { problemCountFor } from '@/lib/smart-alarm/types';
import { MathChallenge } from './MathChallenge';
import { ShakeChallenge } from './ShakeChallenge';
import { QuestionsChallenge } from './QuestionsChallenge';
import { MemoryChallenge } from './MemoryChallenge';

interface ChallengeRunnerProps {
  type: ChallengeType;
  difficulty: Difficulty;
  onCompleted: () => void;
}

const PICKABLE: Exclude<ChallengeType, 'none' | 'random'>[] = [
  'math',
  'shake',
  'questions',
  'memory',
];

function pickRandom(): Exclude<ChallengeType, 'none' | 'random'> {
  return PICKABLE[Math.floor(Math.random() * PICKABLE.length)];
}

/**
 * Drives a challenge to completion. For multi-problem types (math), runs the
 * required count back-to-back. For internally-paced types (shake/memory/questions
 * already manage their own counter), runs once.
 */
export function ChallengeRunner({ type, difficulty, onCompleted }: ChallengeRunnerProps) {
  const resolvedType = useMemo(() => (type === 'random' ? pickRandom() : type), [type]);
  const total = useMemo(() => {
    if (resolvedType === 'math') return problemCountFor('math', difficulty);
    return 1;
  }, [resolvedType, difficulty]);

  const [done, setDone] = useState(0);

  if (resolvedType === 'none') {
    return null;
  }

  const onSubSolved = () => {
    const next = done + 1;
    if (next >= total) {
      onCompleted();
    } else {
      setDone(next);
    }
  };

  return (
    <View style={styles.root}>
      {total > 1 && (
        <Text style={styles.progress}>
          {uiText({ ar: 'مسألة', en: 'Problem' })} {done + 1} / {total}
        </Text>
      )}

      {resolvedType === 'math' && (
        <MathChallenge key={`math-${done}`} difficulty={difficulty} onSolved={onSubSolved} />
      )}
      {resolvedType === 'shake' && (
        <ShakeChallenge difficulty={difficulty} onSolved={onSubSolved} />
      )}
      {resolvedType === 'questions' && (
        <QuestionsChallenge difficulty={difficulty} onSolved={onSubSolved} />
      )}
      {resolvedType === 'memory' && (
        <MemoryChallenge difficulty={difficulty} onSolved={onSubSolved} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%' },
  progress: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 12,
    writingDirection: 'ltr',
  },
});
