import { prisma } from "../lib/prisma";
import type { AvitoAccount } from "@prisma/client";

const AVITO_API_BASE = "https://api.avito.ru";

/**
 * Получить действующий access_token для аккаунта Авито.
 * Если токен истёк (или отсутствует) - запрашивает новый по client_credentials
 * и сохраняет его в БД.
 */
export async function getValidAccessToken(account: AvitoAccount): Promise<string> {
  const now = new Date();
  if (account.accessToken && account.tokenExpiresAt && account.tokenExpiresAt > now) {
    return account.accessToken;
  }

  const res = await fetch(`${AVITO_API_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: account.clientId,
      client_secret: account.clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Не удалось получить токен Авито (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + (data.expires_in - 60) * 1000);

  await prisma.avitoAccount.update({
    where: { id: account.id },
    data: { accessToken: data.access_token, tokenExpiresAt: expiresAt },
  });

  return data.access_token;
}

/** Получить avito user_id (числовой идентификатор) владельца токена */
export async function fetchAvitoUserId(account: AvitoAccount): Promise<string> {
  const token = await getValidAccessToken(account);
  const res = await fetch(`${AVITO_API_BASE}/core/v1/accounts/self`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Не удалось получить данные аккаунта Авито (${res.status})`);
  }
  const data = (await res.json()) as { id: number };
  return String(data.id);
}

/** Подписать наш backend на вебхуки этого аккаунта (сообщения в реальном времени) */
export async function registerWebhook(account: AvitoAccount, webhookUrl: string): Promise<void> {
  const token = await getValidAccessToken(account);
  const res = await fetch(`${AVITO_API_BASE}/messenger/v3/webhook`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: webhookUrl }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Не удалось зарегистрировать вебхук (${res.status}): ${body}`);
  }
  await prisma.avitoAccount.update({
    where: { id: account.id },
    data: { webhookRegistered: true },
  });
}

/** Отправить текстовое сообщение в чат Авито */
export async function sendAvitoMessage(
  account: AvitoAccount,
  chatId: string,
  text: string
): Promise<{ id: string }> {
  if (!account.avitoUserId) {
    throw new Error("У аккаунта не заполнен avitoUserId - переподключите аккаунт");
  }
  const token = await getValidAccessToken(account);
  const res = await fetch(
    `${AVITO_API_BASE}/messenger/v1/accounts/${account.avitoUserId}/chats/${chatId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: { text }, type: "text" }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Не удалось отправить сообщение в Авито (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { id: string };
  return { id: data.id };
}

/** Отметить чат/сообщения прочитанными на стороне Авито */
export async function markAvitoChatRead(account: AvitoAccount, chatId: string): Promise<void> {
  if (!account.avitoUserId) return;
  const token = await getValidAccessToken(account);
  await fetch(
    `${AVITO_API_BASE}/messenger/v1/accounts/${account.avitoUserId}/chats/${chatId}/read`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}
