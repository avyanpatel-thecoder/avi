import { pool } from "@workspace/db";

export async function applyDatabaseMigrations(): Promise<void> {
  await pool.query(`
    ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS owner_user_id text
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS conversations_owner_user_id_idx
    ON conversations (owner_user_id)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS avi_accounts (
      id serial PRIMARY KEY,
      clerk_user_id text NOT NULL UNIQUE,
      email text,
      avi_name text NOT NULL DEFAULT 'AVI',
      avatar text NOT NULL DEFAULT '🤖',
      profile_bio text NOT NULL DEFAULT '',
      achievement_state jsonb NOT NULL
        DEFAULT '{"unlockedIds":[],"counters":{}}'::jsonb,
      parent_mode_enabled text NOT NULL DEFAULT 'false',
      daily_limit integer NOT NULL DEFAULT 100,
      parent_pin_hash text,
      parent_pin_salt text,
      daily_message_date date,
      daily_message_count integer NOT NULL DEFAULT 0,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    ALTER TABLE avi_accounts
    ADD COLUMN IF NOT EXISTS parent_pin_hash text
  `);

  await pool.query(`
    ALTER TABLE avi_accounts
    ADD COLUMN IF NOT EXISTS parent_pin_salt text
  `);
}