// Tiny local "database" persisted in localStorage.
// Every write goes through `update()`, which notifies React subscribers and
// other open tabs (via the `storage` event) so chat/notifications feel live.
// To move to a real backend, replace the functions in services.js with HTTP calls.
import { buildSeed } from './seed';

const DB_KEY = 'unisatc-marketplace-db-v1';
const SESSION_KEY = 'unisatc-marketplace-session';

const memory = new Map();
const storage =
  typeof window !== 'undefined' && window.localStorage
    ? window.localStorage
    : {
        getItem: (k) => (memory.has(k) ? memory.get(k) : null),
        setItem: (k, v) => memory.set(k, String(v)),
        removeItem: (k) => memory.delete(k),
      };

let state = null;
let session = null;
let boundStorageEvent = false;
const listeners = new Set();

const emit = () => listeners.forEach((l) => l());

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function initDb() {
  const raw = storage.getItem(DB_KEY);
  if (raw) {
    try {
      state = JSON.parse(raw);
    } catch {
      state = null;
    }
  }
  if (!state) {
    state = await buildSeed();
    storage.setItem(DB_KEY, JSON.stringify(state));
  }
  session = storage.getItem(SESSION_KEY);

  if (typeof window !== 'undefined' && !boundStorageEvent) {
    boundStorageEvent = true;
    window.addEventListener('storage', (e) => {
      if (e.key === DB_KEY && e.newValue) state = JSON.parse(e.newValue);
      else if (e.key === SESSION_KEY) session = e.newValue;
      else return;
      emit();
    });
  }
}

export const getDb = () => state;
export const getSession = () => session;

/** Applies a mutation on a copy of the database and persists it atomically. */
export function update(mutator) {
  const draft = structuredClone(state);
  const result = mutator(draft);
  try {
    storage.setItem(DB_KEY, JSON.stringify(draft));
  } catch {
    throw new Error(
      'Não há espaço suficiente no armazenamento do navegador. Use menos imagens ou imagens menores.',
    );
  }
  state = draft;
  emit();
  return result;
}

export function setSession(userId) {
  session = userId || null;
  if (session) storage.setItem(SESSION_KEY, session);
  else storage.removeItem(SESSION_KEY);
  emit();
}

/** Restores the demo data (used by tests and by the "Restaurar dados" button). */
export async function resetDb() {
  state = await buildSeed();
  storage.setItem(DB_KEY, JSON.stringify(state));
  setSession(null);
}
