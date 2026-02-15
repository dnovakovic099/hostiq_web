import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding HostIQ database...");

  // Create admin user
  const adminPasswordHash = crypto
    .createHash("sha256")
    .update("admin123!")
    .digest("hex");

  const admin = await prisma.user.upsert({
    where: { email: "admin@hostiq.app" },
    update: {},
    create: {
      email: "admin@hostiq.app",
      name: "HostIQ Admin",
      passwordHash: `$2a$12$placeholder_hash_for_seed_only`,
      role: "ADMIN",
      phone: "+15555550100",
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // Create demo owner
  const owner = await prisma.user.upsert({
    where: { email: "owner@demo.com" },
    update: {},
    create: {
      email: "owner@demo.com",
      name: "Demo Owner",
      passwordHash: `$2a$12$placeholder_hash_for_seed_only`,
      role: "OWNER",
      phone: "+15555550101",
    },
  });
  console.log(`Created owner user: ${owner.email}`);

  // Create demo cleaner user
  const cleanerUser = await prisma.user.upsert({
    where: { email: "cleaner@demo.com" },
    update: {},
    create: {
      email: "cleaner@demo.com",
      name: "Demo Cleaner",
      passwordHash: `$2a$12$placeholder_hash_for_seed_only`,
      role: "CLEANER",
      phone: "+15555550102",
    },
  });

  // Create cleaner record
  await prisma.cleaner.upsert({
    where: { userId: cleanerUser.id },
    update: {},
    create: {
      userId: cleanerUser.id,
      name: "Demo Cleaner",
      phone: "+15555550102",
      email: "cleaner@demo.com",
      rate: 75.0,
    },
  });
  console.log(`Created cleaner: ${cleanerUser.email}`);

  // Create demo property
  const property = await prisma.property.upsert({
    where: { hostifyListingId: "demo-1" },
    update: {},
    create: {
      ownerId: owner.id,
      hostifyListingId: "demo-1",
      name: "Luxury Downtown Loft",
      address: "123 Main St",
      city: "Nashville",
      state: "TN",
      zipCode: "37201",
      country: "US",
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 6,
      status: "active",
    },
  });
  console.log(`Created property: ${property.name}`);

  // Create integration health records
  for (const integration of ["hostify", "hostbuddy", "openphone", "openai"]) {
    await prisma.integrationHealth.upsert({
      where: { integration },
      update: {},
      create: {
        integration,
        status: "unknown",
      },
    });
  }
  console.log("Created integration health records");

  // Create sync checkpoints
  for (const entityType of [
    "listings",
    "reservations",
    "messages",
    "reviews",
  ]) {
    await prisma.syncCheckpoint.upsert({
      where: {
        integration_entityType: {
          integration: "hostify",
          entityType,
        },
      },
      update: {},
      create: {
        integration: "hostify",
        entityType,
        totalSynced: 0,
      },
    });
  }
  console.log("Created sync checkpoints");

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
