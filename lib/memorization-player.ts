// lib/memorization-player.ts
// مشغّل صوتي مخصص لوضع الحفظ — يدعم تكرار الآية N مرات، تحكّم بالسرعة، وفاصل زمني.
// مستقل عن audio-player.ts الرئيسي (لا يعدّل سلوك صفحة المصحف).

import { Audio, AVPlaybackStatus, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { getAyahAudioUrl } from './quran-api';

export interface RepeatOptions {
  times: number; // عدد التكرارات (>=1)
  gapMs: number; // فاصل بين كل تكرار
  speed: number; // 0.5..2.0 (اعتيادياً 0.75/1/1.25)
  reciterId: string;
  preservePitch?: boolean; // افتراضي true
}

export type MemoPlayerEvent =
  | { kind: 'started'; iteration: number; total: number }
  | { kind: 'finished'; iteration: number; total: number }
  | { kind: 'all_done' }
  | { kind: 'stopped' }
  | { kind: 'error'; message: string };

export type MemoPlayerListener = (e: MemoPlayerEvent) => void;

class MemorizationPlayer {
  private sound: Audio.Sound | null = null;
  private isStopped = true;
  private listeners = new Set<MemoPlayerListener>();
  private currentToken = 0; // يمنع تداخل العمليات المتتابعة

  subscribe(l: MemoPlayerListener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private emit(e: MemoPlayerEvent) {
    for (const l of this.listeners) {
      try {
        l(e);
      } catch {}
    }
  }

  private async configureAudio(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        // صريح لفرض AVAudioSessionCategoryPlayback على iOS Simulator.
        interruptionModeIOS: InterruptionModeIOS?.DoNotMix ?? 1,
        interruptionModeAndroid: InterruptionModeAndroid?.DuckOthers ?? 2,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch {}
  }

  private async unloadCurrent(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
      } catch {}
      try {
        await this.sound.unloadAsync();
      } catch {}
      this.sound = null;
    }
  }

  private waitForFinish(snd: Audio.Sound, token: number): Promise<boolean> {
    return new Promise((resolve) => {
      let done = false;
      let interval: ReturnType<typeof setInterval> | null = null;
      const finish = (value: boolean) => {
        if (done) return;
        done = true;
        if (interval) clearInterval(interval);
        try {
          snd.setOnPlaybackStatusUpdate(null);
        } catch {}
        resolve(value);
      };
      interval = setInterval(() => {
        if (this.isStopped || this.currentToken !== token) finish(false);
      }, 100);
      snd.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (done) return;
        if (this.isStopped || this.currentToken !== token) {
          finish(false);
          return;
        }
        if (!status.isLoaded) {
          finish(false);
          return;
        }
        if (status.didJustFinish) {
          finish(true);
        }
      });
    });
  }

  private async sleep(ms: number, token: number): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.currentToken === token && !this.isStopped);
      }, Math.max(0, ms));
    });
  }

  private async playSingleAyahRepeats(
    surah: number,
    ayah: number,
    opts: RepeatOptions,
    token: number,
  ): Promise<boolean> {
    const url = getAyahAudioUrl(surah, ayah, opts.reciterId);
    const total = Math.max(1, Math.floor(opts.times));
    const speed = Math.max(0.5, Math.min(2, opts.speed || 1));
    const gapMs = Math.max(0, opts.gapMs || 0);

    try {
      for (let i = 1; i <= total; i += 1) {
        if (this.isStopped || this.currentToken !== token) return false;

        await this.unloadCurrent();
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: false },
        );
        if (this.isStopped || this.currentToken !== token) {
          await sound.unloadAsync().catch(() => {});
          return false;
        }
        this.sound = sound;
        try {
          await sound.setRateAsync(speed, opts.preservePitch !== false);
        } catch {}
        this.emit({ kind: 'started', iteration: i, total });
        await sound.playAsync();
        const finished = await this.waitForFinish(sound, token);
        if (!finished) {
          await sound.unloadAsync().catch(() => {});
          this.sound = null;
          return false;
        }
        await sound.unloadAsync().catch(() => {});
        this.sound = null;
        this.emit({ kind: 'finished', iteration: i, total });

        if (i < total) {
          const ok = await this.sleep(gapMs, token);
          if (!ok) return false;
        }
      }
      return true;
    } catch (e: any) {
      this.emit({ kind: 'error', message: e?.message ?? 'audio error' });
      return false;
    }
  }

  /**
   * شغّل آية واحدة مع تكرار وسرعة وفاصل زمني.
   */
  async playAyahWithRepeat(
    surah: number,
    ayah: number,
    opts: RepeatOptions,
  ): Promise<void> {
    const token = ++this.currentToken;
    this.isStopped = false;
    await this.configureAudio();
    await this.unloadCurrent();

    try {
      const ok = await this.playSingleAyahRepeats(surah, ayah, opts, token);
      if (ok && this.currentToken === token && !this.isStopped) {
        this.emit({ kind: 'all_done' });
      }
    } finally {
      await this.unloadCurrent();
    }
  }

  /**
   * شغّل قائمة آيات بالتسلسل، كل واحدة بتكرار محدد.
   * onAdvance يُستدعى قبل كل آية بمؤشرها (0-based).
   */
  async playSequence(
    ayahs: { surah: number; ayah: number }[],
    opts: RepeatOptions & { onAdvance?: (index: number) => void },
  ): Promise<void> {
    const token = ++this.currentToken;
    this.isStopped = false;
    await this.configureAudio();
    await this.unloadCurrent();

    try {
      for (let i = 0; i < ayahs.length; i += 1) {
        if (this.isStopped || this.currentToken !== token) return;
        opts.onAdvance?.(i);
        const ok = await this.playSingleAyahRepeats(
          ayahs[i].surah,
          ayahs[i].ayah,
          opts,
          token,
        );
        if (!ok || this.isStopped || this.currentToken !== token) return;
        if (i < ayahs.length - 1) {
          const paused = await this.sleep(500, token);
          if (!paused) return;
        }
      }
      if (this.currentToken === token && !this.isStopped) {
        this.emit({ kind: 'all_done' });
      }
    } finally {
      await this.unloadCurrent();
    }
  }

  async stop(): Promise<void> {
    this.isStopped = true;
    this.currentToken += 1;
    await this.unloadCurrent();
    this.emit({ kind: 'stopped' });
  }

  isPlaying(): boolean {
    return !this.isStopped;
  }
}

export const memorizationPlayer = new MemorizationPlayer();
