import { env } from "../../env";

const MESSAGES_URL = `${env.OPENPHONE_BASE_URL}/messages`;

function normalizePhone(to: string): string {
  const digits = to.replace(/\D/g, "");
  if (digits.length === 10 && !to.startsWith("+")) {
    return `+1${digits}`;
  }
  if (!to.startsWith("+")) {
    return `+${digits}`;
  }
  return to;
}

async function sendMessageRequest(content: string, to: string): Promise<{ id: string }> {
  const apiKey = env.OPENPHONE_API_KEY;
  const fromNumber = env.OPENPHONE_PHONE_NUMBER;

  if (!apiKey) {
    throw new Error("OPENPHONE_API_KEY is not configured");
  }
  if (!fromNumber) {
    throw new Error("OPENPHONE_PHONE_NUMBER is not configured");
  }

  const res = await fetch(MESSAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromNumber.startsWith("+") ? fromNumber : `+${fromNumber.replace(/\D/g, "")}`,
      to: [normalizePhone(to)],
      content,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenPhone API error ${res.status}: ${errBody}`);
  }

  const data = (await res.json()) as { data?: { id?: string } };
  const id = data.data?.id ?? "";
  return { id };
}

export async function sendSMS(to: string, message: string): Promise<{ id: string }> {
  return sendMessageRequest(message, to);
}

export async function sendEscalationSMS(
  to: string,
  escalation: { type: string; summary: string; propertyName: string }
): Promise<void> {
  const message = `[HostIQ Alert] ${escalation.type} at ${escalation.propertyName}: ${escalation.summary}`;
  await sendSMS(to, message);
}

export async function sendCleaningReminder(
  to: string,
  cleaning: { propertyName: string; date: string; timeWindow: string }
): Promise<void> {
  const message = `Reminder: Cleaning scheduled for ${cleaning.propertyName} on ${cleaning.date} (${cleaning.timeWindow}).`;
  await sendSMS(to, message);
}
