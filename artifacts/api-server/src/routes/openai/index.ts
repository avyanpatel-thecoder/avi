import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateOpenaiConversationBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";

const router = Router();

const AVI_SYSTEM_PROMPT = `You are AVI (Artificial Virtual Intelligence), a friendly and helpful AI assistant for kids and young learners. You are enthusiastic, encouraging, and always keep responses kid-friendly.

IMPORTANT RULES:
- Always be kind, encouraging, and age-appropriate
- Never respond to anything inappropriate, violent, or adult-themed. If someone asks something not kid-friendly, gently redirect them: "That's not something I can help with! Let's explore something fun instead. What would you like to learn?"
- Keep responses clear, fun, and easy to understand
- Use simple language suitable for kids aged 8-16

YOU CAN HELP WITH:
1. TECH & PROGRAMMING QUESTIONS: Answer questions like "What is AI?", "What is coding?", "How does the internet work?" in simple terms
2. MATH: Solve math problems like "12 / (3 + 1)" - show the steps clearly
3. CODING TERMS: When asked to "define [term]", give a clear, kid-friendly explanation with a simple example. E.g., "define function" → explain functions simply
4. JOKES: Tell clean, kid-friendly jokes when asked
5. VACATION SUGGESTIONS: Suggest fun travel destinations with reasons why they'd be amazing for families/kids
6. TRIVIA GAME: Play trivia with multiple choice questions on topics the user chooses. Ask one question at a time, wait for the answer, then reveal if they're right!
7. BOOK RECOMMENDATIONS: When asked for book recommendations, ask for the child's age and preferred topic/genre if not provided, then suggest 3-5 age-appropriate books with brief descriptions
8. GENERAL CHAT: Be a friendly, encouraging companion

Always respond in a warm, enthusiastic tone. Use emojis sparingly to make responses more fun for kids. Keep answers concise but complete.`;

// List all conversations
router.get("/openai/conversations", async (req, res) => {
  try {
    const allConversations = await db
      .select()
      .from(conversations)
      .orderBy(conversations.createdAt);
    res.json(allConversations);
  } catch (err) {
    req.log.error({ err }, "Failed to list conversations");
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

// Create a conversation
router.post("/openai/conversations", async (req, res) => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  try {
    const [conv] = await db
      .insert(conversations)
      .values({ title: parsed.data.title })
      .returning();
    res.status(201).json(conv);
  } catch (err) {
    req.log.error({ err }, "Failed to create conversation");
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// Get conversation with messages
router.get("/openai/conversations/:id", async (req, res) => {
  const parsed = GetOpenaiConversationParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  try {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, parsed.data.id));
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

// Delete conversation
router.delete("/openai/conversations/:id", async (req, res) => {
  const parsed = DeleteOpenaiConversationParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  try {
    const deleted = await db
      .delete(conversations)
      .where(eq(conversations.id, parsed.data.id))
      .returning();
    if (!deleted.length) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete conversation");
    res.status(500).json({ error: "Failed to delete" });
  }
});

// List messages in a conversation
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

// Send message (SSE streaming)
router.post("/openai/conversations/:id/messages", async (req, res) => {
  const paramsParsed = SendOpenaiMessageParams.safeParse(req.params);
  if (!paramsParsed.success)
    return res.status(400).json({ error: "Invalid id" });

  const bodyParsed = SendOpenaiMessageBody.safeParse(req.body);
  if (!bodyParsed.success)
    return res.status(400).json({ error: "Invalid request body" });

  const { id } = paramsParsed.data;
  const { content } = bodyParsed.data;

  try {
    // Save user message
    await db.insert(messages).values({
      conversationId: id,
      role: "user",
      content,
    });

    // Get conversation history for context
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    const chatMessages = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: AVI_SYSTEM_PROMPT },
        ...chatMessages,
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const chunkContent = chunk.choices[0]?.delta?.content;
      if (chunkContent) {
        fullResponse += chunkContent;
        res.write(`data: ${JSON.stringify({ content: chunkContent })}\n\n`);
      }
    }

    // Save assistant message
    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

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
