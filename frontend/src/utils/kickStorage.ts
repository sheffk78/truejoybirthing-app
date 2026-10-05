// kickStorage.ts — local kick-counter session log (Kick Counter mockup v2,
// Jeff-approved 10/05 msg 1556788160493781056).
//
// AsyncStorage key 'tjb_kick_sessions_v1' — a JSON array of session records,
// newest appended. Pure helpers + defensive JSON parsing throughout:
// corrupt/absent storage resolves to an empty list, never an exception.
// No backend dependency — kick counts are device-local until a future sync.

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tjb_kick_sessions_v1';
const MAX_SESSIONS = 500; // safety cap so the array can never grow unbounded

export type KickMode = 'count_to_10' | 'free';

export interface KickSession {
  id: string;
  dateISO: string;
  kicks: number;
  durationSec: number;
  mode: KickMode;
}

export interface TodaysTotals {
  sessionCount: number;
  kickCount: number;
  lastSessionISO: string | null;
}

const isKickMode = (v: unknown): v is KickMode => v === 'count_to_10' || v === 'free';

// Row-shape guard: accept what looks like a stored session, drop the rest.
function coerceSession(raw: unknown): KickSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const dateISO = typeof r.dateISO === 'string' ? r.dateISO : '';
  if (!dateISO || Number.isNaN(new Date(dateISO).getTime())) return null;
  const kicks = Number(r.kicks);
  if (!Number.isFinite(kicks)) return null;
  const durationSec = Number(r.durationSec);
  return {
    id: typeof r.id === 'string' && r.id ? r.id : `kick_${dateISO}`,
    dateISO,
    kicks: Math.max(0, Math.round(kicks)),
    durationSec: Number.isFinite(durationSec) && durationSec >= 0 ? Math.round(durationSec) : 0,
    mode: isKickMode(r.mode) ? r.mode : 'free',
  };
}

export async function loadSessions(): Promise<KickSession[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return []; // corrupt JSON -> empty list, never crash
    }
    if (!Array.isArray(parsed)) return [];
    const sessions: KickSession[] = [];
    for (const row of parsed) {
      const coerced = coerceSession(row);
      if (coerced) sessions.push(coerced);
    }
    return sessions;
  } catch {
    return [];
  }
}

export async function saveSession(input: Omit<KickSession, 'id'>): Promise<KickSession[]> {
  const sessions = await loadSessions();
  const record: KickSession = {
    id: `kick_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    dateISO: input.dateISO,
    kicks: Math.max(0, Math.round(Number(input.kicks) || 0)),
    durationSec: Math.max(0, Math.round(Number(input.durationSec) || 0)),
    mode: isKickMode(input.mode) ? input.mode : 'free',
  };
  const next = [...sessions, record].slice(-MAX_SESSIONS);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Best effort: storage failures don't block the mom's session UI.
  }
  return next;
}

// Local calendar-day compare — toISOString().split('T')[0] shifts dates in US
// timezones (see src/utils/date.ts), so compare y/m/d fields directly.
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export async function todaySessions(date: Date = new Date()): Promise<KickSession[]> {
  const sessions = await loadSessions();
  const todays: KickSession[] = [];
  for (const s of sessions) {
    const d = new Date(s.dateISO);
    if (!Number.isNaN(d.getTime()) && isSameLocalDay(d, date)) todays.push(s);
  }
  return todays;
}

// Pure reducer over a session list (unit-friendly twin of todaysTotals).
export function totalsFrom(sessions: KickSession[], date: Date = new Date()): TodaysTotals {
  const todays: KickSession[] = [];
  for (const s of sessions) {
    const d = new Date(s.dateISO);
    if (!Number.isNaN(d.getTime()) && isSameLocalDay(d, date)) todays.push(s);
  }
  todays.sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
  const kickCount = todays.reduce((sum, s) => sum + s.kicks, 0);
  return {
    sessionCount: todays.length,
    kickCount,
    lastSessionISO: todays.length ? todays[todays.length - 1].dateISO : null,
  };
}

export async function todaysTotals(date: Date = new Date()): Promise<TodaysTotals> {
  return totalsFrom(await loadSessions(), date);
}