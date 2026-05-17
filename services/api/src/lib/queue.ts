export {};
const Bull = require('bull');

const REDIS_URL = process.env.REDIS_URL;

// Graceful: if no Redis, fall back to in-process async queue
let enrichmentQueue: any = null;

if (REDIS_URL) {
  try {
    enrichmentQueue = new Bull('lead-enrichment', REDIS_URL, {
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
    console.log('[Queue] Bull connected to Redis');
  } catch (e: any) {
    console.warn('[Queue] Redis unavailable, using inline processing:', e.message);
  }
}

// In-memory fallback queue
const inlineQueue: Array<{ data: any; handler?: (d: any) => Promise<void> }> = [];
let inlineProcessor: ((d: any) => Promise<void>) | null = null;

async function drainInline() {
  while (inlineQueue.length && inlineProcessor) {
    const job = inlineQueue.shift()!;
    try { await inlineProcessor(job.data); } catch {}
    await new Promise(r => setTimeout(r, 300));
  }
}

setInterval(drainInline, 4000);

export type EnrichJob = {
  leadId: string;
  userId: string;
  website?: string;
  companyName?: string;
  city?: string;
  sector?: string;
};

export function addEnrichmentJob(data: EnrichJob): Promise<any> {
  if (enrichmentQueue) return enrichmentQueue.add(data);
  inlineQueue.push({ data });
  return Promise.resolve({ id: `inline_${Date.now()}` });
}

export function processEnrichmentJobs(handler: (data: EnrichJob) => Promise<void>) {
  if (enrichmentQueue) {
    enrichmentQueue.process(3, async (job: any) => handler(job.data));
  } else {
    inlineProcessor = handler;
  }
}

export { enrichmentQueue };
