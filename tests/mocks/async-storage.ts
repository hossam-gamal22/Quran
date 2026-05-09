const storage = new Map<string, string>();

export default {
  getItem: (key: string) => Promise.resolve(storage.get(key) ?? null),
  setItem: (key: string, value: string) => {
    storage.set(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    storage.delete(key);
    return Promise.resolve();
  },
  getAllKeys: () => Promise.resolve(Array.from(storage.keys())),
  multiRemove: (keys: string[]) => {
    keys.forEach((key) => storage.delete(key));
    return Promise.resolve();
  },
  clear: () => {
    storage.clear();
    return Promise.resolve();
  },
};
