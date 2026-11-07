export async function register() {
  // Serverless functions do not stay alive, so the in-process scheduler
  // cannot run on Vercel; scheduled automations need Vercel Cron there.
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.VERCEL) {
    const { syncSchedulerState } = await import("@/lib/scheduler");
    await syncSchedulerState();
  }
}
