/**
 * Request abort controller service for managing request cancellation
 * Useful for cleanup when components unmount or when similar requests are made
 */

class RequestAbortService {
  constructor() {
    this.controllers = new Map();
  }

  /**
   * Create a new abort controller for a request
   */
  createController(key) {
    const controller = new AbortController();
    
    // Cancel any existing controller with the same key
    if (this.controllers.has(key)) {
      const oldController = this.controllers.get(key);
      oldController.abort();
    }
    
    this.controllers.set(key, controller);
    return controller;
  }

  /**
   * Get signal for request
   */
  getSignal(key) {
    if (!this.controllers.has(key)) {
      this.createController(key);
    }
    return this.controllers.get(key).signal;
  }

  /**
   * Abort a specific request
   */
  abort(key) {
    if (this.controllers.has(key)) {
      this.controllers.get(key).abort();
      this.controllers.delete(key);
    }
  }

  /**
   * Abort all requests with a specific prefix
   */
  abortByPrefix(prefix) {
    for (const [key, controller] of this.controllers) {
      if (key.startsWith(prefix)) {
        controller.abort();
        this.controllers.delete(key);
      }
    }
  }

  /**
   * Abort all requests
   */
  abortAll() {
    for (const controller of this.controllers.values()) {
      controller.abort();
    }
    this.controllers.clear();
  }

  /**
   * Get list of active abort controllers
   */
  getActiveControllers() {
    return Array.from(this.controllers.keys());
  }
}

// Export singleton instance
const requestAbortService = new RequestAbortService();

export default requestAbortService;
