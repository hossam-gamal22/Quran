import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAudioSeekPreviewParams {
  currentPosition: number;
  duration: number;
  canSeek: boolean;
  isCurrentTrack: boolean;
  resetKey: string;
  seekTo: (positionMs: number) => Promise<void>;
}

export function useAudioSeekPreview({
  currentPosition,
  duration,
  canSeek,
  isCurrentTrack,
  resetKey,
  seekTo,
}: UseAudioSeekPreviewParams) {
  const [previewPosition, setPreviewPosition] = useState<number | null>(null);
  const pendingSeekTargetRef = useRef<number | null>(null);

  const clampPosition = useCallback((value: number) => {
    if (duration <= 0) return 0;
    return Math.min(Math.max(value, 0), duration);
  }, [duration]);

  const displayPosition = previewPosition ?? currentPosition;
  const sliderPosition = canSeek ? clampPosition(displayPosition) : 0;

  const handleSeekPreview = useCallback((value: number) => {
    if (!canSeek) return;
    setPreviewPosition(clampPosition(value));
  }, [canSeek, clampPosition]);

  const handleSeekComplete = useCallback((value: number) => {
    if (!canSeek) return;
    const target = clampPosition(value);
    pendingSeekTargetRef.current = target;
    setPreviewPosition(target);
    seekTo(target).catch(() => {
      pendingSeekTargetRef.current = null;
      setPreviewPosition(null);
    });
  }, [canSeek, clampPosition, seekTo]);

  useEffect(() => {
    if (!canSeek || !isCurrentTrack) {
      pendingSeekTargetRef.current = null;
      setPreviewPosition(null);
    }
  }, [canSeek, isCurrentTrack]);

  useEffect(() => {
    const target = pendingSeekTargetRef.current;
    if (target === null) return;
    if (Math.abs(currentPosition - target) <= 1000) {
      pendingSeekTargetRef.current = null;
      setPreviewPosition(null);
    }
  }, [currentPosition]);

  useEffect(() => {
    pendingSeekTargetRef.current = null;
    setPreviewPosition(null);
  }, [resetKey]);

  return {
    displayPosition,
    sliderPosition,
    handleSeekStart: handleSeekPreview,
    handleSeekChange: handleSeekPreview,
    handleSeekComplete,
  };
}
