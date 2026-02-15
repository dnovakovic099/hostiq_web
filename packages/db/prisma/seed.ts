import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log("Seeding HostIQ database...");

  const adminHash = await hashPassword("admin123!");
  const ownerHash = await hashPassword("owner123!");
  const cleanerHash = await hashPassword("cleaner123!");

  const admin = await prisma.user.upsert({
    where: { email: "admin@hostiq.app" },
    update: { passwordHash: adminHash },
    create: {
      email: "admin@hostiq.app",
      name: "HostIQ Admin",
      passwordHash: adminHash,
      role: "ADMIN",
      phone: "+15555550100",
    },
  });
  console.log(`Created admin user: ${admin.email} (password: admin123!)`);

  const owner = await prisma.user.upsert({
    where: { email: "owner@demo.com" },
    update: { passwordHash: ownerHash },
    create: {
      email: "owner@demo.com",
      name: "Demo Owner",
      passwordHash: ownerHash,
      role: "OWNER",
      phone: "+15555550101",
    },
  });
  console.log(`Created owner user: ${owner.email} (password: owner123!)`);

  const cleanerUser = await prisma.user.upsert({
    where: { email: "cleaner@demo.com" },
    update: { passwordHash: cleanerHash },
    create: {
      email: "cleaner@demo.com",
      name: "Demo Cleaner",
      passwordHash: cleanerHash,
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
