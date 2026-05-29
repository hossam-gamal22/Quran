import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { fontBold, fontSemiBold } from '@/lib/fonts';
import { uiText } from '@/lib/ui-text';
import type { Difficulty } from '@/lib/smart-alarm/types';

interface MathProblem {
  a: number;
  b: number;
  op: '+' | '-' | '×';
  answer: number;
  options: number[];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateProblem(difficulty: Difficulty): MathProblem {
  let a: number;
  let b: number;
  let op: '+' | '-' | '×';
  let answer: number;

  if (difficulty === 'easy') {
    op = Math.random() < 0.5 ? '+' : '-';
    a = randInt(1, 9);
    b = randInt(1, 9);
    if (op === '-' && b > a) [a, b] = [b, a];
    answer = op === '+' ? a + b : a - b;
  } else if (difficulty === 'hard') {
    const ops: ('+' | '-' | '×')[] = ['+', '-', '×'];
    op = ops[randInt(0, 2)];
    if (op === '×') {
      a = randInt(3, 12);
      b = randInt(3, 9);
      answer = a * b;
    } else {
      a = randInt(10, 49);
      b = randInt(5, 25);
      if (op === '-' && b > a) [a, b] = [b, a];
      answer = op === '+' ? a + b : a - b;
    }
  } else {
    op = (['+', '-', '×'] as const)[randInt(0, 2)];
    if (op === '×') {
      a = randInt(2, 9);
      b = randInt(2, 9);
      answer = a * b;
    } else {
      a = randInt(5, 19);
      b = randInt(1, 9);
      if (op === '-' && b > a) [a, b] = [b, a];
      answer = op === '+' ? a + b : a - b;
    }
  }

  const distractors = new Set<number>();
  while (distractors.size < 3) {
    const delta = randInt(1, Math.max(2, Math.round(answer / 10) + 3)) * (Math.random() < 0.5 ? -1 : 1);
    const cand = answer + delta;
    if (cand !== answer && cand > 0 && !distractors.has(cand)) distractors.add(cand);
  }
  const options = [answer, ...distractors].sort(() => Math.random() - 0.5);
  return { a, b, op, answer, options };
}

interface MathChallengeProps {
  difficulty: Difficulty;
  onSolved: () => void;
}

export function MathChallenge({ difficulty, onSolved }: MathChallengeProps) {
  const [problem, setProblem] = useState<MathProblem>(() => generateProblem(difficulty));
  const [wrongFlash, setWrongFlash] = useState(false);

  const onPick = useCallback(
    (option: number) => {
      if (option === problem.answer) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onSolved();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setWrongFlash(true);
        setTimeout(() => setWrongFlash(false), 400);
        setProblem(generateProblem(difficulty));
      }
    },
    [problem.answer, difficulty, onSolved],
  );

  const expression = useMemo(() => `${problem.a} ${problem.op} ${problem.b}`, [problem]);

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{uiText({ ar: 'احسب الناتج', en: 'Solve' })}</Text>
      <View style={[styles.problemBox, wrongFlash && styles.problemBoxWrong]}>
        <Text style={styles.problemText}>{expression} = ?</Text>
      </View>
      <View style={styles.grid}>
        {problem.options.map((opt) => (
          <TouchableOpacity
            key={`${opt}-${problem.a}-${problem.b}`}
            style={styles.optionBtn}
            onPress={() => onPick(opt)}
            activeOpacity={0.7}
          >
            <Text style={styles.optionText}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', paddingVertical: 4 },
  label: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 8,
    writingDirection: 'ltr',
  },
  problemBox: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
    alignSelf: 'center',
    minWidth: 200,
  },
  problemBoxWrong: { borderColor: '#dc2626' },
  problemText: {
    fontSize: 26,
    fontFamily: fontBold(),
    letterSpacing: 2,
    color: '#FFFFFF',
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  optionBtn: {
    width: '46%',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 24,
    fontFamily: fontBold(),
    color: '#FFFFFF',
    textAlign: 'center',
    writingDirection: 'ltr',
  },
});
