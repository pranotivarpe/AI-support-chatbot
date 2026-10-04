"use client";

import { MessageCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

declare global {
  interface Window {
    SupportPilot?: { open: () => void; close: () => void; toggle: () => void };
  }
}

export function OpenDemoButton({ className, label = "Chat with the live demo" }: { className?: string; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.SupportPilot?.open()}
      className={buttonClass("brand", "lg", className)}
    >
      <MessageCircle /> {label}
    </button>
  );
}
