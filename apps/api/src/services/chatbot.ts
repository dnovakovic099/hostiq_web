import OpenAI from "openai";
import { prisma } from "@hostiq/db";
import { env } from "../env";

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const CHATBOT_MODEL = "gpt-4o-mini";

interface AiSuggestion {
  suggestedResponse: string;
  confidence: number;
  category: string;
  needsHuman: boolean;
  actionItems: string[];
}

/**
 * Generate an AI suggestion for a guest message thread.
 * Loads property context, reservation details, and conversation history.
 */
export async function generateSuggestion(threadId: string): Promise<AiSuggestion | null> {
  if (!env.OPENAI_API_KEY) {
    console.warn("[Chatbot] OPENAI_API_KEY not configured, skipping suggestion");
    return null;
  }

  try {
    // Load thread with all context
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        property: true,
        reservation: { include: { guest: true } },
        guest: true,
      },
    });

    if (!thread) {
      console.error(`[Chatbot] Thread ${threadId} not found`);
      return null;
    }

    // Load property snapshot for house rules, amenities, etc.
    let propertyContext = "";
    if (thread.property) {
      const snapshot = await prisma.listingSnapshot.findFirst({
        where: { propertyId: thread.property.id },
        orderBy: { snapshotDate: "desc" },
      });

      propertyContext = [
        `Property: ${thread.property.name}`,
        thread.property.address ? `Address: ${thread.property.address}` : null,
        thread.property.bedrooms ? `Bedrooms: ${thread.property.bedrooms}` : null,
        thread.property.bathrooms ? `Bathrooms: ${thread.property.bathrooms}` : null,
        thread.property.maxGuests ? `Max Guests: ${thread.property.maxGuests}` : null,
        snapshot?.amenities ? `Amenities: ${JSON.stringify(snapshot.amenities)}` : null,
        snapshot?.houseRules ? `House Rules: ${snapshot.houseRules}` : null,
        snapshot?.description ? `Description: ${snapshot.description}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    }

    // Reservation context
    let reservationContext = "";
    if (thread.reservation) {
      const r = thread.reservation;
      const guestName = r.guest?.name || thread.guest?.name || "Guest";
      reservationContext = [
        `Guest Name: ${guestName}`,
        `Check-in: ${r.checkIn.toISOString().split("T")[0]}`,
        `Check-out: ${r.checkOut.toISOString().split("T")[0]}`,
        `Nights: ${r.nights}`,
        r.guestCount ? `Guest Count: ${r.guestCount}` : null,
        r.channel ? `Booking Channel: ${r.channel}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    }

    // Conversation history
    const conversationHistory = thread.messages
      .map((m) => `[${m.senderType}] ${m.content}`)
      .join("\n\n");

    const lastGuestMessage = [...thread.messages]
      .reverse()
      .find((m) => m.senderType === "GUEST");

    if (!lastGuestMessage) {
      console.log(`[Chatbot] No guest message in thread ${threadId}, skipping`);
      return null;
    }

    const systemPrompt = `You are a professional, warm, and helpful property manager assistant for a short-term rental company called Luxury Lodging.

Your job: Analyze the guest's latest message and generate a suggested response.

${propertyContext ? `## Property Info\n${propertyContext}\n` : ""}
${reservationContext ? `## Reservation Info\n${reservationContext}\n` : ""}

## Rules
- Be warm, professional, and concise
- Use the guest's name when available
- If you know the answer (check-in info, WiFi, parking, amenities, house rules), provide it confidently
- If the message is a complaint, maintenance issue, refund request, or early check-in/late checkout request, flag it as needing human review
- Never make up information you don't have (e.g., door codes, WiFi passwords — say you'll confirm and get back to them)
- Keep responses under 150 words
- Sign off warmly

## Response Format
Return a JSON object:
{
  "suggestedResponse": "Your suggested message to the guest",
  "confidence": 0.0-1.0,
  "category": "check_in_info|amenities|house_rules|parking|wifi|local_recs|complaint|maintenance|refund|early_checkin|late_checkout|general_inquiry|greeting|other",
  "needsHuman": true/false,
  "actionItems": ["list of follow-up actions if any"]
}

Categories that ALWAYS need human review (needsHuman: true):
- complaint, maintenance, refund, early_checkin, late_checkout

Return ONLY valid JSON.`;

    const completion = await client.chat.completions.create({
      model: CHATBOT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `## Conversation History\n${conversationHistory}\n\n## Latest Guest Message\n${lastGuestMessage.content}\n\nGenerate a suggested response.`,
        },
      ],
      temperature: 0.4,
      max_tokens: 500,
    });

    const usage = completion.usage;
    if (usage) {
      console.log(
        `[Chatbot] generateSuggestion tokens: prompt=${usage.prompt_tokens} completion=${usage.completion_tokens}`
      );
    }

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      console.error("[Chatbot] Empty response from OpenAI");
      return null;
    }

    // Parse JSON (handle markdown code blocks)
    const jsonStr = text.replace(/^```json\s*/, "").replace(/```\s*$/, "");
    const result = JSON.parse(jsonStr) as AiSuggestion;

    // Save to MessageAiStatus
    await prisma.messageAiStatus.upsert({
      where: { messageId: lastGuestMessage.id },
      update: {
        provider: CHATBOT_MODEL,
        confidence: result.confidence,
        category: result.category,
        actionItems: {
          suggestedResponse: result.suggestedResponse,
          items: result.actionItems,
        },
        escalationReason: result.needsHuman ? result.category : null,
        responded: false,
      },
      create: {
        messageId: lastGuestMessage.id,
        provider: CHATBOT_MODEL,
        confidence: result.confidence,
        category: result.category,
        actionItems: {
          suggestedResponse: result.suggestedResponse,
          items: result.actionItems,
        },
        escalationReason: result.needsHuman ? result.category : null,
        responded: false,
      },
    });

    // Update thread status
    await prisma.messageThread.update({
      where: { id: threadId },
      data: {
        status: result.needsHuman ? "NEEDS_ATTENTION" : "AUTO_REPLIED",
      },
    });

    console.log(
      `[Chatbot] Generated suggestion for thread ${threadId}: category=${result.category}, needsHuman=${result.needsHuman}, confidence=${result.confidence}`
    );

    return result;
  } catch (err) {
    const error = err as Error;
    console.error(`[Chatbot] Failed to generate suggestion for thread ${threadId}:`, error.message);
    return null;
  }
}

/**
 * Process a new guest message: generate AI suggestion + dispatch webhook.
 */
export async function processNewGuestMessage(
  threadId: string,
  messageId: string
): Promise<void> {
  console.log(`[Chatbot] Processing new guest message ${messageId} in thread ${threadId}`);

  const suggestion = await generateSuggestion(threadId);

  if (suggestion) {
    // Dispatch webhook
    await dispatchWebhook(threadId, messageId, suggestion);
  }
}

/**
 * Dispatch webhook to configured URLs with message + suggestion data.
 */
async function dispatchWebhook(
  threadId: string,
  messageId: string,
  suggestion: AiSuggestion
): Promise<void> {
  const webhookUrls = env.CHATBOT_WEBHOOK_URLS;
  if (!webhookUrls) return;

  const urls = webhookUrls
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  if (urls.length === 0) return;

  // Load full context for webhook payload
  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 5 },
      property: { select: { id: true, name: true, address: true } },
      reservation: {
        select: {
          id: true,
          checkIn: true,
          checkOut: true,
          channel: true,
          status: true,
        },
      },
      guest: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  const payload = {
    event: "chatbot.suggestion",
    timestamp: new Date().toISOString(),
    thread: {
      id: threadId,
      status: thread?.status,
    },
    message: {
      id: messageId,
      content: thread?.messages.find((m) => m.id === messageId)?.content,
    },
    suggestion: {
      response: suggestion.suggestedResponse,
      confidence: suggestion.confidence,
      category: suggestion.category,
      needsHuman: suggestion.needsHuman,
      actionItems: suggestion.actionItems,
    },
    property: thread?.property ?? null,
    guest: thread?.guest ?? null,
    reservation: thread?.reservation ?? null,
  };

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
      console.log(`[Chatbot] Webhook dispatched to ${url}: ${res.status}`);
    } catch (err) {
      console.error(`[Chatbot] Webhook dispatch failed for ${url}:`, (err as Error).message);
    }
  }
}
