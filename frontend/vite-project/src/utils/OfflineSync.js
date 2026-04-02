/**
 * OfflineSync Manager - Handles offline-first collaborative editing
 * Stores changes locally and syncs when connectivity is restored
 */

export class OfflineSync {
  constructor(dbName = "AI-Learning-Offline") {
    this.dbName = dbName;
    this.db = null;
    this.pendingOperations = [];
    this.isOnline = navigator.onLine;
    this.initDB();
    this.setupListeners();
  }

  /**
   * Initialize IndexedDB for offline storage
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store for pending operations
        if (!db.objectStoreNames.contains("pending_operations")) {
          db.createObjectStore("pending_operations", { keyPath: "operationId" });
        }

        // Store for document snapshots
        if (!db.objectStoreNames.contains("document_snapshots")) {
          db.createObjectStore("document_snapshots", { keyPath: "documentId" });
        }

        // Store for sync metadata
        if (!db.objectStoreNames.contains("sync_metadata")) {
          db.createObjectStore("sync_metadata", { keyPath: "key" });
        }
      };
    });
  }

  /**
   * Setup online/offline listeners
   */
  setupListeners() {
    window.addEventListener("online", () => {
      this.isOnline = true;
      console.log("🟢 Back online - syncing changes");
      this.syncPendingOperations();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      console.log("🔴 Offline - storing changes locally");
    });
  }

  /**
   * Save operation for offline storage
   */
  async savePendingOperation(operation) {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["pending_operations"], "readwrite");
      const store = tx.objectStore("pending_operations");

      const request = store.add({
        ...operation,
        savedAt: Date.now(),
        synced: false,
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.pendingOperations.push(operation);
        resolve(operation.operationId);
      };
    });
  }

  /**
   * Get all pending operations
   */
  async getPendingOperations() {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["pending_operations"], "readonly");
      const store = tx.objectStore("pending_operations");
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const unsyncedOps = request.result.filter((op) => !op.synced);
        resolve(unsyncedOps);
      };
    });
  }

  /**
   * Mark operations as synced
   */
  async markAsSynced(operationIds) {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["pending_operations"], "readwrite");
      const store = tx.objectStore("pending_operations");

      for (const id of operationIds) {
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
          const op = getRequest.result;
          if (op) {
            op.synced = true;
            store.put(op);
          }
        };
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Save document snapshot
   */
  async saveSnapshot(documentId, content) {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["document_snapshots"], "readwrite");
      const store = tx.objectStore("document_snapshots");

      const request = store.put({
        documentId,
        content,
        savedAt: Date.now(),
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(documentId);
    });
  }

  /**
   * Get document snapshot
   */
  async getSnapshot(documentId) {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["document_snapshots"], "readonly");
      const store = tx.objectStore("document_snapshots");
      const request = store.get(documentId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.content || null);
    });
  }

  /**
   * Sync pending operations with server
   */
  async syncPendingOperations() {
    if (!this.isOnline) return;

    try {
      const pendingOps = await this.getPendingOperations();
      if (pendingOps.length === 0) return;

      console.log(`📤 Syncing ${pendingOps.length} pending operations`);

      // Send to server
      const response = await fetch("/api/sessions/sync-operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations: pendingOps }),
      });

      if (response.ok) {
        const { mergedOperations } = await response.json();
        await this.markAsSynced(pendingOps.map((op) => op.operationId));
        console.log("✅ Sync complete");
        return mergedOperations;
      }
    } catch (error) {
      console.error("❌ Sync failed:", error);
    }
  }

  /**
   * Clear old offline data
   */
  async clearOldData(days = 7) {
    if (!this.db) await this.initDB();

    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["pending_operations"], "readwrite");
      const store = tx.objectStore("pending_operations");
      const request = store.getAll();

      request.onsuccess = () => {
        for (const op of request.result) {
          if (op.synced && op.savedAt < cutoffTime) {
            store.delete(op.operationId);
          }
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export default OfflineSync;
