"use client";

import { Check, RotateCcw } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setHandoffStatus } from "../../../actions";

export function HandoffStatusButton({
  botId,
  handoffId,
  status,
  disabled,
}: {
  botId: string;
  handoffId: string;
  status: "open" | "resolved";
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();
  const next = status === "open" ? "resolved" : "open";
  return (
    <Button
      variant={status === "open" ? "secondary" : "ghost"}
      size="sm"
      disabled={pending || disabled}
      onClick={() => start(() => setHandoffStatus(botId, handoffId, next))}
    >
      {status === "open" ? <Check /> : <RotateCcw />}
      {status === "open" ? "Mark resolved" : "Reopen"}
    </Button>
  );
}
