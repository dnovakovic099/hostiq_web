import { prisma } from "@hostiq/db";

type ReservationStatus = "INQUIRY" | "PENDING" | "ACCEPTED" | "CANCELLED" | "COMPLETED" | "MOVED";
import { hostify } from "../integrations/hostify/client";

const INTEGRATION = "hostify";
const ENTITY_TYPE = "reservations";

function normalizeStatus(raw: string | undefined): ReservationStatus {
  const s = (raw ?? "").toLowerCase().trim();
  if (s === "accepted") return "ACCEPTED";
  if (s === "moved") return "MOVED";
  if (s === "extended") return "EXTENDED";
  if (s === "pre-approved" || s === "preapproved") return "PRE_APPROVED";
  if (s === "inquiry") return "INQUIRY";
  if (s === "canceled" || s === "cancelled") return "CANCELLED";
  return "ACCEPTED";
}

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const str = String(val);
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function parseNumber(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === "number" && !isNaN(val)) return val;
  const n = parseFloat(String(val));
  return isNaN(n) ? null : n;
}

export async function syncReservations(): Promise<void> {
  const start = Date.now();
  console.log(`[Sync:Reservations] Starting sync at ${new Date().toISOString()}`);

  try {
    const properties = await prisma.property.findMany({
      where: { hostifyListingId: { not: null } },
      select: { id: true, hostifyListingId: true },
    });

    let totalSynced = 0;

    for (const prop of properties) {
      const listingId = prop.hostifyListingId
        ? parseInt(prop.hostifyListingId, 10)
        : null;
      if (!listingId || isNaN(listingId)) continue;

      const count = await syncReservationsForProperty(prop.id, listingId);
      totalSynced += count;
    }

    await prisma.syncCheckpoint.upsert({
      where: {
        integration_entityType: { integration: INTEGRATION, entityType: ENTITY_TYPE },
      },
      update: {
        totalSynced,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        integration: INTEGRATION,
        entityType: ENTITY_TYPE,
        totalSynced,
        completedAt: new Date(),
      },
    });

    const duration = Date.now() - start;
    console.log(`[Sync:Reservations] Completed in ${duration}ms: ${totalSynced} reservations synced`);
  } catch (err) {
    const error = err as Error;
    console.error(`[Sync:Reservations] Failed:`, error.message);
    throw error;
  }
}

export async function syncReservationsForProperty(
  propertyId: string,
  hostifyListingId: number
): Promise<number> {
  try {
    const rawReservations = await hostify.getReservations(hostifyListingId);
    let count = 0;

    for (const raw of rawReservations) {
      const hostifyReservationId = String(raw.id);

      // Hostify API returns camelCase: checkIn, checkOut, etc.
      const checkIn = parseDate(raw.checkIn ?? raw.check_in ?? raw.check_in_date);
      const checkOut = parseDate(raw.checkOut ?? raw.check_out ?? raw.check_out_date);
      const nights = parseNumber(raw.nights) ?? 0;
      const total = parseNumber(raw.payout_price ?? raw.revenue ?? raw.subtotal ?? raw.total ?? raw.amount);
      const nightlyRate = parseNumber(raw.price_per_night ?? raw.base_price ?? raw.nightly_rate);
      const cleaningFee = parseNumber(raw.cleaning_fee ?? raw.cleaning_fee_amount);
      const guestCount = parseNumber(raw.guests ?? raw.guest_count);
      const bookedAt = parseDate(raw.confirmed_at ?? raw.created_at ?? raw.booked_at);

      if (!checkIn || !checkOut) {
        console.warn(
          `[Sync:Reservations] Skipping reservation ${hostifyReservationId}: missing check_in/check_out`
        );
        continue;
      }

      let guestId: string | null = null;
      const guestEmail = (raw.guest_email ?? raw.email) as string | undefined;
      const guestName = (raw.guest_name ?? raw.guest_name_full) as string | undefined;
      // Hostify returns phone as integer sometimes (e.g. 447507849802)
      const rawPhone = raw.guest_phone ?? raw.phone;
      const guestPhone = rawPhone != null ? String(rawPhone) : undefined;
      const hostifyGuestId = (raw.guest_id ?? raw.guest_uid) as string | number | undefined;

      if (hostifyGuestId || guestEmail || guestName) {
        const guestUid = hostifyGuestId ? String(hostifyGuestId) : null;
        const existingGuest = guestUid
          ? await prisma.guest.findUnique({
              where: { hostifyGuestId: guestUid },
            })
          : guestEmail
            ? await prisma.guest.findFirst({
                where: { email: guestEmail },
              })
            : null;

        if (existingGuest) {
          guestId = existingGuest.id;
          await prisma.guest.update({
            where: { id: existingGuest.id },
            data: {
              name: guestName ?? existingGuest.name,
              email: guestEmail ?? existingGuest.email,
              phone: guestPhone ?? existingGuest.phone,
              hostifyGuestId: guestUid ?? existingGuest.hostifyGuestId,
            },
          });
        } else {
          const newGuest = await prisma.guest.create({
            data: {
              hostifyGuestId: guestUid,
              name: guestName ?? null,
              email: guestEmail ?? null,
              phone: guestPhone ?? null,
            },
          });
          guestId = newGuest.id;
        }
      }

      const channel = (raw.source ?? raw.channel) as string | undefined;

      await prisma.reservation.upsert({
        where: { hostifyReservationId },
        update: {
          channel: channel ?? undefined,
          status: normalizeStatus(raw.status as string),
          checkIn,
          checkOut,
          nights,
          total: total ?? undefined,
          nightlyRate: nightlyRate ?? undefined,
          cleaningFee: cleaningFee ?? undefined,
          guestCount: guestCount ?? undefined,
          bookedAt: bookedAt ?? undefined,
          guestId: guestId ?? undefined,
          syncedAt: new Date(),
        },
        create: {
          propertyId,
          hostifyReservationId,
          channel: channel ?? null,
          status: normalizeStatus(raw.status as string),
          checkIn,
          checkOut,
          nights,
          total: total ?? null,
          nightlyRate: nightlyRate ?? null,
          cleaningFee: cleaningFee ?? null,
          guestCount: guestCount ?? null,
          bookedAt: bookedAt ?? null,
          guestId,
          syncedAt: new Date(),
        },
      });

      count++;
    }

    return count;
  } catch (err) {
    const error = err as Error;
    console.error(
      `[Sync:Reservations] Failed for property ${propertyId}:`,
      error.message
    );
    throw error;
  }
}
