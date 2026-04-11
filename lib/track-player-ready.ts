// lib/track-player-ready.ts
// Shared TrackPlayer readiness state — avoids circular dependency between
// GlobalAudioContext (which marks ready) and radio-player (which needs to check)

let _setupDone = false;
let _onReadyCallback: (() => void) | null = null;

/** Called from _layout.tsx after TrackPlayer.setupPlayer() succeeds */
export function markTrackPlayerSetupDone() {
  _setupDone = true;
  _onReadyCallback?.();
  _onReadyCallback = null;
}

/** Check if TrackPlayer has been fully initialized (not just importable) */
export function isTrackPlayerSetupDone(): boolean {
  return _setupDone;
}

/** Register a one-time callback for when setup completes (fires immediately if already done) */
export function onTrackPlayerSetupDone(cb: () => void) {
  if (_setupDone) {
    cb();
  } else {
    _onReadyCallback = cb;
  }
}
