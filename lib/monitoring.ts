export interface MetricEvent {
  name: string;
  timestamp: string;
  duration?: number;
  status: "success" | "failure" | "timeout";
  metadata?: Record<string, unknown>;
}

class MonitoringService {
  private metrics: MetricEvent[] = [];
  private maxMetrics = 500;

  recordMetric(
    name: string,
    status: "success" | "failure" | "timeout",
    duration?: number,
    metadata?: Record<string, unknown>
  ): void {
    const event: MetricEvent = {
      name,
      timestamp: new Date().toISOString(),
      status,
      duration,
      metadata,
    };

    this.metrics.push(event);

    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    if (typeof window !== "undefined") {
      // Send to analytics endpoint if available
      this.sendToAnalytics(event).catch(() => {
        // Silently fail if analytics endpoint unavailable
      });
    }
  }

  async sendToAnalytics(event: MetricEvent): Promise<void> {
    try {
      await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
    } catch {
      // Network error, metric will be lost (acceptable for non-critical metrics)
    }
  }

  getMetrics(filter?: {
    name?: string;
    status?: "success" | "failure" | "timeout";
  }): MetricEvent[] {
    return this.metrics.filter((m) => {
      if (filter?.name && m.name !== filter.name) return false;
      if (filter?.status && m.status !== filter.status) return false;
      return true;
    });
  }

  getSuccessRate(name?: string): number {
    const relevant = name
      ? this.metrics.filter((m) => m.name === name)
      : this.metrics;

    if (relevant.length === 0) return 0;

    const successes = relevant.filter((m) => m.status === "success").length;
    return Math.round((successes / relevant.length) * 100);
  }

  getAverageDuration(name?: string): number {
    const relevant = name
      ? this.metrics.filter((m) => m.name === name && m.duration)
      : this.metrics.filter((m) => m.duration);

    if (relevant.length === 0) return 0;

    const total = relevant.reduce((sum, m) => sum + (m.duration || 0), 0);
    return Math.round(total / relevant.length);
  }

  clear(): void {
    this.metrics = [];
  }
}

export const monitoring = new MonitoringService();
