import { Router } from "express";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  aviAccounts,
  conversations,
  messages,
  type AviAchievementState,
  type AviAccount,
} from "@workspace/db";
import { getClerkUserId, requireAuth } from "../../lib/auth";

const router = Router();

const DEFAULT_ACHIEVEMENTS: AviAchievementState = {
  unlockedIds: [],
  counters: {},
};

function sessionIdFromRequest(req: Parameters<Parameters<typeof router.post>[1]>[0]): string | null {
  const value = req.headers["x-session-id"];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function ensureAccount(userId: string): Promise<AviAccount> {
  const [existing] = await db
    .select()
    .from(aviAccounts)
    .where(eq(aviAccounts.clerkUserId, userId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(aviAccounts)
    .values({ clerkUserId: userId, achievementState: DEFAULT_ACHIEVEMENTS })
    .onConflictDoNothing({ target: aviAccounts.clerkUserId })
    .returning();
  if (created) return created;

  const [concurrentAccount] = await db
    .select()
    .from(aviAccounts)
    .where(eq(aviAccounts.clerkUserId, userId))
    .limit(1);
  if (!concurrentAccount) {
    throw new Error("AVI account could not be created");
  }
  return concurrentAccount;
}

async function accountStats(userId: string) {
  const [{ conversationCount }] = await db
    .select({ conversationCount: count() })
    .from(conversations)
    .where(eq(conversations.ownerUserId, userId));
  const [{ messageCount }] = await db
    .select({ messageCount: count() })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(eq(conversations.ownerUserId, userId));

  return { conversationCount, messageCount };
}

function accountResponse(account: AviAccount, stats: { conversationCount: number; messageCount: number }) {
  return {
    id: account.id,
    aviName: account.aviName,
    avatar: account.avatar,
    profileBio: account.profileBio,
    isPlus: true,
    parentModeEnabled: account.parentModeEnabled === "true",
    dailyLimit: account.dailyLimit,
    dailyMessageCount: account.dailyMessageCount,
    achievementState: account.achievementState ?? DEFAULT_ACHIEVEMENTS,
    stats,
  };
}

router.get("/account/me", requireAuth, async (req, res): Promise<void> => {
  const userId = getClerkUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const account = await ensureAccount(userId);
    res.json(accountResponse(account, await accountStats(userId)));
  } catch (err) {
    req.log.error({ err }, "Failed to load AVI Plus account");
    res.status(500).json({ error: "Failed to load account" });
  }
});

router.patch("/account/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = getClerkUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { aviName, avatar, profileBio } = req.body ?? {};
  if (
    (aviName !== undefined && (typeof aviName !== "string" || aviName.trim().length < 1 || aviName.trim().length > 30)) ||
    (avatar !== undefined && (typeof avatar !== "string" || avatar.length < 1 || avatar.length > 12)) ||
    (profileBio !== undefined && (typeof profileBio !== "string" || profileBio.length > 160))
  ) {
    res.status(400).json({ error: "Invalid profile details" });
    return;
  }

  try {
    await ensureAccount(userId);
    const [updated] = await db
      .update(aviAccounts)
      .set({
        ...(aviName !== undefined ? { aviName: aviName.trim() } : {}),
        ...(avatar !== undefined ? { avatar } : {}),
        ...(profileBio !== undefined ? { profileBio: profileBio.trim() } : {}),
      })
      .where(eq(aviAccounts.clerkUserId, userId))
      .returning();
    res.json(accountResponse(updated, await accountStats(userId)));
  } catch (err) {
    req.log.error({ err }, "Failed to update AVI Plus profile");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.patch("/account/settings", requireAuth, async (req, res): Promise<void> => {
  const userId = getClerkUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { parentModeEnabled, dailyLimit } = req.body ?? {};
  if (
    (parentModeEnabled !== undefined && typeof parentModeEnabled !== "boolean") ||
    (dailyLimit !== undefined &&
      (!Number.isInteger(dailyLimit) || dailyLimit < 20 || dailyLimit > 500))
  ) {
    res.status(400).json({ error: "Invalid account settings" });
    return;
  }

  try {
    await ensureAccount(userId);
    const [updated] = await db
      .update(aviAccounts)
      .set({
        ...(parentModeEnabled !== undefined
          ? { parentModeEnabled: parentModeEnabled ? "true" : "false" }
          : {}),
        ...(dailyLimit !== undefined ? { dailyLimit } : {}),
      })
      .where(eq(aviAccounts.clerkUserId, userId))
      .returning();
    res.json(accountResponse(updated, await accountStats(userId)));
  } catch (err) {
    req.log.error({ err }, "Failed to update AVI Plus settings");
    res.status(500).json({ error: "Failed to update settings" });
  }
});

router.post("/account/link-anonymous", requireAuth, async (req, res): Promise<void> => {
  const userId = getClerkUserId(req);
  const sessionId = sessionIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!sessionId) {
    res.status(400).json({ error: "Missing anonymous session" });
    return;
  }

  try {
    await ensureAccount(userId);
    const linked = await db
      .update(conversations)
      .set({ ownerUserId: userId })
      .where(and(eq(conversations.sessionId, sessionId), isNull(conversations.ownerUserId)))
      .returning({ id: conversations.id });
    res.json({ linkedCount: linked.length });
  } catch (err) {
    req.log.error({ err }, "Failed to link anonymous AVI conversations");
    res.status(500).json({ error: "Failed to link conversations" });
  }
});

router.post("/account/achievements/sync", requireAuth, async (req, res): Promise<void> => {
  const userId = getClerkUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const incoming = req.body?.achievementState;
  if (
    !incoming ||
    !Array.isArray(incoming.unlockedIds) ||
    typeof incoming.counters !== "object" ||
    incoming.counters === null ||
    incoming.unlockedIds.some((id: unknown) => typeof id !== "string") ||
    Object.values(incoming.counters).some(
      (value) => typeof value !== "number" || !Number.isFinite(value),
    )
  ) {
    res.status(400).json({ error: "Invalid achievement state" });
    return;
  }

  try {
    const account = await ensureAccount(userId);
    const current = account.achievementState ?? DEFAULT_ACHIEVEMENTS;
    const merged: AviAchievementState = {
      unlockedIds: Array.from(new Set([...current.unlockedIds, ...incoming.unlockedIds])),
      counters: Object.fromEntries(
        Array.from(
          new Set([
            ...Object.keys(current.counters),
            ...Object.keys(incoming.counters),
          ]),
        ).map((key) => [
          key,
          Math.max(current.counters[key] ?? 0, incoming.counters[key] ?? 0),
        ]),
      ),
    };
    const [updated] = await db
      .update(aviAccounts)
      .set({ achievementState: merged })
      .where(eq(aviAccounts.clerkUserId, userId))
      .returning();
    res.json({ achievementState: updated.achievementState });
  } catch (err) {
    req.log.error({ err }, "Failed to sync AVI achievements");
    res.status(500).json({ error: "Failed to sync achievements" });
  }
});

export default router;