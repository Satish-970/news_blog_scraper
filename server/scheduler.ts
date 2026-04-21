import * as cron from "node-cron";
import { runScrapeAndPublishPipeline } from "./pipeline";

let scheduledJob: cron.ScheduledTask | null = null;

/**
 * Initialize the daily scheduler
 * Runs the scrape-and-publish pipeline every day at 2 AM UTC
 */
export function initializeScheduler() {
  if (scheduledJob) {
    console.log("[Scheduler] Scheduler already initialized");
    return;
  }

  // Cron expression: 0 2 * * * (every day at 2 AM UTC)
  // Format: second minute hour day month day-of-week
  const cronExpression = "0 2 * * *";

  scheduledJob = cron.schedule(cronExpression, async () => {
    console.log("[Scheduler] Starting scheduled scrape-and-publish pipeline");
    try {
      await runScrapeAndPublishPipeline();
      console.log("[Scheduler] Scheduled pipeline completed successfully");
    } catch (error) {
      console.error("[Scheduler] Error in scheduled pipeline:", error);
    }
  });

  console.log(`[Scheduler] Daily scheduler initialized (runs at 2 AM UTC)`);
}

/**
 * Stop the scheduler
 */
export function stopScheduler() {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    console.log("[Scheduler] Scheduler stopped");
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    isActive: scheduledJob !== null,
    nextRun: scheduledJob ? "2 AM UTC daily" : null,
  };
}
