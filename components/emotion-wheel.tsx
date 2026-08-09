"use client";

import { useId, useRef, useState } from "react";
import {
  EMOTIONS,
  STEP,
  colorFor,
  describe,
  fromXY,
  normalizeAngle,
  toXY,
} from "@/lib/emotions";
import { cn } from "@/lib/utils";

const CX = 190;
const CY = 152;
const R = 100;
const LABEL_R = 124;

export type WheelValue = { angle: number; intensity: number };

function arc(centerAngle: number) {
  const a = toXY(centerAngle - STEP / 2, R);
  const b = toXY(centerAngle + STEP / 2, R);
  return `M ${CX} ${CY} L ${CX + a.x} ${CY + a.y} A ${R} ${R} 0 0 1 ${CX + b.x} ${CY + b.y} Z`;
}

export function EmotionWheel({
  value,
  onChange,
  className,
}: {
  value: WheelValue;
  onChange: (v: WheelValue) => void;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const fadeId = useId();
  const hintId = useId();

  const knob = toXY(value.angle, value.intensity * R);
  const reading = describe(value.angle, value.intensity);

  function pointTo(e: React.PointerEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const dx = p.x - CX;
    const dy = p.y - CY;
    onChange({
      angle: fromXY(dx, dy),
      intensity: Math.min(1, Math.hypot(dx, dy) / R),
    });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const angleStep = e.shiftKey ? 1 : 5;
    const intensityStep = e.shiftKey ? 0.01 : 0.05;
    const moves: Record<string, () => WheelValue> = {
      ArrowLeft: () => ({ ...value, angle: normalizeAngle(value.angle - angleStep) }),
      ArrowRight: () => ({ ...value, angle: normalizeAngle(value.angle + angleStep) }),
      ArrowUp: () => ({ ...value, intensity: Math.min(1, value.intensity + intensityStep) }),
      ArrowDown: () => ({ ...value, intensity: Math.max(0, value.intensity - intensityStep) }),
      PageUp: () => ({ ...value, angle: normalizeAngle((Math.round(value.angle / STEP) + 1) * STEP) }),
      PageDown: () => ({ ...value, angle: normalizeAngle((Math.round(value.angle / STEP) - 1) * STEP) }),
      Home: () => ({ ...value, intensity: 0 }),
      End: () => ({ ...value, intensity: 1 }),
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    onChange(move());
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <svg
        ref={svgRef}
        viewBox="0 0 380 320"
        className="w-full max-w-md touch-none select-none"
        role="presentation"
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setDragging(true);
          pointTo(e);
        }}
        onPointerMove={(e) => dragging && pointTo(e)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        <defs>
          {/* Desvanece el centro hacia el fondo: el medio de la rueda es
              "sin emocion marcada", no un color mas. */}
          <radialGradient id={fadeId}>
            <stop offset="0%" stopColor="var(--background)" stopOpacity="1" />
            <stop offset="55%" stopColor="var(--background)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--background)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {EMOTIONS.map((e) => (
          <path
            key={e.key}
            d={arc(e.angle)}
            fill={`var(--emo-${e.key})`}
            opacity={0.78}
            stroke="var(--background)"
            strokeWidth={1}
          />
        ))}
        <circle cx={CX} cy={CY} r={R} fill={`url(#${fadeId})`} />

        {/* Aros guia de intensidad. */}
        {[0.33, 0.66, 1].map((f) => (
          <circle
            key={f}
            cx={CX}
            cy={CY}
            r={R * f}
            fill="none"
            stroke="var(--foreground)"
            strokeOpacity={0.12}
            strokeWidth={1}
          />
        ))}

        {EMOTIONS.map((e) => {
          const p = toXY(e.angle, LABEL_R);
          const x = CX + p.x;
          const anchor = x > CX + 2 ? "start" : x < CX - 2 ? "end" : "middle";
          const nudge = anchor === "start" ? 8 : anchor === "end" ? -8 : 0;
          return (
            <text
              key={e.key}
              x={x + nudge}
              y={CY + p.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="cursor-pointer fill-foreground text-[13px] font-medium"
              onPointerDown={(ev) => {
                ev.stopPropagation();
                onChange({ angle: e.angle, intensity: Math.max(0.55, value.intensity) });
              }}
            >
              {e.label}
            </text>
          );
        })}

        {/* La perilla. Es el control accesible: recibe foco y teclado. */}
        <g
          role="slider"
          tabIndex={0}
          aria-label="Cómo te sentís"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(value.intensity * 100)}
          aria-valuetext={reading}
          aria-describedby={hintId}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          transform={`translate(${CX + knob.x} ${CY + knob.y})`}
          className={cn(
            "cursor-grab focus-visible:outline-none",
            !dragging && "motion-safe:transition-transform motion-safe:duration-200",
          )}
        >
          <circle r={22} fill="transparent" />
          <circle
            r={15}
            fill={colorFor(value.angle, value.intensity)}
            stroke="var(--background)"
            strokeWidth={3}
          />
          {focused && <circle r={20} fill="none" stroke="var(--ring)" strokeWidth={2.5} />}
        </g>
      </svg>

      {/* Lectura en palabras: la eleccion nunca depende solo del color. */}
      <p aria-live="polite" className="text-center text-base font-medium text-balance">
        {reading}
      </p>
      <p id={hintId} className="text-center text-xs text-muted-foreground">
        Arrastrá el punto. Con teclado: flechas ← → cambian la emoción, ↑ ↓ la intensidad.
      </p>
    </div>
  );
}
