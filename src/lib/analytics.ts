import "server-only";
import { pg } from "@/lib/db";

export type UnansweredQuestion = { question: string; times: number; last: Date };

// Questions the bot couldn't answer = content gaps to fill.
export function getUnansweredQuestions(botId: string, limit?: number) {
  return pg<UnansweredQuestion[]>`
    SELECT q.content AS question, count(*)::int AS times, max(a.created_at) AS last
    FROM messages a
    JOIN conversations c ON c.id = a.conversation_id
    JOIN LATERAL (
      SELECT content FROM messages u
      WHERE u.conversation_id = a.conversation_id AND u.role = 'user' AND u.created_at <= a.created_at
      ORDER BY u.created_at DESC LIMIT 1
    ) q ON true
    WHERE c.bot_id = ${botId} AND a.is_fallback
    GROUP BY lower(q.content), q.content
    ORDER BY times DESC, last DESC
    ${limit ? pg`LIMIT ${limit}` : pg``}`;
}
