import OpenAI from "openai";
import { env } from "../../env";

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err: unknown): boolean {
  if (err instanceof OpenAI.APIError) {
    return err.status === 429;
  }
  return false;
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (isRateLimitError(err) && attempt < MAX_RETRIES - 1) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(`[OpenAI] Rate limited, retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(backoff);
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

export interface ListingAudit {
  overallScore: number;
  titleScore: number;
  descriptionScore: number;
  amenityScore: number;
  photoScore: number;
  suggestions: string[];
  competitorInsights: string;
}

export async function generateReviewResponse(review: {
  rating: number;
  text: string;
  guestName: string;
  propertyName: string;
}): Promise<string> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return withRetry(async () => {
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a professional property manager writing responses to guest reviews. 
- For ratings 4-5: Be grateful, warm, and appreciative. Highlight what they enjoyed.
- For ratings 1-3: Be empathetic, apologetic, and solution-oriented. Acknowledge concerns without being defensive.
- Keep responses under 200 words.
- Be personalized but professional. Sign off warmly.`,
          },
          {
            role: "user",
            content: `Write a response to this review for ${review.propertyName}:

Guest: ${review.guestName}
Rating: ${review.rating}/5
Review: ${review.text}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const usage = completion.usage;
      if (usage) {
        console.log(`[OpenAI] generateReviewResponse tokens: prompt=${usage.prompt_tokens} completion=${usage.completion_tokens} total=${usage.total_tokens}`);
      }

      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) {
        throw new Error("Empty response from OpenAI");
      }
      return text;
    } catch (err) {
      if (err instanceof OpenAI.APIError) {
        throw new Error(`OpenAI API error: ${err.message} (status: ${err.status})`);
      }
      throw err;
    }
  });
}

export async function auditListing(listing: {
  title: string;
  description: string;
  amenities: string[];
  photos: number;
  houseRules: string;
}): Promise<ListingAudit> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return withRetry(async () => {
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert vacation rental listing optimizer. Analyze listings and provide scores (0-100) and actionable suggestions.
Return a valid JSON object with: overallScore, titleScore, descriptionScore, amenityScore, photoScore (all numbers 0-100), suggestions (array of strings), competitorInsights (string).
Be specific and actionable. Consider SEO, conversion, and guest expectations.`,
          },
          {
            role: "user",
            content: `Audit this listing:

Title: ${listing.title || "(none)"}
Description: ${listing.description || "(none)"}
Amenities: ${listing.amenities?.length ? listing.amenities.join(", ") : "(none)"}
Number of photos: ${listing.photos}
House rules: ${listing.houseRules || "(none)"}

Return only valid JSON.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
      });

      const usage = completion.usage;
      if (usage) {
        console.log(`[OpenAI] auditListing tokens: prompt=${usage.prompt_tokens} completion=${usage.completion_tokens} total=${usage.total_tokens}`);
      }

      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) {
        throw new Error("Empty response from OpenAI");
      }

      const parsed = JSON.parse(text) as ListingAudit;
      if (
        typeof parsed.overallScore !== "number" ||
        !Array.isArray(parsed.suggestions) ||
        typeof parsed.competitorInsights !== "string"
      ) {
        throw new Error("Invalid ListingAudit structure from OpenAI");
      }
      return parsed;
    } catch (err) {
      if (err instanceof OpenAI.APIError) {
        throw new Error(`OpenAI API error: ${err.message} (status: ${err.status})`);
      }
      throw err;
    }
  });
}

export async function detectComplaint(message: string): Promise<{
  isComplaint: boolean;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  suggestedResponse: string;
}> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return withRetry(async () => {
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You analyze guest messages for complaint indicators. Categories: maintenance, cleanliness, noise, amenity, safety, other.
Severity: low (minor inconvenience), medium (needs attention), high (urgent), critical (safety/legal).
Return a valid JSON object with: isComplaint (boolean), severity ("low"|"medium"|"high"|"critical"), category (string), suggestedResponse (short professional response).
If not a complaint, set isComplaint: false, severity: "low", category: "none".`,
          },
          {
            role: "user",
            content: `Analyze this guest message:\n\n${message}\n\nReturn only valid JSON.`,
          },
        ],
        temperature: 0.2,
        max_tokens: 400,
      });

      const usage = completion.usage;
      if (usage) {
        console.log(`[OpenAI] detectComplaint tokens: prompt=${usage.prompt_tokens} completion=${usage.completion_tokens} total=${usage.total_tokens}`);
      }

      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) {
        throw new Error("Empty response from OpenAI");
      }

      const parsed = JSON.parse(text);
      if (typeof parsed.isComplaint !== "boolean") {
        throw new Error("Invalid detectComplaint structure from OpenAI");
      }
      return parsed;
    } catch (err) {
      if (err instanceof OpenAI.APIError) {
        throw new Error(`OpenAI API error: ${err.message} (status: ${err.status})`);
      }
      throw err;
    }
  });
}

export async function generateGuestMessage(context: {
  guestName: string;
  checkIn: string;
  checkOut: string;
  propertyName: string;
  type: "welcome" | "checkout_reminder" | "review_request" | "issue_followup";
}): Promise<string> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return withRetry(async () => {
    try {
      const typeInstructions: Record<string, string> = {
        welcome: "A warm welcome message for arriving guests. Include check-in details, key access if relevant, and contact info.",
        checkout_reminder: "A friendly reminder about checkout time and procedures. Be concise.",
        review_request: "A polite request for a review after their stay. Thank them and ask for feedback.",
        issue_followup: "A follow-up message after resolving an issue. Show care and ask if they need anything else.",
      };

      const completion = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You write short, professional guest messages for property management. Be warm but concise. Personalize with guest name and property.`,
          },
          {
            role: "user",
            content: `Generate a ${context.type} message for:
- Guest: ${context.guestName}
- Property: ${context.propertyName}
- Check-in: ${context.checkIn}
- Check-out: ${context.checkOut}

${typeInstructions[context.type] || ""}

Write the message only, no meta-commentary.`,
          },
        ],
        temperature: 0.6,
        max_tokens: 250,
      });

      const usage = completion.usage;
      if (usage) {
        console.log(`[OpenAI] generateGuestMessage tokens: prompt=${usage.prompt_tokens} completion=${usage.completion_tokens} total=${usage.total_tokens}`);
      }

      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) {
        throw new Error("Empty response from OpenAI");
      }
      return text;
    } catch (err) {
      if (err instanceof OpenAI.APIError) {
        throw new Error(`OpenAI API error: ${err.message} (status: ${err.status})`);
      }
      throw err;
    }
  });
}
