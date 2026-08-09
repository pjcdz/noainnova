"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, CircleDot, LifeBuoy, MessageCircleHeart, User } from "lucide-react";
import { HelpSheet } from "@/components/help-sheet";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config";
import { riskLevel } from "@/lib/risk";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/hoy", label: "Hoy", icon: CircleDot },
  { href: "/metricas", label: "Métricas", icon: CalendarDays },
  { href: "/chat", label: "Charlar", icon: MessageCircleHeart },
];

export default function AppLayout({ children }: LayoutProps<"/">) {
  const state = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (state.hydrated && !state.onboarded) router.replace("/bienvenida");
  }, [state.hydrated, state.onboarded, router]);

  if (!state.hydrated) return <div className="flex-1" aria-busy="true" />;

  const level = riskLevel(state);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="no-print sticky top-0 z-20 flex items-center gap-2 border-b bg-background/85 px-4 py-3 backdrop-blur">
        <Link href="/perfil" className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-accent">
          <span className="grid size-8 place-items-center rounded-full bg-secondary text-sm font-semibold">
            {state.profile?.nick?.[0]?.toUpperCase() ?? <User className="size-4" />}
          </span>
          <span className="text-sm font-medium">{state.profile?.nick || "Perfil"}</span>
        </Link>

        <span className="ml-auto text-sm font-semibold tracking-tight text-muted-foreground">
          {APP_NAME}
        </span>

        {/* El nivel de riesgo no se muestra nunca; solo decide cuanto pesa este boton. */}
        <Button
          variant={level >= 2 ? "default" : "ghost"}
          size={level >= 2 ? "default" : "icon"}
          onClick={() => setHelpOpen(true)}
          aria-label="Necesito ayuda ahora"
        >
          <LifeBuoy />
          {level >= 2 && <span>Ayuda</span>}
        </Button>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-5 pt-4 pb-28">{children}</main>

      <nav
        aria-label="Secciones"
        className="no-print fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur"
      >
        <ul className="mx-auto flex max-w-lg">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 py-3 text-xs",
                    active ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <HelpSheet open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
