"use client";

import { useSyncExternalStore } from "react";
import { dominant, type EmotionKey } from "./emotions";

const KEY = "anima.v1";

export type Profile = {
  nick: string;
  gender: string;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  emergencyContact: { name: string; phone: string } | null;
  reasons: string[];
  reasonNote: string;
  occupation: string;
};

export type CheckIn = {
  id: string;
  at: string;
  angle: number;
  intensity: number;
  nuances: string[];
  why: string;
  followUp: string;
  activity: string;
  sleepHours: number | null;
  exerciseMin: number | null;
  /** 0 nada · 1 poco · 2 algo · 3 bastante */
  social: number | null;
};

export type Message = { role: "user" | "bot"; text: string; at: string };

export type HealthDay = {
  date: string;
  sleepHours: number;
  steps: number;
  restingHr: number;
};

export type State = {
  /** false mientras corre el render del servidor y la hidratacion inicial. */
  hydrated: boolean;
  onboarded: boolean;
  profile: Profile | null;
  checkIns: CheckIn[];
  messages: Message[];
  health: HealthDay[] | null;
  /** Senales internas. Nunca se le muestran a la persona como diagnostico. */
  riskSignals: string[];
};

export const EMPTY_PROFILE: Profile = {
  nick: "",
  gender: "",
  age: null,
  heightCm: null,
  weightKg: null,
  emergencyContact: null,
  reasons: [],
  reasonNote: "",
  occupation: "",
};

const EMPTY: State = {
  hydrated: false,
  onboarded: false,
  profile: null,
  checkIns: [],
  messages: [],
  health: null,
  riskSignals: [],
};

let state: State = EMPTY;
const listeners = new Set<() => void>();

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY, hydrated: true };
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<State>), hydrated: true };
  } catch {
    return { ...EMPTY, hydrated: true };
  }
}

function getSnapshot(): State {
  if (!state.hydrated) state = load();
  return state;
}

function getServerSnapshot(): State {
  return EMPTY;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Devuelve todo el estado. Sin selectores: la app es chica y evita el
 *  footgun de getSnapshot devolviendo objetos nuevos en cada llamada. */
export function useStore(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function update(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const current = getSnapshot();
  const next = { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
  state = next;
  try {
    const { hydrated: _drop, ...persisted } = next;
    void _drop;
    localStorage.setItem(KEY, JSON.stringify(persisted));
  } catch {
    // Modo privado o storage lleno: la sesion sigue funcionando en memoria.
  }
  listeners.forEach((f) => f());
}

export function addCheckIn(entry: Omit<CheckIn, "id" | "at">) {
  update((s) => ({
    checkIns: [...s.checkIns, { ...entry, id: crypto.randomUUID(), at: new Date().toISOString() }],
  }));
}

export function replaceCheckIn(id: string, entry: Omit<CheckIn, "id" | "at">) {
  update((s) => ({
    checkIns: s.checkIns.map((c) => (c.id === id ? { ...c, ...entry } : c)),
  }));
}

export function addMessage(role: Message["role"], text: string) {
  update((s) => ({ messages: [...s.messages, { role, text, at: new Date().toISOString() }] }));
}

export function addRiskSignal(id: string) {
  update((s) => (s.riskSignals.includes(id) ? {} : { riskSignals: [...s.riskSignals, id] }));
}

export function reset() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignorar
  }
  state = { ...EMPTY, hydrated: true };
  listeners.forEach((f) => f());
}

/* --- Derivados --- */

export const dayKey = (iso: string) => iso.slice(0, 10);
export const todayKey = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export function checkInsOn(checkIns: CheckIn[], day: string) {
  return checkIns.filter((c) => dayKey(c.at) === day);
}

export function lastEmotionKey(checkIns: CheckIn[]): EmotionKey | null {
  const last = checkIns[checkIns.length - 1];
  return last ? dominant(last.angle).key : null;
}
