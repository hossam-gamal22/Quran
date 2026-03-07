type Callback = (payload?: any) => void;

const listeners: Record<string, Callback[]> = {};

export function on(event: string, cb: Callback) {
  listeners[event] = listeners[event] || [];
  listeners[event].push(cb);
  return () => off(event, cb);
}

export function off(event: string, cb?: Callback) {
  if (!listeners[event]) return;
  if (!cb) { delete listeners[event]; return; }
  listeners[event] = listeners[event].filter(f => f !== cb);
}

export function emit(event: string, payload?: any) {
  const list = listeners[event] || [];
  for (const cb of list.slice()) cb(payload);
}

export default { on, off, emit };
