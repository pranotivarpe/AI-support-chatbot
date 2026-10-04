-- SupportPilot initial schema
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  name          text NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- A "bot" is one chatbot for one business / website.
CREATE TABLE bots (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                 text NOT NULL,
  business_name        text NOT NULL,
  welcome_message      text NOT NULL DEFAULT 'Hi! 👋 How can I help you today?',
  fallback_message     text NOT NULL DEFAULT 'I''m not completely sure about that. Would you like to talk to someone from our team?',
  instructions         text NOT NULL DEFAULT '',
  brand_color          text NOT NULL DEFAULT '#4f46e5',
  lead_capture         text NOT NULL DEFAULT 'during' CHECK (lead_capture IN ('off', 'before', 'during')),
  confidence_threshold real NOT NULL DEFAULT 0.5,
  handoff_email        text,
  whatsapp_number      text,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bots_user_idx ON bots(user_id);

-- A knowledge source: an uploaded PDF, a crawled website, or pasted text.
CREATE TABLE sources (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id      uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('pdf', 'url', 'text')),
  title       text NOT NULL,
  url         text,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  error       text,
  page_count  integer NOT NULL DEFAULT 0,
  chunk_count integer NOT NULL DEFAULT 0,
  char_count  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sources_bot_idx ON sources(bot_id);

-- Retrieval units. Embeddings are 768-d (Gemini gemini-embedding-001 / OpenAI text-embedding-3-small, both truncated to 768).
CREATE TABLE chunks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id      uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  source_id   uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  content     text NOT NULL,
  location    text,          -- page URL or "Page 4"
  page        integer,
  url         text,
  embedding   vector(768) NOT NULL,
  tsv         tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chunks_bot_idx ON chunks(bot_id);
CREATE INDEX chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX chunks_tsv_idx ON chunks USING gin (tsv);

CREATE TABLE leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id          uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  conversation_id uuid,
  name            text NOT NULL,
  email           text NOT NULL,
  phone           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX leads_bot_idx ON leads(bot_id, created_at DESC);

CREATE TABLE conversations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id            uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  visitor_id        text NOT NULL,
  lead_id           uuid REFERENCES leads(id) ON DELETE SET NULL,
  page_url          text,
  message_count     integer NOT NULL DEFAULT 0,
  fallback_count    integer NOT NULL DEFAULT 0,
  handoff_requested boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  last_message_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conversations_bot_idx ON conversations(bot_id, last_message_at DESC);

CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'assistant')),
  content         text NOT NULL,
  sources         jsonb NOT NULL DEFAULT '[]',
  confidence      real,
  is_fallback     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON messages(conversation_id, created_at);

CREATE TABLE handoffs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id          uuid NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  channel         text NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  name            text,
  email           text,
  message         text,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX handoffs_bot_idx ON handoffs(bot_id, created_at DESC);
