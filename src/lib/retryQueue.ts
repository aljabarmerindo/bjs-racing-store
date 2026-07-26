// File: src/lib/retryQueue.ts
// Retry mechanism sederhana untuk booking Biteship + sync webhook.
type Task = {
  id: string;
  retries: number;
  maxRetries: number;
  nextRetryAt: number;
  run: () => Promise<void>;
};

const queue: Task[] = [];
let running = false;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function scheduleRetry(task: Omit<Task, "id" | "retries" | "nextRetryAt">) {
  const entry: Task = {
    ...task,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    retries: 0,
    nextRetryAt: Date.now(),
  };
  queue.push(entry);
  if (!running) runQueue();
}

async function runQueue() {
  running = true;
  while (queue.length > 0) {
    const task = queue[0];
    const now = Date.now();
    if (now < task.nextRetryAt) {
      await delay(task.nextRetryAt - now);
    }

    try {
      await task.run();
      queue.shift();
    } catch (err) {
      task.retries += 1;
      if (task.retries >= task.maxRetries) {
        console.error(`[RetryQueue] ${task.id} failed after ${task.retries} retries:`, err);
        queue.shift();
      } else {
        const backoff = [60_000, 5 * 60_000, 15 * 60_000][Math.min(task.retries - 1, 2)];
        task.nextRetryAt = Date.now() + backoff;
      }
    }
  }
  running = false;
}
