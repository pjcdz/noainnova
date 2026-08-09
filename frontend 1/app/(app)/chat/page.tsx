"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizonal } from "lucide-react";
import { HelpSheet } from "@/components/help-sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RISK_REPLY, openingFor, respond } from "@/lib/chat";
import { PRIVACY_NOTE } from "@/lib/config";
import { addMessage, addRiskSignal, lastEmotionKey, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function Chat() {
  const { messages, checkIns, profile } = useStore();
  const [text, setText] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const emotion = lastEmotionKey(checkIns);
  const opening = emotion
    ? openingFor(emotion, profile?.nick ?? "")
    : `Hola${profile?.nick ? `, ${profile.nick}` : ""}. Contame cómo venís. Escribí lo que quieras, no hay forma correcta.`;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  function send() {
    const input = text.trim();
    if (!input) return;
    setText("");
    addMessage("user", input);

    const turn = messages.filter((m) => m.role === "user").length + 1;
    const reply = respond(input, { emotion, turn });

    if (reply.kind === "risk") {
      addRiskSignal("chat-risk");
      addMessage("bot", RISK_REPLY);
      setHelpOpen(true);
      return;
    }

    const parts = [reply.empathy];
    if (reply.followUp) parts.push(reply.followUp);
    if (reply.tools) {
      parts.push(
        "Algunas opciones, por si alguna te sirve. Elegís vos:\n" +
          reply.tools.map((t) => `· ${t}`).join("\n"),
      );
    }
    addMessage("bot", parts.join("\n\n"));
  }

  return (
    <div className="flex min-h-[calc(100dvh-11rem)] flex-col">
      <div className="flex-1 space-y-3">
        <Bubble role="bot">{opening}</Bubble>
        {messages.map((m, i) => (
          <Bubble key={`${m.at}-${i}`} role={m.role}>
            {m.text}
          </Bubble>
        ))}
        <div ref={endRef} />
      </div>

      <form
        className="sticky bottom-24 mt-4 space-y-2 bg-background pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder="Escribí lo que quieras"
            aria-label="Tu mensaje"
            className="resize-none"
          />
          <Button type="submit" size="icon" aria-label="Enviar" disabled={!text.trim()}>
            <SendHorizonal />
          </Button>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">{PRIVACY_NOTE}</p>
      </form>

      <HelpSheet open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}

function Bubble({ role, children }: { role: "user" | "bot"; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-line",
        role === "bot"
          ? "rounded-bl-sm bg-muted"
          : "ml-auto rounded-br-sm bg-primary text-primary-foreground",
      )}
    >
      {children}
    </p>
  );
}
