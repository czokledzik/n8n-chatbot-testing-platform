import "server-only";
import { z } from "zod";
import { getOpenAI, MODEL } from "@/lib/openai";
import { getSettings, languageInstruction } from "@/lib/settings";
import { MAX_TURNS } from "@/lib/constants";

const responseSchema = z.object({
  message: z.string().min(1),
  done: z.boolean(),
});

export type ChatTurn = { role: "user" | "bot"; content: string };

export type TestCaseLite = {
  title: string;
  persona: string;
  goal: string;
  successCriteria: string;
};

export type ReplayContext = {
  previousUserTurns: string[];
  runComments: string[];
  messageComments: { role: "user" | "bot"; content: string; comment: string }[];
};

export async function nextUserMessage(
  testCase: TestCaseLite,
  history: ChatTurn[],
  replay?: ReplayContext,
): Promise<{ message: string; done: boolean }> {
  const openai = await getOpenAI();
  const { language } = await getSettings();

  const replayBlock = replay
    ? `\n\nRE-TEST CONTEXT — this is a re-run of a previous test session on a new bot version. Probe the same issues the client flagged before.\n\nPREVIOUS USER MESSAGES (in order):\n${replay.previousUserTurns.map((m, i) => `${i + 1}. ${m}`).join("\n")}${
        replay.runComments.length
          ? `\n\nCLIENT COMMENTS ON THE WHOLE PREVIOUS SESSION:\n${replay.runComments.map((c) => `- ${c}`).join("\n")}`
          : ""
      }${
        replay.messageComments.length
          ? `\n\nCLIENT COMMENTS ON SPECIFIC MESSAGES:\n${replay.messageComments
              .map(
                (mc) =>
                  `- on ${mc.role.toUpperCase()} message "${mc.content.slice(0, 120)}${mc.content.length > 120 ? "…" : ""}": ${mc.comment}`,
              )
              .join("\n")}`
          : ""
      }\n\nYour job: ask questions covering the SAME ground as before — same intent, similar phrasing where natural — so we can see if the new bot version handles the same problems better. Do not copy the previous messages verbatim if it feels unnatural; rephrase but stay on-topic.`
    : "";

  const systemPrompt = `You are roleplaying a real human user talking to a chatbot. Stay strictly in character.

LANGUAGE: ${languageInstruction(language)} Your "message" field MUST be written in that language.

PERSONA: ${testCase.persona}

GOAL: ${testCase.goal}

SUCCESS CRITERIA (when to stop): ${testCase.successCriteria}

Rules:
- Write ONE short, natural user message — like a real person typing in chat. No meta commentary, no quotes, no explanations.
- Pursue the goal across multiple turns. Push back, clarify, or redirect when needed.
- Set "done": true ONLY when the goal is fully achieved OR the bot has clearly failed and another message would not help.
- Hard cap: ${MAX_TURNS} user messages total. The conversation will be cut off after that.
- If history is empty, send the OPENING message that starts the conversation.${replayBlock}`;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  for (const turn of history) {
    messages.push({
      role: turn.role === "user" ? "assistant" : "user",
      content: turn.content,
    });
  }

  const completion = await openai.chat.completions.create({
    model: MODEL,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "user_turn",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            message: { type: "string" },
            done: { type: "boolean" },
          },
          required: ["message", "done"],
        },
      },
    },
    messages,
  });

  const raw = completion.choices[0]?.message.content;
  if (!raw) throw new Error("Simulator returned empty response");
  return responseSchema.parse(JSON.parse(raw));
}
