const MAX_KEYS = 10_000;

export class AttemptLimiter {
    private readonly hits = new Map<string, number[]>();

    constructor(
        private readonly max: number,
        private readonly windowMs: number,
    ) {}

    allow(key: string, now = Date.now()): boolean {
        const recent = (this.hits.get(key) ?? []).filter((time) => now - time < this.windowMs);
        if (recent.length >= this.max) {
            this.hits.set(key, recent);
            return false;
        }
        recent.push(now);
        this.hits.set(key, recent);
        this.trim(now);
        return true;
    }

    reset(key: string): void {
        this.hits.delete(key);
    }

    private trim(now: number): void {
        if (this.hits.size <= MAX_KEYS) return;
        for (const [key, times] of this.hits) {
            if (times.every((time) => now - time >= this.windowMs)) this.hits.delete(key);
        }
        while (this.hits.size > MAX_KEYS) {
            const oldest = this.hits.keys().next().value;
            if (oldest === undefined) return;
            this.hits.delete(oldest);
        }
    }
}
