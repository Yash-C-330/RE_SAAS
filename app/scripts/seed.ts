/**
 * Seed database with demo landlords, properties, units, and leases
 * Usage: npx ts-node scripts/seed.ts
 */

import { db } from "@/lib/db";
import {
  landlords,
  properties,
  units,
  tenants,
  leases,
  rentPayments,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Demo landlord UUIDs (use these in N8N_LANDLORD_ID env var)
const DEMO_LANDLORD_IDS = {
  ALICE: "00000000-0000-0000-0000-000000000001",
  BOB: "00000000-0000-0000-0000-000000000002",
};

const DEMO_TENANT_IDS = {
  ALEX: "10000000-0000-0000-0000-000000000001",
  SAM: "10000000-0000-0000-0000-000000000002",
  JORDAN: "10000000-0000-0000-0000-000000000003",
  CASEY: "10000000-0000-0000-0000-000000000004",
};

const DEMO_PROPERTY_IDS = {
  DOWNTOWN: "20000000-0000-0000-0000-000000000001",
  SUBURBS: "20000000-0000-0000-0000-000000000002",
};

const DEMO_UNIT_IDS = {
  DOWNTOWN_A: "30000000-0000-0000-0000-000000000001",
  DOWNTOWN_B: "30000000-0000-0000-0000-000000000002",
  SUBURBS_A: "30000000-0000-0000-0000-000000000003",
};

const DEMO_LEASE_IDS = {
  ALICE_UNIT_A: "40000000-0000-0000-0000-000000000001",
  ALICE_UNIT_B: "40000000-0000-0000-0000-000000000002",
  BOB_UNIT_A: "40000000-0000-0000-0000-000000000003",
};

async function seed() {
  try {
    console.log("🌱 Starting database seed...\n");

    // Clear existing data (CAUTION: only in dev/staging)
    if (process.env.NODE_ENV === "production") {
      console.error("❌ Refusing to seed production database!");
      process.exit(1);
    }

    console.log("📝 Creating landlords...");
    await db.insert(landlords).values([
      {
        id: DEMO_LANDLORD_IDS.ALICE,
        clerkUserId: "user_alice_demo",
        name: "Alice Johnson",
        email: "alice@demo.landlord",
        plan: "pro",
      },
      {
        id: DEMO_LANDLORD_IDS.BOB,
        clerkUserId: "user_bob_demo",
        name: "Bob Smith",
        email: "bob@demo.landlord",
        plan: "growth",
      },
    ]);

    console.log("🏢 Creating properties...");
    await db.insert(properties).values([
      {
        id: DEMO_PROPERTY_IDS.DOWNTOWN,
        landlordId: DEMO_LANDLORD_IDS.ALICE,
        address: "123 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
        type: "multi_family",
        unitsCount: 2,
      },
      {
        id: DEMO_PROPERTY_IDS.SUBURBS,
        landlordId: DEMO_LANDLORD_IDS.BOB,
        address: "456 Oak Ave",
        city: "Austin",
        state: "TX",
        zip: "78704",
        type: "single_family",
        unitsCount: 1,
      },
    ]);

    console.log("🏠 Creating units...");
    await db.insert(units).values([
      {
        id: DEMO_UNIT_IDS.DOWNTOWN_A,
        propertyId: DEMO_PROPERTY_IDS.DOWNTOWN,
        unitNumber: "101",
        bedrooms: 2,
        bathrooms: "1.5",
        rentAmount: "1500.00",
        status: "occupied",
      },
      {
        id: DEMO_UNIT_IDS.DOWNTOWN_B,
        propertyId: DEMO_PROPERTY_IDS.DOWNTOWN,
        unitNumber: "102",
        bedrooms: 1,
        bathrooms: "1.0",
        rentAmount: "1200.00",
        status: "occupied",
      },
      {
        id: DEMO_UNIT_IDS.SUBURBS_A,
        propertyId: DEMO_PROPERTY_IDS.SUBURBS,
        unitNumber: "1",
        bedrooms: 3,
        bathrooms: "2.0",
        rentAmount: "2000.00",
        status: "occupied",
      },
    ]);

    console.log("👥 Creating tenants...");
    await db.insert(tenants).values([
      {
        id: DEMO_TENANT_IDS.ALEX,
        landlordId: DEMO_LANDLORD_IDS.ALICE,
        name: "Alex Chen",
        email: "alex@tenants.demo",
        phone: "+15551234567",
        creditScore: 750,
        status: "active",
      },
      {
        id: DEMO_TENANT_IDS.SAM,
        landlordId: DEMO_LANDLORD_IDS.ALICE,
        name: "Sam Rodriguez",
        email: "sam@tenants.demo",
        phone: "+15559876543",
        creditScore: 720,
        status: "active",
      },
      {
        id: DEMO_TENANT_IDS.JORDAN,
        landlordId: DEMO_LANDLORD_IDS.BOB,
        name: "Jordan Kim",
        email: "jordan@tenants.demo",
        phone: "+15555555555",
        creditScore: 780,
        status: "active",
      },
    ]);

    console.log("📋 Creating leases...");
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 12, 0);

    // Format dates as YYYY-MM-DD for the date column
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    await db.insert(leases).values([
      {
        id: DEMO_LEASE_IDS.ALICE_UNIT_A,
        unitId: DEMO_UNIT_IDS.DOWNTOWN_A,
        tenantId: DEMO_TENANT_IDS.ALEX,
        startDate: formatDate(start),
        endDate: formatDate(end),
        monthlyRent: "1500.00",
        status: "active",
      },
      {
        id: DEMO_LEASE_IDS.ALICE_UNIT_B,
        unitId: DEMO_UNIT_IDS.DOWNTOWN_B,
        tenantId: DEMO_TENANT_IDS.SAM,
        startDate: formatDate(start),
        endDate: formatDate(end),
        monthlyRent: "1200.00",
        status: "active",
      },
      {
        id: DEMO_LEASE_IDS.BOB_UNIT_A,
        unitId: DEMO_UNIT_IDS.SUBURBS_A,
        tenantId: DEMO_TENANT_IDS.JORDAN,
        startDate: formatDate(start),
        endDate: formatDate(end),
        monthlyRent: "2000.00",
        status: "active",
      },
    ]);

    console.log("💳 Creating rent payments...");
    // Create 3 months of rent payments for each lease
    // One overdue, one upcoming, one paid
    const payments = [];
    for (const leaseId of Object.values(DEMO_LEASE_IDS)) {
      const lease = (
        await db
          .select()
          .from(leases)
          .where(eq(leases.id, leaseId))
      )[0];

      if (!lease) continue;

      // 5 days ago (overdue)
      const overdueDue = new Date(today);
      overdueDue.setDate(overdueDue.getDate() - 5);
      payments.push({
        leaseId,
        dueDate: formatDate(overdueDue),
        paidDate: null,
        amount: lease.monthlyRent,
        status: "late",
      });

      // Today (due soon)
      const todayDue = new Date(today);
      payments.push({
        leaseId,
        dueDate: formatDate(todayDue),
        paidDate: null,
        amount: lease.monthlyRent,
        status: "pending",
      });

      // 10 days in future (upcoming)
      const futureDue = new Date(today);
      futureDue.setDate(futureDue.getDate() + 10);
      payments.push({
        leaseId,
        dueDate: formatDate(futureDue),
        paidDate: null,
        amount: lease.monthlyRent,
        status: "pending",
      });
    }

    await db.insert(rentPayments).values(payments);

    console.log("\n✅ Database seeded successfully!");
    console.log("\n📊 Summary:");
    console.log(`   Landlords: 2 (use N8N_LANDLORD_ID=${DEMO_LANDLORD_IDS.ALICE} for testing)`);
    console.log("   Properties: 2");
    console.log("   Units: 3");
    console.log("   Tenants: 3");
    console.log("   Leases: 3");
    console.log("   Rent Payments: 9 (3 per lease - overdue, due, upcoming)");
    console.log("\n🧪 Test with:");
    console.log(`   curl -H "x-landlord-id: ${DEMO_LANDLORD_IDS.ALICE}" \\`);
    console.log("   http://localhost:3000/api/automations/lease-candidates");
    console.log("\n✨ Demo data ready for n8n workflows!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
