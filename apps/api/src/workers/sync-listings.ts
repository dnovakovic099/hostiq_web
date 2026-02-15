import crypto from "crypto";
import { prisma } from "@hostiq/db";
import { hostify } from "../integrations/hostify/client";
import { env } from "../env";

const INTEGRATION = "hostify";
const ENTITY_TYPE = "listings";

function hashContent(obj: Record<string, unknown>): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash("sha256").update(str).digest("hex").slice(0, 32);
}

function extractListingData(raw: Record<string, unknown>) {
  return {
    name: (raw.name as string) ?? (raw.title as string) ?? "Unnamed Listing",
    address: (raw.address as string) ?? null,
    city: (raw.city as string) ?? null,
    state: (raw.state as string) ?? null,
    country: (raw.country as string) ?? null,
    bedrooms: typeof raw.bedrooms === "number" ? raw.bedrooms : null,
    bathrooms:
      typeof raw.bathrooms === "number"
        ? raw.bathrooms
        : typeof raw.bathrooms === "string"
          ? parseFloat(raw.bathrooms)
          : null,
    maxGuests:
      typeof raw.max_guests === "number"
        ? raw.max_guests
        : typeof raw.max_guests === "string"
          ? parseInt(raw.max_guests, 10)
          : null,
    title: (raw.title as string) ?? (raw.name as string) ?? null,
    description: (raw.description as string) ?? null,
    amenities: (raw.amenities as unknown) ?? null,
    photosMeta: (raw.photos_meta as unknown) ?? (raw.photos as unknown) ?? null,
    houseRules: (raw.house_rules as string) ?? (raw.house_rules_text as string) ?? null,
  };
}

export async function syncListings(): Promise<void> {
  const start = Date.now();
  console.log(`[Sync:Listings] Starting sync at ${new Date().toISOString()}`);

  try {
    const defaultOwner = await prisma.user.findFirst({
      where: { role: { in: ["OWNER", "ADMIN"] } },
      orderBy: { createdAt: "asc" },
    });

    if (!defaultOwner) {
      console.warn(
        "[Sync:Listings] No OWNER or ADMIN user found. New listings will be skipped (updates only)."
      );
    }

    const rawListings = await hostify.getListings();
    console.log(`[Sync:Listings] Fetched ${rawListings.length} listings from Hostify`);

    let created = 0;
    let updated = 0;
    let snapshotsCreated = 0;

    for (const raw of rawListings) {
      const id = String(raw.id);
      const data = extractListingData(raw);

      const snapshotContent = {
        title: data.title,
        description: data.description,
        amenities: data.amenities,
        photosMeta: data.photosMeta,
        houseRules: data.houseRules,
      };
      const contentHash = hashContent(snapshotContent);

      const existing = await prisma.property.findUnique({
        where: { hostifyListingId: id },
        include: {
          listingsSnapshots: {
            orderBy: { snapshotDate: "desc" },
            take: 1,
          },
        },
      });

      let propertyId: string;

      if (existing) {
        await prisma.property.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            address: data.address,
            city: data.city,
            state: data.state,
            country: data.country,
            bedrooms: data.bedrooms,
            bathrooms: data.bathrooms,
            maxGuests: data.maxGuests,
          },
        });
        propertyId = existing.id;
        updated++;

        const latestSnapshot = existing.listingsSnapshots[0];
        if (!latestSnapshot || latestSnapshot.hash !== contentHash) {
        await prisma.listingSnapshot.create({
          data: {
            propertyId: existing.id,
            title: data.title,
            description: data.description,
            amenities: data.amenities ?? undefined,
            photosMeta: data.photosMeta ?? undefined,
            houseRules: data.houseRules,
            hash: contentHash,
          },
        });
          snapshotsCreated++;
        }
      } else {
        if (!defaultOwner) {
          console.log(`[Sync:Listings] Skipping new listing ${id} (no default owner)`);
          continue;
        }

        const createdProperty = await prisma.property.create({
          data: {
            ownerId: defaultOwner.id,
            hostifyListingId: id,
            name: data.name,
            address: data.address,
            city: data.city,
            state: data.state,
            country: data.country,
            bedrooms: data.bedrooms,
            bathrooms: data.bathrooms,
            maxGuests: data.maxGuests,
          },
        });
        propertyId = createdProperty.id;
        created++;

        await prisma.listingSnapshot.create({
          data: {
            propertyId: createdProperty.id,
            title: data.title,
            description: data.description,
            amenities: data.amenities ?? undefined,
            photosMeta: data.photosMeta ?? undefined,
            houseRules: data.houseRules,
            hash: contentHash,
          },
        });
        snapshotsCreated++;
      }
    }

    await prisma.syncCheckpoint.upsert({
      where: {
        integration_entityType: { integration: INTEGRATION, entityType: ENTITY_TYPE },
      },
      update: {
        totalSynced: rawListings.length,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        integration: INTEGRATION,
        entityType: ENTITY_TYPE,
        totalSynced: rawListings.length,
        completedAt: new Date(),
      },
    });

    await prisma.integrationHealth.upsert({
      where: { integration: INTEGRATION },
      update: {
        status: "healthy",
        lastSuccessAt: new Date(),
        consecutiveFailures: 0,
        errorMessage: null,
        metadata: {
          lastListingsSync: {
            total: rawListings.length,
            created,
            updated,
            snapshotsCreated,
            durationMs: Date.now() - start,
          },
        },
      },
      create: {
        integration: INTEGRATION,
        status: "healthy",
        lastSuccessAt: new Date(),
        metadata: {
          lastListingsSync: {
            total: rawListings.length,
            created,
            updated,
            snapshotsCreated,
            durationMs: Date.now() - start,
          },
        },
      },
    });

    const duration = Date.now() - start;
    console.log(
      `[Sync:Listings] Completed in ${duration}ms: ${created} created, ${updated} updated, ${snapshotsCreated} snapshots`
    );
  } catch (err) {
    const error = err as Error;
    console.error(`[Sync:Listings] Failed:`, error.message);

    await prisma.integrationHealth.upsert({
      where: { integration: INTEGRATION },
      update: {
        status: "error",
        lastFailureAt: new Date(),
        errorMessage: error.message,
        consecutiveFailures: { increment: 1 },
      },
      create: {
        integration: INTEGRATION,
        status: "error",
        lastFailureAt: new Date(),
        errorMessage: error.message,
        consecutiveFailures: 1,
      },
    });

    throw error;
  }
}
