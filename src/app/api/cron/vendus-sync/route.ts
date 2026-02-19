import { NextRequest, NextResponse } from "next/server";
import {
  syncProducts,
  processRetryQueue,
  isVendusEnabled,
  getConfiguredLocations,
} from "@/lib/vendus";

export const dynamic = "force-dynamic";

// Vercel Cron configuration
export const maxDuration = 300; // 5 minutes max

/**
 * GET /api/cron/vendus-sync
 * Automatic synchronization cron job
 * Called by Vercel Cron or external cron service
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("[Cron] CRON_SECRET not configured");
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[Cron] Invalid authorization");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Cron] Starting Vendus sync job...");
  const startTime = Date.now();
  const results: Array<{
    location: string;
    success: boolean;
    recordsProcessed?: number;
    recordsUpdated?: number;
    error?: string;
  }> = [];

  // Check if Vendus is enabled
  if (!isVendusEnabled()) {
    console.log("[Cron] Vendus not enabled, skipping sync");
    return NextResponse.json({
      message: "Vendus not enabled",
      timestamp: new Date().toISOString(),
    });
  }

  // Get configured locations (from DB - locations with vendus enabled)
  let locations: string[];
  try {
    locations = await getConfiguredLocations();
  } catch (error) {
    console.error("[Cron] Error fetching configured locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch configured locations" },
      { status: 500 },
    );
  }

  if (locations.length === 0) {
    console.log("[Cron] No locations configured for Vendus");
    return NextResponse.json({
      message: "No locations configured",
      timestamp: new Date().toISOString(),
    });
  }

  // Sync products for each location
  for (const locationSlug of locations) {
    try {
      console.log(`[Cron] Syncing products for ${locationSlug}...`);

      const result = await syncProducts({
        locationSlug,
        direction: "both",
      });

      results.push({
        location: locationSlug,
        success: result.success,
        recordsProcessed: result.recordsProcessed,
        recordsUpdated: result.recordsUpdated,
      });

      console.log(
        `[Cron] ${locationSlug}: ${result.recordsUpdated} updated, ${result.recordsFailed} failed`,
      );
    } catch (error) {
      console.error(`[Cron] Error syncing ${locationSlug}:`, error);
      results.push({
        location: locationSlug,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Process retry queue
  console.log("[Cron] Processing retry queue...");
  let retryStats = { processed: 0, succeeded: 0, failed: 0 };

  try {
    retryStats = await processRetryQueue();
    console.log(
      `[Cron] Retry queue: ${retryStats.succeeded} succeeded, ${retryStats.failed} failed`,
    );
  } catch (error) {
    console.error("[Cron] Error processing retry queue:", error);
  }

  const duration = Date.now() - startTime;
  console.log(`[Cron] Vendus sync completed in ${duration}ms`);

  return NextResponse.json({
    results,
    retryQueue: retryStats,
    duration,
    timestamp: new Date().toISOString(),
  });
}
