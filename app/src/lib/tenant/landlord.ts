import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { landlords } from "@/lib/db/schema";

export async function requireCurrentLandlord() {
  const { userId } = await auth();
  if (!userId) {
    return { landlord: null, error: { status: 401, message: "Unauthorized" } };
  }

  const existingLandlord = await db.query.landlords.findFirst({
    where: eq(landlords.clerkUserId, userId),
  });

  if (existingLandlord) {
    return { landlord: existingLandlord, error: null };
  }

  const profile = await getClerkProfile(userId);
  if (!profile) {
    return { landlord: null, error: { status: 404, message: "Landlord not found" } };
  }

  const [createdLandlord] = await db
    .insert(landlords)
    .values({
      clerkUserId: userId,
      name: profile.name,
      email: profile.email,
    })
    .onConflictDoNothing({ target: landlords.clerkUserId })
    .returning();

  if (createdLandlord) {
    return { landlord: createdLandlord, error: null };
  }

  const landlord = await db.query.landlords.findFirst({
    where: eq(landlords.clerkUserId, userId),
  });

  if (!landlord) {
    return { landlord: null, error: { status: 404, message: "Landlord not found" } };
  }

  return { landlord, error: null };
}

async function getClerkProfile(userId: string) {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const email =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses.find((entry) => typeof entry.emailAddress === "string")?.emailAddress ??
      null;

    if (!email) {
      return null;
    }

    const preferredName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    const fallbackName = user.username?.trim() || email.split("@")[0] || "Landlord";

    return {
      email,
      name: preferredName || fallbackName,
    };
  } catch {
    return null;
  }
}
