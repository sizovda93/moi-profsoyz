-- T3.5 Data Fix: seed data consistency
-- Fixes: agent counters, orphan documents, conversation last_message sync

-- 1. Recalculate active_leads for all agents
UPDATE agents SET active_leads = (
  SELECT count(*) FROM leads
  WHERE leads.assigned_agent_id = agents.id
    AND leads.status NOT IN ('won', 'lost')
);

-- 2. Recalculate total_leads for all agents
UPDATE agents SET total_leads = (
  SELECT count(*) FROM leads
  WHERE leads.assigned_agent_id = agents.id
);

-- 3. Recalculate total_revenue from actual paid payouts
UPDATE agents SET total_revenue = COALESCE((
  SELECT sum(amount) FROM payouts
  WHERE payouts.agent_id = agents.id
    AND payouts.status = 'paid'
), 0);

-- 4. Delete seed documents that have no real file (empty file_url)
DELETE FROM documents WHERE file_url IS NULL OR file_url = '';

-- 5. Sync conversations.last_message and last_message_at from actual messages
UPDATE conversations SET
  last_message = sub.text,
  last_message_at = sub.created_at
FROM (
  SELECT DISTINCT ON (conversation_id)
    conversation_id, text, created_at
  FROM messages
  ORDER BY conversation_id, created_at DESC
) sub
WHERE conversations.id = sub.conversation_id;

-- 6. Clear last_message for conversations that have zero messages
UPDATE conversations SET
  last_message = NULL,
  last_message_at = NULL
WHERE id NOT IN (SELECT DISTINCT conversation_id FROM messages);
