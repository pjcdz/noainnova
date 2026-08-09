/**
 * Checks de la logica que puede romperse en silencio.
 * Correr:  npm test
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { EMOTIONS, blend, describe as read, dominant, moodScore, fromXY, toXY } from "./emotions";
import { detectRisk } from "./risk";
import { detectTopic, respond } from "./chat";

test("blend: los pesos siempre suman 1", () => {
  for (let a = -720; a <= 720; a += 3.7) {
    const total = blend(a).reduce((s, w) => s + w.weight, 0);
    assert.ok(Math.abs(total - 1) < 1e-9, `angulo ${a} sumo ${total}`);
  }
});

test("blend: sobre una emocion exacta esa se lleva todo", () => {
  for (const e of EMOTIONS) {
    const parts = blend(e.angle);
    assert.equal(parts.length, 1, `${e.key} deberia ser puro`);
    assert.equal(parts[0].emotion.key, e.key);
  }
});

test("blend: los bordes 0 y 359.9 no se rompen ni se salen del arreglo", () => {
  assert.equal(dominant(0).key, "alegria");
  assert.equal(dominant(359.9).key, "alegria");
  assert.equal(dominant(-0.1).key, "alegria");
  assert.equal(dominant(360).key, "alegria");
  // Justo entre dos vecinas: mitad y mitad.
  const mid = blend(22.5);
  assert.equal(mid.length, 2);
  assert.ok(Math.abs(mid[0].weight - 0.5) < 1e-9);
  assert.deepEqual(
    mid.map((w) => w.emotion.key).sort(),
    ["alegria", "confianza"],
  );
});

test("geometria: ida y vuelta angulo -> xy -> angulo", () => {
  for (const a of [0, 37, 90, 180, 271, 359]) {
    const { x, y } = toXY(a, 80);
    assert.ok(Math.abs(fromXY(x, y) - a) < 1e-6, `fallo en ${a}`);
  }
  // 0 grados es arriba (y negativo en coordenadas de pantalla).
  assert.ok(toXY(0, 10).y < 0);
  assert.ok(toXY(90, 10).x > 0);
});

test("moodScore: neutro sin intensidad, extremos en los polos", () => {
  assert.equal(moodScore(0, 0), 50);
  assert.equal(moodScore(180, 0), 50);
  assert.equal(moodScore(0, 1), 100);
  assert.equal(moodScore(180, 1), 10);
  // Mas intensidad de una emocion desagradable = peor animo, nunca al reves.
  assert.ok(moodScore(180, 1) < moodScore(180, 0.5));
});

test("describe: siempre devuelve texto, tambien en los bordes", () => {
  for (const [a, i] of [
    [0, 0],
    [22.5, 1],
    [359.9, 0.5],
    [180, 0.11],
  ] as const) {
    assert.ok(read(a, i).length > 0);
  }
  assert.match(read(0, 0), /Sin una emoción/);
  assert.match(read(22.5, 0.8), /Entre alegría y confianza/);
});

test("detectRisk: reconoce las frases de riesgo", () => {
  const risky = [
    "me quiero morir",
    "no quiero seguir viviendo",
    "estuve pensando en suicidarme",
    "quiero desaparecer",
    "ya no vale la pena seguir",
    "tengo ganas de matarme",
    "pense en cortarme",
    "creo que estarían mejor sin mí",
  ];
  for (const t of risky) assert.ok(detectRisk(t), `no detecto: ${t}`);
});

test("detectRisk: NO se dispara con frases comunes que comparten palabras", () => {
  // Un falso positivo acá hace daño real: interrumpe a alguien que está bien
  // con una hoja de prevención del suicidio.
  const fine = [
    "me muero de sueño",
    "me mata el trabajo",
    "me quiero morir de la vergüenza",
    "me muero de risa con mi hermano",
    "me muero por verla",
    "estoy re cansado, no doy más",
    "hoy tuve que matar el tiempo en la oficina",
    "quiero terminar la facultad de una vez",
    "no quiero seguir trabajando en ese lugar",
    "me duele el cuerpo",
  ];
  for (const t of fine) assert.ok(!detectRisk(t), `falso positivo: ${t}`);
});

test("detectRisk: un uso figurado no tapa una senal real en el mismo mensaje", () => {
  assert.ok(detectRisk("me muero de vergüenza, la verdad es que me quiero matar"));
});

test("respond: el riesgo corta el flujo antes que cualquier tip", () => {
  const r = respond("no quiero vivir más", { emotion: "tristeza", turn: 3 });
  assert.equal(r.kind, "risk");
});

test("respond: turno 1 repregunta, turno 2 ofrece herramientas", () => {
  const first = respond("mi jefe me tiene harto", { emotion: "enojo", turn: 1 });
  assert.equal(first.kind, "reply");
  assert.ok(first.kind === "reply" && first.followUp);
  assert.ok(first.kind === "reply" && !first.tools);

  const second = respond("no sé, siempre lo mismo", { emotion: "enojo", turn: 2 });
  assert.ok(second.kind === "reply" && second.tools?.length === 3);
});

test("respond: es determinista (mismo texto, misma respuesta)", () => {
  const a = respond("estoy solo", { emotion: "tristeza", turn: 1 });
  const b = respond("estoy solo", { emotion: "tristeza", turn: 1 });
  assert.deepEqual(a, b);
});

test("respond: funciona sin emocion previa", () => {
  const r = respond("hola", { emotion: null, turn: 2 });
  assert.ok(r.kind === "reply" && r.tools?.length === 3);
});

test("detectTopic: elige el tema por palabras, con general de fallback", () => {
  assert.equal(detectTopic("discutí con mi pareja otra vez"), "vinculos");
  assert.equal(detectTopic("no puedo dormir hace días"), "sueno");
  assert.equal(detectTopic("me falta plata para el alquiler"), "dinero");
  assert.equal(detectTopic("qwerty"), "general");
});
