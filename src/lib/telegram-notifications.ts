import { notifyAgent, getProfileIdByAgentId } from './telegram';
import pool from './db';

// 1. Новое сообщение от менеджера (handled in conversations/[id]/route.ts outbound)
//    — уже реализовано как outbound message

// 2. Статус лида изменён
export async function notifyLeadStatusChanged(
  agentId: string,
  leadName: string,
  oldStatus: string,
  newStatus: string
) {
  const profileId = await getProfileIdByAgentId(agentId);
  if (!profileId) return;

  const statusLabels: Record<string, string> = {
    new: 'Новый',
    contacted: 'Контакт',
    qualified: 'Квалифицирован',
    proposal: 'Предложение',
    negotiation: 'Переговоры',
    won: 'Договор заключен',
    lost: 'Потерян',
  };

  const text = [
    `Статус лида изменён`,
    `Клиент: ${leadName}`,
    `${statusLabels[oldStatus] || oldStatus} → ${statusLabels[newStatus] || newStatus}`,
  ].join('\n');

  await notifyAgent(profileId, text);
}

// 3. Выплата создана
export async function notifyPayoutCreated(
  agentId: string,
  amount: number,
  leadName: string
) {
  const profileId = await getProfileIdByAgentId(agentId);
  if (!profileId) return;

  const text = [
    `Новая выплата`,
    `Сумма: ${amount.toFixed(2)} ₽`,
    `За лид: ${leadName}`,
    `Статус: ожидает обработки`,
  ].join('\n');

  await notifyAgent(profileId, text);
}

// 4. Выплата одобрена/отклонена
export async function notifyPayoutStatusChanged(
  payoutId: string,
  newStatus: string,
  rejectionReason?: string
) {
  // Get payout with agent info
  const { rows } = await pool.query(
    `SELECT p.agent_id, p.amount, p.agent_name, a.user_id as profile_id
     FROM payouts p
     JOIN agents a ON a.id = p.agent_id
     WHERE p.id = $1`,
    [payoutId]
  );
  if (rows.length === 0) return;

  const payout = rows[0];
  const statusLabels: Record<string, string> = {
    processing: 'В обработке',
    paid: 'Оплачено',
    rejected: 'Отклонено',
  };

  const lines = [
    `Выплата: ${statusLabels[newStatus] || newStatus}`,
    `Сумма: ${parseFloat(payout.amount).toFixed(2)} ₽`,
  ];

  if (newStatus === 'rejected' && rejectionReason) {
    lines.push(`Причина: ${rejectionReason}`);
  }

  if (newStatus === 'paid') {
    lines.push('Средства будут зачислены в ближайшее время.');
  }

  await notifyAgent(payout.profile_id, lines.join('\n'));
}
