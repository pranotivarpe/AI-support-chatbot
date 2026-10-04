"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { Bot } from "@/lib/db/schema";
import { deleteBot, updateBot, type FormState } from "../../../actions";

export function SettingsForm({ bot, readOnly }: { bot: Bot; readOnly: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateBot.bind(null, bot.id), undefined);
  const [threshold, setThreshold] = useState(bot.confidenceThreshold);
  const [color, setColor] = useState(bot.brandColor);
  const [deleting, startDelete] = useTransition();

  return (
    <div className="max-w-3xl space-y-6">
      <form action={action} className="space-y-6">
        <fieldset disabled={readOnly} className="space-y-6">
          <Card>
            <CardHeader title="Identity" description="How the bot presents itself to visitors." />
            <CardBody className="grid gap-5 sm:grid-cols-2">
              <Field label="Bot name" htmlFor="name">
                <Input id="name" name="name" defaultValue={bot.name} required />
              </Field>
              <Field label="Business name" htmlFor="businessName">
                <Input id="businessName" name="businessName" defaultValue={bot.businessName} required />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Welcome message" htmlFor="welcomeMessage">
                  <Textarea id="welcomeMessage" name="welcomeMessage" defaultValue={bot.welcomeMessage} rows={2} required />
                </Field>
              </div>
              <Field label="Brand colour" htmlFor="brandColor">
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-200 bg-white p-1"
                    aria-label="Pick brand colour"
                  />
                  <Input id="brandColor" name="brandColor" value={color} onChange={(e) => setColor(e.target.value)} />
                </div>
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Answer behaviour" description="Control how strictly the bot sticks to your content." />
            <CardBody className="space-y-5">
              <Field
                label={`Confidence threshold: ${threshold.toFixed(2)}`}
                htmlFor="confidenceThreshold"
                hint="Higher = the bot hands off to a human more often instead of risking a wrong answer. 0.5–0.6 works well with Gemini embeddings; run npm run rag:inspect to calibrate."
              >
                <input
                  id="confidenceThreshold"
                  name="confidenceThreshold"
                  type="range"
                  min={0.2}
                  max={0.9}
                  step={0.01}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-zinc-900"
                />
              </Field>
              <Field label="Fallback message" htmlFor="fallbackMessage" hint="Shown when the bot isn't confident, together with the talk-to-a-human options.">
                <Textarea id="fallbackMessage" name="fallbackMessage" defaultValue={bot.fallbackMessage} rows={2} required />
              </Field>
              <Field
                label="Extra instructions"
                htmlFor="instructions"
                hint="Tone of voice, things to always mention, topics to avoid. The bot still only answers from your content."
              >
                <Textarea
                  id="instructions"
                  name="instructions"
                  defaultValue={bot.instructions}
                  rows={3}
                  placeholder="e.g. Be warm and upbeat. Always suggest booking a free consultation when relevant."
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Leads & human handoff" />
            <CardBody className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Lead capture" htmlFor="leadCapture">
                  <Select id="leadCapture" name="leadCapture" defaultValue={bot.leadCapture}>
                    <option value="during">During chat: ask for email after the first answer (recommended)</option>
                    <option value="before">Before chat: require name and email to start</option>
                    <option value="off">Off</option>
                  </Select>
                </Field>
              </div>
              <Field label="Handoff email" htmlFor="handoffEmail" hint="Receives lead alerts and talk-to-a-human requests with the transcript.">
                <Input id="handoffEmail" name="handoffEmail" type="email" defaultValue={bot.handoffEmail ?? ""} placeholder="support@company.com" />
              </Field>
              <Field label="WhatsApp number" htmlFor="whatsappNumber" hint="Optional. International format.">
                <Input id="whatsappNumber" name="whatsappNumber" defaultValue={bot.whatsappNumber ?? ""} placeholder="+1 555 123 4567" />
              </Field>
            </CardBody>
          </Card>
        </fieldset>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending || readOnly}>
            {pending && <Loader2 className="animate-spin" />} Save changes
          </Button>
          {state?.ok && <p className="text-sm text-emerald-600">{state.ok}</p>}
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        </div>
      </form>

      {!readOnly && (
        <Card className="border-red-200">
          <CardHeader title="Danger zone" description="Deleting a bot removes its knowledge, conversations and leads permanently." />
          <CardBody>
            <Button
              variant="danger"
              disabled={deleting}
              onClick={() => {
                if (confirm(`Delete ${bot.name}? This cannot be undone.`)) startDelete(() => deleteBot(bot.id));
              }}
            >
              <Trash2 /> Delete chatbot
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
