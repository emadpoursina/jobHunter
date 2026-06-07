import PQueue from 'p-queue';

export const queue = new PQueue({ concurrency: 2 });

// Run an async task through the shared queue with concurrency limiting
export function enqueueJob(fn) {
  return queue.add(async () => {
    console.log(`[INFO] [queue] task started, ${queue.size} remaining`);
    return fn();
  });
}
