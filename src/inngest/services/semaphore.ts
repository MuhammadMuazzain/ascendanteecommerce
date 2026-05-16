// services/semaphore.ts
import { Redis } from "@upstash/redis";
import { config } from "../config";

const redis = new Redis({
  url: config.upstash.url,
  token: config.upstash.token,
});

export class DistributedSemaphore {
  private key: string;
  private maxConcurrency: number;
  private leaseTime: number;
  private localSlots: number;
  private waiting: (() => void)[] = [];

  constructor(key = "global:upstash_slots", maxConcurrency = 5, leaseTime = 30000) {
    this.key = key;
    this.maxConcurrency = maxConcurrency; // slots permitidos
    this.leaseTime = leaseTime; // ms
    this.localSlots = maxConcurrency; // pool local
  }

  // --- Acquire un slot global y local ---
  async acquire(): Promise<() => Promise<void>> {
    // primero espera en pool local
    const releaseLocal = await this.acquireLocal();

    const leaseId = `${process.pid}-${Math.random().toString(36).slice(2)}`;
    while (true) {
      const now = Date.now();
      await redis.zremrangebyscore(this.key, 0, now);
      const count = await redis.zcard(this.key);

      if (count < this.maxConcurrency) {
        await redis.zadd(this.key, {
          score: now + this.leaseTime,
          member: leaseId,
        });

        // función de liberación que libera slot en Redis y local
        return async () => {
          await redis.zrem(this.key, leaseId);
          releaseLocal(); // liberar slot local
        };
      }

      await new Promise((r) => setTimeout(r, 100)); // espera y retry
    }
  }

  // Pool local para limitar requests HTTP simultáneas
  private acquireLocal(): Promise<() => void> {
    if (this.localSlots > 0) {
      this.localSlots--;
      return Promise.resolve(() => {
        this.localSlots++;
        if (this.waiting.length > 0) {
          const next = this.waiting.shift()!;
          next();
        }
      });
    } else {
      return new Promise((resolve) => {
        this.waiting.push(() => {
          this.localSlots--;
          resolve(() => {
            this.localSlots++;
            if (this.waiting.length > 0) {
              const next = this.waiting.shift()!;
              next();
            }
          });
        });
      });
    }
  }
}

export const globalSemaphore = new DistributedSemaphore("global:upstash_slots", 5);
