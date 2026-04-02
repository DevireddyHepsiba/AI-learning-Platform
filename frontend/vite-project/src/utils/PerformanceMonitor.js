/**
 * Performance Monitoring System
 * Tracks latency, event processing time, sync delays
 * Provides real-time metrics and alerts
 */

export class PerformanceMonitor {
  constructor(sessionId, userId) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.metrics = {
      socketLatency: [],
      eventProcessingTime: [],
      syncDelay: [],
      memoryUsage: [],
      cpuLoad: [],
      drawingFPS: 60,
      operationCount: 0,
      failedOperations: 0,
      averageLatency: 0,
      peakLatency: 0,
    };
    this.timers = new Map();
    this.alerts = [];
    this.alertThresholds = {
      latency: 500, // ms
      processingTime: 200, // ms
      syncDelay: 1000, // ms
      memoryUsage: 500, // MB
    };
  }

  /**
   * Start measuring latency for Socket.io event
   */
  startLatencyMeasure(eventId) {
    this.timers.set(`latency-${eventId}`, performance.now());
  }

  /**
   * End latency measurement and record
   */
  endLatencyMeasure(eventId) {
    const startTime = this.timers.get(`latency-${eventId}`);
    if (!startTime) return;

    const latency = performance.now() - startTime;
    this.metrics.socketLatency.push({
      eventId,
      latency,
      timestamp: new Date(),
    });

    // Keep only last 100 measurements
    if (this.metrics.socketLatency.length > 100) {
      this.metrics.socketLatency.shift();
    }

    // Update averages
    this.updateAverages();

    // Check for alerts
    if (latency > this.alertThresholds.latency) {
      this.createAlert("HIGH_LATENCY", latency, "Socket.io latency exceeded threshold");
    }

    this.timers.delete(`latency-${eventId}`);
    return latency;
  }

  /**
   * Measure event processing time
   */
  measureEventProcessing(eventName, callback) {
    const startTime = performance.now();

    try {
      const result = callback();
      const duration = performance.now() - startTime;

      this.metrics.eventProcessingTime.push({
        eventName,
        duration,
        status: "success",
        timestamp: new Date(),
      });

      if (duration > this.alertThresholds.processingTime) {
        this.createAlert("SLOW_EVENT", duration, `${eventName} took ${duration.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      this.metrics.eventProcessingTime.push({
        eventName,
        duration,
        status: "error",
        error: error.message,
        timestamp: new Date(),
      });

      this.createAlert("EVENT_ERROR", error, `${eventName} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Measure sync delay (time from local operation to server acknowledgment)
   */
  startSyncMeasure(operationId) {
    this.timers.set(`sync-${operationId}`, performance.now());
    this.metrics.operationCount++;
  }

  /**
   * End sync measurement
   */
  endSyncMeasure(operationId, success = true) {
    const startTime = this.timers.get(`sync-${operationId}`);
    if (!startTime) return;

    const delay = performance.now() - startTime;

    this.metrics.syncDelay.push({
      operationId,
      delay,
      status: success ? "synced" : "failed",
      timestamp: new Date(),
    });

    if (!success) {
      this.metrics.failedOperations++;
    }

    if (delay > this.alertThresholds.syncDelay) {
      this.createAlert("SYNC_DELAY", delay, `Sync operation took ${delay.toFixed(2)}ms`);
    }

    // Keep only last 100 measurements
    if (this.metrics.syncDelay.length > 100) {
      this.metrics.syncDelay.shift();
    }

    this.updateAverages();
    this.timers.delete(`sync-${operationId}`);
    return delay;
  }

  /**
   * Monitor memory usage
   */
  monitorMemory() {
    if (performance.memory) {
      const usedMemory = performance.memory.usedJSHeapSize / 1048576; // Convert to MB

      this.metrics.memoryUsage.push({
        used: usedMemory,
        limit: performance.memory.jsHeapSizeLimit / 1048576,
        timestamp: new Date(),
      });

      if (this.metrics.memoryUsage.length > 50) {
        this.metrics.memoryUsage.shift();
      }

      if (usedMemory > this.alertThresholds.memoryUsage) {
        this.createAlert("HIGH_MEMORY", usedMemory, `Memory usage at ${usedMemory.toFixed(2)}MB`);
      }
    }
  }

  /**
   * Track drawing FPS
   */
  trackDrawingFPS(frameCount, deltaTime) {
    this.metrics.drawingFPS = Math.round((frameCount / deltaTime) * 1000);
  }

  /**
   * Update average metrics
   */
  updateAverages() {
    if (this.metrics.socketLatency.length > 0) {
      const latencies = this.metrics.socketLatency.map((m) => m.latency);
      this.metrics.averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      this.metrics.peakLatency = Math.max(...latencies);
    }
  }

  /**
   * Create alert for threshold breach
   */
  createAlert(type, value, message) {
    const alert = {
      id: `${type}-${Date.now()}`,
      type,
      value,
      message,
      timestamp: new Date(),
      severity: this.calculateSeverity(type, value),
    };

    this.alerts.push(alert);

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }

    console.warn(`⚠️ ALERT [${type}]: ${message}`, {
      value,
      severity: alert.severity,
    });

    return alert;
  }

  /**
   * Calculate alert severity
   */
  calculateSeverity(type, value) {
    switch (type) {
      case "HIGH_LATENCY":
        return value > 1000 ? "critical" : "warning";
      case "SLOW_EVENT":
        return value > 500 ? "critical" : "warning";
      case "SYNC_DELAY":
        return value > 2000 ? "critical" : "warning";
      case "HIGH_MEMORY":
        return value > 700 ? "critical" : "warning";
      default:
        return "info";
    }
  }

  /**
   * Get performance summary
   */
  getSummary() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: new Date(),
      averageLatency: this.metrics.averageLatency.toFixed(2),
      peakLatency: this.metrics.peakLatency.toFixed(2),
      averageSyncDelay:
        this.metrics.syncDelay.length > 0
          ? (
              this.metrics.syncDelay.reduce((a, b) => a + b.delay, 0) /
              this.metrics.syncDelay.length
            ).toFixed(2)
          : 0,
      operationCount: this.metrics.operationCount,
      failedOperations: this.metrics.failedOperations,
      failureRate:
        this.metrics.operationCount > 0
          ? ((this.metrics.failedOperations / this.metrics.operationCount) * 100).toFixed(2) + "%"
          : "0%",
      drawingFPS: this.metrics.drawingFPS,
      activeAlerts: this.alerts.filter(
        (a) => new Date() - a.timestamp < 60000 // Last 1 minute
      ).length,
      totalAlerts: this.alerts.length,
    };
  }

  /**
   * Get detailed metrics
   */
  getDetailedMetrics() {
    return {
      socketLatency: this.metrics.socketLatency.slice(-20),
      eventProcessingTime: this.metrics.eventProcessingTime.slice(-20),
      syncDelay: this.metrics.syncDelay.slice(-20),
      memoryUsage: this.metrics.memoryUsage.slice(-20),
      recentAlerts: this.alerts.slice(-10),
    };
  }

  /**
   * Export metrics for logging to server
   */
  async exportMetrics() {
    const summary = this.getSummary();

    try {
      const response = await fetch("/api/sessions/performance-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: this.sessionId,
          userId: this.userId,
          metrics: summary,
          timestamp: new Date(),
        }),
      });

      if (response.ok) {
        console.log("✅ Performance metrics exported to server");
        return true;
      }
    } catch (error) {
      console.error("❌ Failed to export metrics:", error);
    }

    return false;
  }

  /**
   * Clear all metrics
   */
  reset() {
    this.metrics = {
      socketLatency: [],
      eventProcessingTime: [],
      syncDelay: [],
      memoryUsage: [],
      cpuLoad: [],
      drawingFPS: 60,
      operationCount: 0,
      failedOperations: 0,
      averageLatency: 0,
      peakLatency: 0,
    };
    this.timers.clear();
    this.alerts = [];
    console.log("✅ Performance metrics reset");
  }
}

export default PerformanceMonitor;
