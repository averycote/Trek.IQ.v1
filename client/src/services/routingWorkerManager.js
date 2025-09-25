/**
 * Routing Web Worker Manager
 * 
 * Manages communication with the routing Web Worker for heavy operations.
 * Provides a clean interface for off-main-thread routing computations.
 */

class RoutingWorkerManager {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
    this.pendingRequests = new Map();
    this.requestCounter = 0;
  }

  /**
   * Initialize the Web Worker
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create Web Worker
      this.worker = new Worker(new URL('../workers/routingWorker.js', import.meta.url));
      
      // Set up message handler
      this.worker.onmessage = (e) => {
        this.handleWorkerMessage(e.data);
      };
      
      this.worker.onerror = (error) => {
        console.error('❌ Routing Worker error:', error);
        this.handleWorkerError(error);
      };
      
      this.isInitialized = true;
      console.log('✅ Routing Web Worker initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Routing Web Worker:', error);
      throw error;
    }
  }

  /**
   * Handle messages from the Web Worker
   */
  handleWorkerMessage(data) {
    const { type, requestId, data: responseData, error } = data;
    
    if (error) {
      this.handleWorkerError({ requestId, error });
      return;
    }
    
    const pendingRequest = this.pendingRequests.get(requestId);
    if (!pendingRequest) {
      console.warn(`⚠️ Received response for unknown request: ${requestId}`);
      return;
    }
    
    // Resolve the promise
    pendingRequest.resolve(responseData);
    this.pendingRequests.delete(requestId);
  }

  /**
   * Handle Web Worker errors
   */
  handleWorkerError(error) {
    const { requestId, error: errorMessage } = error;
    
    if (requestId) {
      const pendingRequest = this.pendingRequests.get(requestId);
      if (pendingRequest) {
        pendingRequest.reject(new Error(errorMessage));
        this.pendingRequests.delete(requestId);
      }
    } else {
      // Global worker error
      console.error('❌ Global Web Worker error:', errorMessage);
    }
  }

  /**
   * Send message to Web Worker and return a promise
   */
  async sendMessage(type, data, timeout = 30000) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const requestId = ++this.requestCounter;
    
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Worker request timeout: ${type}`));
      }, timeout);
      
      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve: (data) => {
          clearTimeout(timeoutId);
          resolve(data);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      });
      
      // Send message to worker
      this.worker.postMessage({
        type,
        data,
        requestId
      });
    });
  }

  /**
   * Build routing graph in Web Worker
   */
  async buildGraph(activeTravelways, steps) {
    return await this.sendMessage('BUILD_GRAPH', {
      activeTravelways,
      steps
    });
  }

  /**
   * Find optimal path in Web Worker
   */
  async findPath(graph, startCoord, endCoord, options = {}) {
    return await this.sendMessage('FIND_PATH', {
      graph,
      startCoord,
      endCoord,
      options
    });
  }

  /**
   * Calculate distances in Web Worker
   */
  async calculateDistances(routeEdges, nodes) {
    return await this.sendMessage('CALCULATE_DISTANCES', {
      routeEdges,
      nodes
    });
  }

  /**
   * Generate directions in Web Worker
   */
  async generateDirections(routeEdges, nodes) {
    return await this.sendMessage('GENERATE_DIRECTIONS', {
      routeEdges,
      nodes
    });
  }

  /**
   * Calculate route score in Web Worker
   */
  async calculateScore(routeEdges, options = {}) {
    return await this.sendMessage('CALCULATE_SCORE', {
      routeEdges,
      options
    });
  }

  /**
   * Terminate the Web Worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.pendingRequests.clear();
      console.log('🛑 Routing Web Worker terminated');
    }
  }

  /**
   * Get worker status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      pendingRequests: this.pendingRequests.size,
      requestCounter: this.requestCounter
    };
  }
}

// Export singleton instance
const routingWorkerManager = new RoutingWorkerManager();
export default routingWorkerManager;
