"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** El estado vive en localStorage, asi que quien decide la primera pantalla es
 *  el cliente. Hasta que hidrata no mostramos nada: es preferible un instante
 *  en blanco a que la app te salude como si fueras nuevo cada vez. */
export default function Home() {
  const { hydrated, onboarded } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(onboarded ? "/hoy" : "/bienvenida");
  }, [hydrated, onboarded, router]);

  return <div className="flex-1" aria-busy="true" />;
}
