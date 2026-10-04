"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { createBot, type FormState } from "../actions";

const COLORS = ["#4f46e5", "#0ea5e9", "#059669", "#e11d48", "#ea580c", "#18181b"];

export function NewBotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createBot, undefined);
  const [color, setColor] = useState(COLORS[0]);

  return (
    <Card className="mt-6 p-6">
      <form action={action} className="space-y-5">
        <Field label="Business name" htmlFor="businessName" hint="The bot introduces itself as this business's assistant.">
          <Input id="businessName" name="businessName" required autoFocus placeholder="Acme Dental Clinic" />
        </Field>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-zinc-900">Brand colour</p>
          <input type="hidden" name="brandColor" value={color} />
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Use colour ${c}`}
                onClick={() => setColor(c)}
                className="size-8 rounded-full ring-offset-2 transition"
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined }}
              />
            ))}
          </div>
        </div>
        {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Continue
        </Button>
      </form>
    </Card>
  );
}
