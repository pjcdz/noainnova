"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, Phone, Wind } from "lucide-react";
import { Breathing } from "@/components/breathing";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HELPLINES, HELPLINE_NAME } from "@/lib/config";
import { useStore } from "@/lib/store";

/** Las tres salidas. Sin lenguaje alarmista y sin pedir explicaciones:
 *  quien llega hasta aca no esta para llenar un formulario. */
export function HelpSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { profile } = useStore();
  const [view, setView] = useState<"menu" | "respirar">("menu");
  const contact = profile?.emergencyContact;

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setView("menu");
      }}
    >
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Estás acá y eso ya cuenta</SheetTitle>
          <SheetDescription>
            Elegí lo que te resulte posible ahora. No hace falta explicar nada.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 pb-8">
          {view === "respirar" ? (
            <>
              <Breathing />
              <Button variant="ghost" onClick={() => setView("menu")}>
                Volver
              </Button>
            </>
          ) : (
            <>
              {contact ? (
                <a
                  href={`tel:${contact.phone.replace(/\s/g, "")}`}
                  className="flex items-start gap-3 rounded-xl border p-4 hover:bg-accent"
                >
                  <Heart className="mt-0.5 size-5 shrink-0 text-[var(--emo-verguenza)]" />
                  <span>
                    <span className="block font-medium">Llamar a {contact.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {contact.phone} · tu contacto de confianza
                    </span>
                  </span>
                </a>
              ) : (
                <Link
                  href="/perfil#contacto"
                  onClick={() => onOpenChange(false)}
                  className="flex items-start gap-3 rounded-xl border p-4 hover:bg-accent"
                >
                  <Heart className="mt-0.5 size-5 shrink-0 text-[var(--emo-verguenza)]" />
                  <span>
                    <span className="block font-medium">Agregar un contacto de confianza</span>
                    <span className="block text-sm text-muted-foreground">
                      Alguien a quien puedas llamar sin dar explicaciones.
                    </span>
                  </span>
                </Link>
              )}

              <div className="rounded-xl border p-4">
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 size-5 shrink-0 text-[var(--emo-confianza)]" />
                  <div className="w-full">
                    <p className="font-medium">Hablar con alguien que sabe escuchar</p>
                    <p className="mb-3 text-sm text-muted-foreground">
                      {HELPLINE_NAME} · gratis, las 24 horas
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {HELPLINES.map((l) => (
                        <Button key={l.tel} asChild variant="outline" size="lg">
                          <a href={`tel:${l.tel}`}>
                            {l.label}
                            <span className="text-xs text-muted-foreground">{l.note}</span>
                          </a>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setView("respirar")}
                className="flex items-start gap-3 rounded-xl border p-4 text-left hover:bg-accent"
              >
                <Wind className="mt-0.5 size-5 shrink-0 text-[var(--emo-calma)]" />
                <span>
                  <span className="block font-medium">Quedarte acá un momento</span>
                  <span className="block text-sm text-muted-foreground">
                    Respiración guiada y un ejercicio para volver al cuerpo.
                  </span>
                </span>
              </button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
