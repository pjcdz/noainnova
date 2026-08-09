/**
 * Rueda de emociones de posicion libre.
 *
 * El angulo (0-360, 0 arriba, sentido horario) ubica a la persona ENTRE dos
 * emociones vecinas — nunca la obliga a elegir una sola. El radio (0-1) es la
 * intensidad. Cada eje de la rueda es una oposicion real:
 *
 *     alegria (0) <-> tristeza (180)
 *   confianza (45) <-> miedo (225)
 *      calma (90) <-> enojo (270)
 *   sorpresa (135) <-> verguenza (315)
 */

export type EmotionKey =
  | "alegria"
  | "confianza"
  | "calma"
  | "sorpresa"
  | "tristeza"
  | "miedo"
  | "enojo"
  | "verguenza";

export type Emotion = {
  key: EmotionKey;
  label: string;
  /** Grados en la rueda. */
  angle: number;
  /** Codigo de dos letras. Acompana al color donde no entra la palabra
   *  completa (celdas del calendario), para no depender solo del color. */
  short: string;
  /** Cuan agradable es, de -1 a 1. Solo para promediar el animo; no es un
   *  juicio sobre la emocion. */
  valence: number;
  /** Que se siente en el cuerpo / la cabeza. Se muestra al elegir. */
  gloss: string;
  /** Matices del desglose. Multi-seleccion, todos opcionales. */
  nuances: string[];
};

export const STEP = 45;

export const EMOTIONS: Emotion[] = [
  {
    key: "alegria",
    label: "Alegría",
    angle: 0,
    short: "Al",
    valence: 1,
    gloss: "El cuerpo liviano, ganas de compartirlo con alguien.",
    nuances: ["entusiasmo", "gratitud", "orgullo", "ternura", "alivio", "diversión"],
  },
  {
    key: "confianza",
    label: "Confianza",
    angle: 45,
    short: "Co",
    valence: 0.8,
    gloss: "Sentís que podés con esto, o que alguien te banca.",
    nuances: ["seguridad", "esperanza", "cercanía", "determinación", "calidez", "respaldo"],
  },
  {
    key: "calma",
    label: "Calma",
    angle: 90,
    short: "Ca",
    valence: 0.6,
    gloss: "Nada tira de vos. El pecho respira despacio.",
    nuances: ["serenidad", "descanso", "presencia", "aceptación", "silencio", "conformidad"],
  },
  {
    key: "sorpresa",
    label: "Sorpresa",
    angle: 135,
    short: "So",
    valence: 0,
    gloss: "Algo se salió del guion y todavía lo estás procesando.",
    nuances: ["desconcierto", "curiosidad", "shock", "asombro", "confusión", "expectativa"],
  },
  {
    key: "tristeza",
    label: "Tristeza",
    angle: 180,
    short: "Tr",
    valence: -0.8,
    gloss: "Pesa. Cuesta arrancar y las cosas pierden color.",
    nuances: ["melancolía", "soledad", "vacío", "desánimo", "nostalgia", "desilusión"],
  },
  {
    key: "miedo",
    label: "Miedo",
    angle: 225,
    short: "Mi",
    valence: -0.8,
    gloss: "Algo puede salir mal y el cuerpo ya se preparó.",
    nuances: ["ansiedad", "inquietud", "inseguridad", "alerta", "pánico", "preocupación"],
  },
  {
    key: "enojo",
    label: "Enojo",
    angle: 270,
    short: "En",
    valence: -0.6,
    gloss: "Algo no está bien y hay energía queriendo salir.",
    nuances: ["fastidio", "bronca", "impotencia", "injusticia", "irritación", "hartazgo"],
  },
  {
    key: "verguenza",
    label: "Vergüenza",
    angle: 315,
    short: "Ve",
    valence: -0.7,
    gloss: "Ganas de que nadie te esté mirando ahora mismo.",
    nuances: ["culpa", "exposición", "arrepentimiento", "timidez", "incomodidad", "autocrítica"],
  },
];

export const BY_KEY: Record<EmotionKey, Emotion> = Object.fromEntries(
  EMOTIONS.map((e) => [e.key, e]),
) as Record<EmotionKey, Emotion>;

export type Weight = { emotion: Emotion; weight: number };

export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * Descompone un angulo en las dos emociones vecinas, con peso lineal.
 * Los pesos siempre suman 1. Sobre una emocion exacta, esa se lleva todo.
 */
export function blend(angle: number): Weight[] {
  const a = normalizeAngle(angle);
  const i = Math.floor(a / STEP) % EMOTIONS.length;
  const t = (a % STEP) / STEP;
  const next = (i + 1) % EMOTIONS.length;
  const pair: Weight[] = [
    { emotion: EMOTIONS[i], weight: 1 - t },
    { emotion: EMOTIONS[next], weight: t },
  ];
  return pair.filter((w) => w.weight > 0.0001).sort((x, y) => y.weight - x.weight);
}

export function dominant(angle: number): Emotion {
  return blend(angle)[0].emotion;
}

const INTENSITY_WORDS: [number, string][] = [
  [0.2, "apenas perceptible"],
  [0.45, "suave"],
  [0.7, "media"],
  [0.9, "fuerte"],
  [Infinity, "muy fuerte"],
];

export function intensityWord(intensity: number): string {
  return INTENSITY_WORDS.find(([max]) => intensity < max)![1];
}

/**
 * La lectura en palabras. Va SIEMPRE visible debajo de la rueda para que la
 * eleccion no dependa del color (requisito de accesibilidad).
 */
export function describe(angle: number, intensity: number): string {
  if (intensity < 0.12) return "Sin una emoción marcada todavía";
  const [first, second] = blend(angle);
  const level = intensityWord(intensity);
  if (!second || first.weight >= 0.85) {
    return `${first.emotion.label}, de intensidad ${level}`;
  }
  if (first.weight >= 0.62) {
    return `Sobre todo ${first.emotion.label.toLowerCase()}, con algo de ${second.emotion.label.toLowerCase()} · intensidad ${level}`;
  }
  return `Entre ${first.emotion.label.toLowerCase()} y ${second.emotion.label.toLowerCase()} · intensidad ${level}`;
}

/** Matices ofrecidos: los de la emocion dominante, mas dos de la secundaria si pesa. */
export function nuancesFor(angle: number): string[] {
  const [first, second] = blend(angle);
  const list = [...first.emotion.nuances];
  if (second && second.weight >= 0.25) list.push(...second.emotion.nuances.slice(0, 2));
  return Array.from(new Set(list));
}

/**
 * Color de la mezcla, delegado a CSS: interpola los dos tokens de emocion y
 * despues desatura hacia el neutro segun la intensidad. Asi el color sigue el
 * tema claro/oscuro sin hacer cuentas de color en JS.
 */
export function colorFor(angle: number, intensity: number): string {
  const [first, second] = blend(angle);
  const hue = second
    ? `color-mix(in oklch, var(--emo-${first.emotion.key}) ${Math.round(first.weight * 100)}%, var(--emo-${second.emotion.key}))`
    : `var(--emo-${first.emotion.key})`;
  const mix = Math.round(15 + Math.min(1, Math.max(0, intensity)) * 85);
  return `color-mix(in oklch, ${hue} ${mix}%, var(--emo-neutral))`;
}

/**
 * Animo en escala 0-100, con 50 = neutro. Es la mezcla ponderada de valencias,
 * escalada por la intensidad: una tristeza apenas perceptible no pesa lo mismo
 * que una muy fuerte. Sirve para promediar y comparar, nada mas.
 */
export function moodScore(angle: number, intensity: number): number {
  const valence = blend(angle).reduce((sum, w) => sum + w.emotion.valence * w.weight, 0);
  return Math.round(50 + valence * Math.min(1, Math.max(0, intensity)) * 50);
}

/* --- Geometria de la rueda: 0 grados arriba, sentido horario. --- */

export function toXY(angle: number, radius: number): { x: number; y: number } {
  const rad = (normalizeAngle(angle) * Math.PI) / 180;
  return { x: Math.sin(rad) * radius, y: -Math.cos(rad) * radius };
}

export function fromXY(dx: number, dy: number): number {
  return normalizeAngle((Math.atan2(dx, -dy) * 180) / Math.PI);
}
