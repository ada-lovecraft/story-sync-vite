import { dispatchTokenEvent } from '@/utils/tokenEvents';
import { WorkerMessage, WorkerResponse, WorkerMessageType, WorkerResponseType } from '@/workers/streamProcessor.worker';

/**
 * WorkerManager class
 * 
 * Manages Web Worker instances for stream processing.
 * Uses MessageChannel for fast communication between the main thread and worker.
 */
export class WorkerManager {
  private worker: Worker | null = null;
  private port1: MessagePort | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private useFallback = false;
  
  // Keep track of active streams for cleanup
  private activeStreams = new Set<number>();
  
  /**
   * Initialize the worker
   */
  init(): Promise<void> {
    // If already initialized, return resolved promise
    if (this.isInitialized) {
      return Promise.resolve();
    }
    
    // Return existing promise if initialization is in progress
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = new Promise((resolve, reject) => {
      try {
        // Check if Web Workers are supported
        if (typeof Worker === 'undefined') {
          console.warn('Web Workers not supported, falling back to main thread processing');
          this.isInitialized = true;
          this.useFallback = true;
          resolve();
          return;
        }
        
        // Create MessageChannel for fast communication
        const channel = new MessageChannel();
        this.port1 = channel.port1;
        
        // Set up port message handler
        this.port1.onmessage = this.handlePortMessage.bind(this);
        
        // Create worker
        this.worker = new Worker(
          new URL('../workers/streamProcessor.worker.ts', import.meta.url),
          { type: 'module' }
        );
        
        // Set up worker message handler
        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const { type, data } = event.data;
          
          if (type === 'WORKER_INITIALIZED') {
            this.isInitialized = true;
            resolve();
          } else {
            this.handleWorkerMessage(type, data);
          }
        };
        
        // Set up error handler
        this.worker.onerror = (error) => {
          console.error('Worker error:', error);
          reject(error);
        };
        
        // Initialize worker and transfer port2 to it
        this.worker.postMessage(
          { 
            type: 'WORKER_READY',
            data: { port: channel.port2 }
          } as WorkerMessage, 
          [channel.port2]
        );
        
      } catch (error) {
        console.error('Failed to initialize worker:', error);
        this.useFallback = true;
        reject(error);
      }
    });
    
    return this.initPromise;
  }
  
  /**
   * Handle messages from the worker's MessagePort
   */
  private handlePortMessage(event: MessageEvent): void {
    const { type, data } = event.data as { type: string; data: any };
    
    switch (type) {
      case 'TOKEN':
        // Forward token to the token event system
        if (data.roundIndex !== undefined && data.token !== undefined) {
          dispatchTokenEvent(data.roundIndex, data.token);
        }
        break;
        
      case 'PROGRESS':
        // Handle progress updates if needed
        break;
    }
  }
  
  /**
   * Handle messages directly from the worker (less frequent updates)
   */
  private handleWorkerMessage(type: WorkerResponseType, data: any): void {
    const { roundIndex } = data;
    
    switch (type) {
      case 'TOKEN':
        // Forward token events to the UI
        dispatchTokenEvent(roundIndex, data.token);
        break;
        
      case 'STREAM_STARTED':
        // Update round status to inProgress
        this.updateStore(roundIndex, { 
          summaryStatus: 'inProgress'
        });
        break;
        
      case 'UPDATE_STORE':
        // Update the store with current summary text
        this.updateStore(roundIndex, {
          summary: data.summary,
          summaryStatus: data.status
        });
        break;
        
      case 'STREAM_COMPLETED':
        // Mark as complete in the store
        this.updateStore(roundIndex, {
          summary: data.summary,
          summaryStatus: 'completed'
        });
        
        // Send completion event and remove from active streams
        dispatchTokenEvent(roundIndex, '', { isComplete: true });
        this.activeStreams.delete(roundIndex);
        break;
        
      case 'STREAM_ERROR':
        // Log the error
        console.error(`Stream error for round ${roundIndex}:`, data.error);
        
        // Mark as failed in the store
        this.updateStore(roundIndex, {
          summaryStatus: 'failed'
        });
        
        // Send detailed error event
        dispatchTokenEvent(roundIndex, '', { 
          isError: true,
          errorMessage: data.error || 'Unknown error processing stream'
        });
        
        // Remove from active streams
        this.activeStreams.delete(roundIndex);
        
        // Report to error monitoring system if available
        if (typeof window !== 'undefined') {
          try {
            // Check if Sentry or any error monitoring is available
            const anyWindow = window as any;
            if (anyWindow.__SENTRY__ || anyWindow.Sentry) {
              const errorMonitor = anyWindow.__SENTRY__ || anyWindow.Sentry;
              errorMonitor.captureException(new Error(`Stream error: ${data.error}`));
            }
          } catch (e) {
            // Ignore errors from error reporting
          }
        }
        break;
        
      case 'STREAM_CANCELLED':
        // Log cancellation
        console.log(`Stream cancelled for round ${roundIndex}`);
        
        // Handle cancellation, optionally update UI
        this.activeStreams.delete(roundIndex);
        
        // Notify UI of cancellation
        dispatchTokenEvent(roundIndex, '', { 
          isComplete: true,
          isError: false
        });
        break;
    }
  }
  
  /**
   * Update the store with round data
   */
  private updateStore(roundIndex: number, updates: any): void {
    // Import dynamically to avoid circular dependencies
    import('@/store').then(({ useStore }) => {
      useStore.getState().updateRound(roundIndex, updates);
    });
  }
  
  /**
   * Start streaming for a round
   */
  async startStream(roundIndex: number, prompt: string, apiEndpoint: string): Promise<void> {
    await this.init();
    
    // If worker is not initialized or using fallback, handle stream in main thread
    if (!this.worker || this.useFallback) {
      await this.fallbackProcessStream(roundIndex, prompt, apiEndpoint);
      return;
    }
    
    // Keep track of this stream
    this.activeStreams.add(roundIndex);
    
    // Start the stream
    this.worker.postMessage({
      type: 'START_STREAM',
      data: { roundIndex, prompt, apiEndpoint }
    } as WorkerMessage);
  }
  
  /**
   * Cancel streaming for a round
   */
  cancelStream(roundIndex: number): void {
    // If not tracking this stream, nothing to do
    if (!this.activeStreams.has(roundIndex)) {
      return;
    }
    
    if (this.worker && this.isInitialized) {
      this.worker.postMessage({
        type: 'CANCEL_STREAM',
        data: { roundIndex }
      } as WorkerMessage);
    }
    
    // Always update the store to ensure consistency
    this.updateStore(roundIndex, {
      summaryStatus: 'failed',
      error: 'Cancelled by user'
    });
    
    // Remove from active streams
    this.activeStreams.delete(roundIndex);
    
    // Dispatch event to notify token event listeners
    dispatchTokenEvent(roundIndex, '', { 
      isComplete: true,
      isCancelled: true
    });
  }
  
  /**
   * Abort all active streams
   */
  abortAll(): void {
    // Make a copy to avoid issues with deleting during iteration
    const activeStreams = [...this.activeStreams];
    
    // Cancel each stream
    activeStreams.forEach(roundIndex => {
      this.cancelStream(roundIndex);
    });
  }
  
  /**
   * Retry a failed stream
   */
  retryStream(roundIndex: number): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        // Import store dynamically to avoid circular dependencies
        const { useStore } = await import('@/store');
        const store = useStore.getState();
        
        // Get the round
        const round = store.rounds.find(r => r.roundIndex === roundIndex);
        if (!round) {
          reject(new Error(`Round with index ${roundIndex} not found`));
          return;
        }
        
        // Extract DM content
        const { dmContent } = extractBlocks(round.rawContent || '');
        if (!dmContent) {
          reject(new Error('No dungeon master content found'));
          return;
        }
        
        // Prepare the prompt
        const roundPrompt = "Summarize the following narrative excerpt in 1-2 sentences, focusing on the key plot developments: [[narrative-excerpt]]";
        const prompt = roundPrompt.replace("[[narrative-excerpt]]", dmContent);
        
        // Start streaming again
        await this.startStream(roundIndex, prompt, 'http://localhost:4000/generate');
        
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Terminate the worker
   */
  terminate(): void {
    // Cancel all active streams first
    for (const roundIndex of this.activeStreams) {
      this.cancelStream(roundIndex);
    }
    
    // Clean up
    if (this.port1) {
      this.port1.close();
      this.port1 = null;
    }
    
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.initPromise = null;
    }
  }
  
  /**
   * Fallback method for browsers without Worker support
   */
  private async fallbackProcessStream(
    roundIndex: number, 
    prompt: string, 
    apiEndpoint: string
  ): Promise<void> {
    try {
      // Keep track of this stream
      this.activeStreams.add(roundIndex);
      
      // Update status to in-progress
      this.updateStore(roundIndex, { summaryStatus: 'inProgress' });
      
      // Create an AbortController for cancellation
      const abortController = new AbortController();
      
      // Maximum number of retries for transient errors
      const MAX_RETRIES = 3;
      let retryCount = 0;
      let success = false;
      
      while (retryCount < MAX_RETRIES && !success) {
        try {
          // Make API request with exponential backoff for retries
          const backoffTime = retryCount > 0 ? Math.pow(2, retryCount) * 500 : 0;
          if (backoffTime > 0) {
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          }
          
          // Make API request
          const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({ 
              prompt, 
              model: 'gpt-4o-mini',
              temperature: 0.7,
              maxTokens: 256,
              streamingEnabled: true
            }),
            signal: abortController.signal
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
          }
          
          // Get reader from response
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('Failed to get reader from response');
          }
          
          // Process the stream
          const decoder = new TextDecoder();
          let summary = '';
          let lastUpdateTime = 0;
          const UPDATE_INTERVAL_MS = 100; // Update store every 100ms
          
          // Process chunks
          while (true) {
            // Check if this stream has been canceled
            if (!this.activeStreams.has(roundIndex)) {
              reader.cancel();
              return;
            }
            
            const { value, done } = await reader.read();
            
            if (done) break;
            
            // Decode chunk
            const text = decoder.decode(value, { stream: true });
            summary += text;
            
            // Dispatch token event for real-time UI updates
            dispatchTokenEvent(roundIndex, text);
            
            // Update store less frequently
            const now = Date.now();
            if (now - lastUpdateTime >= UPDATE_INTERVAL_MS) {
              this.updateStore(roundIndex, {
                summary: summary.trim(),
                summaryStatus: 'inProgress'
              });
              lastUpdateTime = now;
            }
          }
          
          // Stream complete - update store with final summary
          this.updateStore(roundIndex, {
            summary: summary.trim(),
            summaryStatus: 'completed'
          });
          
          // Dispatch completion event
          dispatchTokenEvent(roundIndex, '', { isComplete: true });
          
          // Stream was successful
          success = true;
          
        } catch (error) {
          // Don't retry on user cancellation
          if (error.name === 'AbortError') {
            throw error;
          }
          
          retryCount++;
          
          // If we've hit max retries, throw the error
          if (retryCount >= MAX_RETRIES) {
            throw error;
          }
          
          // Log retry attempt
          console.warn(`Retry ${retryCount}/${MAX_RETRIES} for round ${roundIndex}: ${error.message}`);
          
          // Update store to indicate retry
          this.updateStore(roundIndex, {
            error: `Retrying (${retryCount}/${MAX_RETRIES}): ${error.message}`,
            summaryStatus: 'inProgress'
          });
          
          // Dispatch error event (but not full failure since we're retrying)
          dispatchTokenEvent(roundIndex, '', { 
            isError: true,
            isRetrying: true,
            errorMessage: `Retrying (${retryCount}/${MAX_RETRIES}): ${error.message}`
          });
        }
      }
      
      // Remove from active streams when complete
      this.activeStreams.delete(roundIndex);
      
    } catch (error) {
      console.error(`Stream error for round ${roundIndex}:`, error);
      
      // Update the store with error status
      this.updateStore(roundIndex, {
        summaryStatus: 'failed',
        error: error.message || 'Unknown error'
      });
      
      // Dispatch error event
      dispatchTokenEvent(roundIndex, '', { 
        isError: true,
        errorMessage: error.message || 'Unknown error'
      });
      
      // Remove from active streams
      this.activeStreams.delete(roundIndex);
    }
  }
}

// Create singleton instance
export const workerManager = new WorkerManager(); 