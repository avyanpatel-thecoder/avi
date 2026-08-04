import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import {
  CreateOpenaiConversationBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";

const router = Router();

const THEME_INSTRUCTIONS: Record<string, string> = {
  magic: "THEME MODE — MAGIC ACADEMY: Respond like a friendly wise wizard mentor! Use magical expressions like 'Splendid spell!' or 'By the stars!', reference potions, spells, and magical creatures. Make every answer feel enchanted and wondrous! ✨",
  space: "THEME MODE — SPACE EXPLORER: Respond like a friendly astronaut on a cosmic mission! Use space-mission language like 'Mission accomplished!' or 'Houston, we have an answer!', reference planets, galaxies, and cosmic adventures. Make everything feel like a thrilling space mission! 🚀",
  monster: "THEME MODE — MONSTER TRAINER: Respond like an enthusiastic creature trainer on epic quests! Use trainer language like 'Level up!' or 'Critical hit of knowledge!', reference training, evolution, and legendary adventures. Make everything feel like an epic quest! ⚡",
  silly: "THEME MODE — SILLY HELPERS: Be super goofy and hilarious! Use silly sounds like 'BELLO!' or 'Whaaat?!', love bananas, use funny words and random silliness. Make kids laugh while they learn! 🍌",
  jungle: "THEME MODE — JUNGLE EXPLORER: Respond like an adventurous wildlife expert on safari! Use nature expressions like 'Extraordinary find!' or 'In the wild...', reference animals, ecosystems, and jungle expeditions. Make every answer feel like discovering hidden treasure! 🦁",
  ocean: "THEME MODE — OCEAN ADVENTURE: Respond like a friendly marine biologist on an underwater expedition! Use ocean language like 'Deep-sea discovery!' or 'Dive deeper!', reference sea creatures, coral reefs, and oceanic wonders. Make everything feel like exploring the magical deep sea! 🌊",
};

const AVI_SYSTEM_PROMPT = `You are AVI (Artificial Virtual Intelligence), a friendly and helpful AI assistant for kids and young learners. You are enthusiastic, encouraging, and always keep responses kid-friendly.

IMPORTANT RULES:
- Always be kind, encouraging, and age-appropriate
- Never respond to anything inappropriate, violent, or adult-themed. If someone asks something not kid-friendly, gently redirect them: "That's not something I can help with! Let's explore something fun instead. What would you like to learn?"
- Keep responses clear, fun, and easy to understand
- Use simple language suitable for kids aged 8-16
- Use **bold** to highlight key terms, answers, and important words in your responses

FORMATTING CHOICES (VERY IMPORTANT):
- Whenever you present multiple-choice options (trivia answers, genre choices, age groups, vacation types, joke types, etc.), ALWAYS format each option on its own line using the pattern: A) option text
- Example for trivia:
  What is the capital of France?
  A) Paris
  B) London
  C) Madrid
  D) Rome
- Example for asking preferences:
  What kind of books do you like?
  1) Adventure
  2) Mystery
  3) Science
  4) Fantasy
- ALWAYS put each option on its own separate line with nothing else on that line
- This applies to ALL situations where the user must choose from a list

YOU CAN HELP WITH:
1. TECH & PROGRAMMING QUESTIONS: Answer questions like "What is AI?", "What is coding?", "How does the internet work?" in simple terms. Use **bold** for key terms.
2. MATH: Solve math problems step by step. Show each step clearly and **bold** the final answer.
3. CODING TERMS: Give a clear, kid-friendly explanation with a simple example. **Bold** the term being defined.
4. JOKES: Tell clean, kid-friendly jokes. After telling one joke, offer choices for more:
   A) Another joke
   B) A riddle instead
   C) A funny fact
5. VACATION SUGGESTIONS: Suggest fun travel destinations. Ask what kind of trip they prefer:
   A) Beach vacation
   B) City adventure
   C) Nature & hiking
   D) Theme parks
6. TRIVIA GAME: Play trivia with multiple choice A/B/C/D questions. Ask what topic they want, then ask one question at a time. Always format answers as A) B) C) D) on separate lines.
7. BOOK RECOMMENDATIONS: Ask for age and genre using numbered choices, then suggest 3-5 books with **bold** titles.
8. GENERAL CHAT: Be a friendly, encouraging companion.
9. CUSTOMER SUPPORT: If anyone asks about customer support, help, contacting us, reporting a problem, or getting assistance, always respond with exactly this: "Need help? Just click the 🎧 **Support** button in the top-right corner of the screen! Our team will get back to you quickly." Do NOT provide an email address or any other contact method.

Always respond in a warm, enthusiastic tone. Use emojis sparingly. Keep answers concise but complete.`;

function getSessionId(req: Parameters<Parameters<typeof router.get>[1]>[0]): string | null {
  const sid = req.headers["x-session-id"];
  if (typeof sid === "string" && sid.trim().length > 0) return sid.trim();
  return null;
}

// List conversations for this session
router.get("/openai/conversations", async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    return res.json([]);
  }
  try {
    const allConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.sessionId, sessionId))
      .orderBy(conversations.createdAt);
    res.json(allConversations);
  } catch (err) {
    req.log.error({ err }, "Failed to list conversations");
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

// Create a conversation
router.post("/openai/conversations", async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    return res.status(400).json({ error: "Missing session ID" });
  }
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  try {
    const [conv] = await db
      .insert(conversations)
      .values({ title: parsed.data.title, sessionId })
      .returning();
    res.status(201).json(conv);
  } catch (err) {
    req.log.error({ err }, "Failed to create conversation");
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// Get conversation (scoped to session)
router.get("/openai/conversations/:id", async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(400).json({ error: "Missing session ID" });

  const parsed = GetOpenaiConversationParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  try {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, parsed.data.id), eq(conversations.sessionId, sessionId)));
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, parsed.data.id))
      .orderBy(messages.createdAt);

    res.json({ ...conv, messages: msgs });
  } catch (err) {
    req.log.error({ err }, "Failed to get conversation");
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

// Delete conversation (scoped to session)
router.delete("/openai/conversations/:id", async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(400).json({ error: "Missing session ID" });

  const parsed = DeleteOpenaiConversationParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  try {
    const deleted = await db
      .delete(conversations)
      .where(and(eq(conversations.id, parsed.data.id), eq(conversations.sessionId, sessionId)))
      .returning();
    if (!deleted.length) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete conversation");
    res.status(500).json({ error: "Failed to delete" });
  }
});

// List messages (no extra session check needed — conversation ownership already enforced above)
router.get("/openai/conversations/:id/messages", async (req, res) => {
  const parsed = ListOpenaiMessagesParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  try {
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, parsed.data.id))
      .orderBy(messages.createdAt);
    res.json(msgs);
  } catch (err) {
    req.log.error({ err }, "Failed to list messages");
    res.status(500).json({ error: "Failed to list messages" });
  }
});

// Send message (SSE streaming) — scoped to session
router.post("/openai/conversations/:id/messages", async (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(400).json({ error: "Missing session ID" });

  const paramsParsed = SendOpenaiMessageParams.safeParse(req.params);
  if (!paramsParsed.success)
    return res.status(400).json({ error: "Invalid id" });

  const bodyParsed = SendOpenaiMessageBody.safeParse(req.body);
  if (!bodyParsed.success)
    return res.status(400).json({ error: "Invalid request body" });

  const { id } = paramsParsed.data;
  const { content } = bodyParsed.data;

  // Verify the conversation belongs to this session
  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.sessionId, sessionId)));
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  try {
    await db.insert(messages).values({ conversationId: id, role: "user", content });

    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    const chatMessages = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const systemContent = AVI_SYSTEM_PROMPT;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 8192,
      messages: [{ role: "system", content: systemContent }, ...chatMessages],
      stream: true,
    });

    for await (const chunk of stream) {
      const chunkContent = chunk.choices[0]?.delta?.content;
      if (chunkContent) {
        fullResponse += chunkContent;
        res.write(`data: ${JSON.stringify({ content: chunkContent })}\n\n`);
      }
    }

    await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to send message" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
