# Web Worker Implementation Plan

This document provides detailed steps for implementing the Web Worker part of the streaming performance optimization solution.

## Current Architecture Review

Currently, all API requests and token processing happen on the main UI thread:

1. The `processRoundSummaryQueue` function directly makes fetch requests
2. It processes response streams on the main thread using `readNextChunk`
3. This processing can block the UI thread during intensive operations

## Benefits of Web Workers

1. Offload CPU-intensive tasks from the main thread
2. Prevent UI jank during stream processing
3. Enable parallel processing of multiple streams
4. Improve overall application responsiveness

## Implementation Steps

### 1. Create the Stream Worker (src/workers/streamProcessor.worker.ts)

```typescript
// src/workers/streamProcessor.worker.ts

// Define message types
type WorkerMessageType = 
  | 'START_STREAM' 
  | 'CANCEL_STREAM' 
  | 'WORKER_READY';

interface WorkerMessage {
  type: WorkerMessageType;
  data: any;
}

// Track active streams
const activeStreams = new Map<number, AbortController>();

// Handle incoming messages from the main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'START_STREAM':
      await processStream(data);
      break;
      
    case 'CANCEL_STREAM':
      cancelStream(data.roundIndex);
      break;
      
    case 'WORKER_READY':
      // Respond that the worker is initialized
      self.postMessage({ type: 'WORKER_INITIALIZED' });
      break;
  }
};

/**
 * Process a streaming request for a round summary
 */
async function processStream(data: {
  roundIndex: number;
  prompt: string;
  apiEndpoint: string;
}) {
  const { roundIndex, prompt, apiEndpoint } = data;
  
  // Create abort controller for this stream
  const abortController = new AbortController();
  activeStreams.set(roundIndex, abortController);
  
  try {
    // Make API request
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: 'gpt-4o-mini' }),
      signal: abortController.signal
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    // Get reader from stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get reader from response');
    }
    
    // Process stream
    const decoder = new TextDecoder();
    let summary = '';
    let lastUpdateTime = 0;
    const UPDATE_INTERVAL_MS = 100; // Update store every 100ms
    
    // Notify that streaming has started
    self.postMessage({
      type: 'STREAM_STARTED',
      data: { roundIndex }
    });
    
    // Process chunks
    while (true) {
      const { value, done } = await reader.read();
      
      if (done) break;
      
      // Decode chunk
      const text = decoder.decode(value, { stream: true });
      summary += text;
      
      // Always post token events for real-time UI updates
      self.postMessage({
        type: 'TOKEN',
        data: {
          roundIndex,
          token: text
        }
      });
      
      // Periodically update the store to ensure state consistency
      const now = Date.now();
      if (now - lastUpdateTime >= UPDATE_INTERVAL_MS) {
        self.postMessage({
          type: 'UPDATE_STORE',
          data: {
            roundIndex,
            summary: summary.trim(),
            status: 'inProgress'
          }
        });
        lastUpdateTime = now;
      }
    }
    
    // Stream complete - send final update
    self.postMessage({
      type: 'STREAM_COMPLETED',
      data: {
        roundIndex,
        summary: summary.trim()
      }
    });
    
    // Clean up
    activeStreams.delete(roundIndex);
    
  } catch (error) {
    // Check if this was an abort error
    if (error.name === 'AbortError') {
      self.postMessage({
        type: 'STREAM_CANCELLED',
        data: { roundIndex }
      });
    } else {
      // Other errors
      self.postMessage({
        type: 'STREAM_ERROR',
        data: {
          roundIndex,
          error: error.message || 'Unknown error'
        }
      });
    }
    
    // Clean up
    activeStreams.delete(roundIndex);
  }
}

/**
 * Cancel an active stream
 */
function cancelStream(roundIndex: number) {
  const controller = activeStreams.get(roundIndex);
  if (controller) {
    controller.abort();
    activeStreams.delete(roundIndex);
  }
}
```

### 2. Create Worker Manager (src/services/workerManager.ts)

```typescript
// src/services/workerManager.ts
import { dispatchTokenEvent } from '@/utils/tokenEvents';

/**
 * Manages Web Worker instances for stream processing
 */
class WorkerManager {
  private worker: Worker | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  
  /**
   * Initialize the worker
   */
  init(): Promise<void> {
    if (this.isInitialized) {
      return Promise.resolve();
    }
    
    // Return existing promise if initialization is in progress
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = new Promise((resolve, reject) => {
      try {
        // Create worker
        this.worker = new Worker(
          new URL('../workers/streamProcessor.worker.ts', import.meta.url),
          { type: 'module' }
        );
        
        // Set up message handler
        this.worker.onmessage = (event) => {
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
        
        // Initialize worker
        this.worker.postMessage({ type: 'WORKER_READY' });
        
      } catch (error) {
        console.error('Failed to initialize worker:', error);
        reject(error);
      }
    });
    
    return this.initPromise;
  }
  
  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(type: string, data: any) {
    const { roundIndex } = data;
    
    switch (type) {
      case 'TOKEN':
        // Forward token events to the UI
        dispatchTokenEvent(roundIndex, data.token);
        break;
        
      case 'STREAM_STARTED':
        // Update round status to inProgress
        useStore.getState().updateRound(roundIndex, { 
          summaryStatus: 'inProgress'
        });
        break;
        
      case 'UPDATE_STORE':
        // Update the store with current summary text
        useStore.getState().updateRound(roundIndex, {
          summary: data.summary,
          summaryStatus: data.status
        });
        break;
        
      case 'STREAM_COMPLETED':
        // Mark as complete in the store
        useStore.getState().updateRound(roundIndex, {
          summary: data.summary,
          summaryStatus: 'completed'
        });
        
        // Send completion event
        dispatchTokenEvent(roundIndex, '', { isComplete: true });
        break;
        
      case 'STREAM_ERROR':
        // Mark as failed in the store
        useStore.getState().updateRound(roundIndex, {
          summaryStatus: 'failed'
        });
        
        // Send error event
        dispatchTokenEvent(roundIndex, '', { 
          isError: true,
          errorMessage: data.error
        });
        break;
        
      case 'STREAM_CANCELLED':
        // Handle cancellation, optionally update UI
        break;
    }
  }
  
  /**
   * Start streaming for a round
   */
  async startStream(roundIndex: number, prompt: string, apiEndpoint: string) {
    await this.init();
    
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }
    
    // Start the stream
    this.worker.postMessage({
      type: 'START_STREAM',
      data: { roundIndex, prompt, apiEndpoint }
    });
  }
  
  /**
   * Cancel streaming for a round
   */
  cancelStream(roundIndex: number) {
    if (!this.worker || !this.isInitialized) {
      return;
    }
    
    this.worker.postMessage({
      type: 'CANCEL_STREAM',
      data: { roundIndex }
    });
  }
  
  /**
   * Terminate the worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.initPromise = null;
    }
  }
}

// Create singleton instance
export const workerManager = new WorkerManager();
```

### 3. Update Queue Processor to Use the Worker Manager (src/store/index.ts)

```typescript
// Modify the processRoundSummaryQueue function in store/index.ts
import { workerManager } from '@/services/workerManager';

// Inside the processRoundSummaryQueue function
processRoundSummaryQueue: async () => {
  const state = useStore.getState();
  
  // If queue is empty or already processing, don't proceed
  if (state.roundSummaryQueue.length === 0 || state.isProcessingQueue) {
    return;
  }
  
  // Set processing flag
  set({ isProcessingQueue: true });
  
  try {
    // Get the first item in the queue (highest priority)
    const queueItem = state.roundSummaryQueue[0];
    
    if (queueItem.type !== 'round') {
      // Skip non-round items (would be handled by a different processor)
      return;
    }
    
    const roundIndex = queueItem.id;
    
    // Get the round
    const round = state.rounds.find(r => r.roundIndex === roundIndex);
    
    if (!round) {
      console.error(`Round with index ${roundIndex} not found in rounds array`);
      // Remove from queue and continue
      set((state) => ({
        roundSummaryQueue: state.roundSummaryQueue.filter((_, i) => i !== 0),
        isProcessingQueue: false
      }));
      return;
    }
    
    // Extract roundContent - Similar to current implementation
    let roundContent = round.rawContent;
    // ... (extract content as currently implemented)
    
    // Extract DM content from the raw content
    const { dmContent } = extractBlocks(roundContent);
    if (!dmContent) {
      console.error("No dungeon master content found in the round");
      // Update queue item status to failed
      set((state) => {
        const newQueue = [...state.roundSummaryQueue];
        newQueue.shift(); // Remove the first item (current)
        return {
          roundSummaryQueue: newQueue,
          isProcessingQueue: false
        };
      });
      return;
    }
    
    // Update round status to inProgress
    state.updateRound(roundIndex, { summaryStatus: 'inProgress' });
    
    // Prepare the prompt by replacing the placeholder
    const prompt = roundPrompt.replace("[[narrative-excerpt]]", dmContent);
    
    // Start streaming using worker manager
    await workerManager.startStream(
      roundIndex,
      prompt,
      'http://localhost:4000/generate'
    );
    
    // The worker manager will handle all the streaming and state updates
    // We can immediately remove this item from the queue and process the next one
    set((state) => {
      const newQueue = [...state.roundSummaryQueue];
      newQueue.shift(); // Remove the first item (current)
      
      // Continue processing if there are more items
      if (newQueue.length > 0) {
        requestAnimationFrame(() => {
          useStore.getState().processRoundSummaryQueue();
        });
      }
      
      return {
        roundSummaryQueue: newQueue,
        isProcessingQueue: false
      };
    });
    
  } catch (error) {
    console.error('Error processing queue:', error);
    
    // Reset processing flag
    set({ isProcessingQueue: false });
  }
},
```

### 4. Add Helper Hook for Cancellation (src/hooks/useCancelableStream.ts)

```typescript
// src/hooks/useCancelableStream.ts
import { useEffect } from 'react';
import { workerManager } from '@/services/workerManager';

/**
 * Hook to ensure stream is canceled when component unmounts
 */
export function useCancelableStream(roundIndex: number | null) {
  useEffect(() => {
    // Nothing to do if no roundIndex
    if (roundIndex === null) return;
    
    // Return cleanup function
    return () => {
      workerManager.cancelStream(roundIndex);
    };
  }, [roundIndex]);
}
```

### 5. Update App Component to Initialize Worker

```typescript
// src/components/App.tsx or similar
import { useEffect } from 'react';
import { workerManager } from '@/services/workerManager';

export function App() {
  // Initialize worker when app loads
  useEffect(() => {
    workerManager.init().catch(error => {
      console.error('Failed to initialize worker:', error);
    });
    
    // Cleanup on unmount
    return () => {
      workerManager.terminate();
    };
  }, []);
  
  // Rest of component
}
```

## Integration with Existing Code

To ensure a smooth integration with the token event system and existing components:

### Example: Adding Worker Support to RerollButton

```typescript
// src/components/RerollButton.tsx
import { FC } from 'react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store';
import { workerManager } from '@/services/workerManager';

interface RerollButtonProps {
  roundIndex: number;
  onReroll?: (roundIndex: number) => void;
}

export const RerollButton: FC<RerollButtonProps> = ({
  roundIndex,
  onReroll
}) => {
  const { rerollRoundSummary } = useStore();
  
  const handleReroll = async () => {
    // Call onReroll callback if provided
    if (onReroll) {
      onReroll(roundIndex);
    }
    
    // Mark for reroll in store
    rerollRoundSummary(roundIndex);
    
    // Start processing the queue
    useStore.getState().processRoundSummaryQueue();
  };
  
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleReroll}
      className="h-7 px-2 text-xs"
    >
      <RefreshIcon className="h-3 w-3 mr-1" />
      Reroll
    </Button>
  );
};
```

## Browser Compatibility

Web Workers are supported in all modern browsers, but there are a few considerations:

1. Some older browsers might have limited Worker features
2. Safari has some limitations with worker modules
3. Mobile browsers may have different performance characteristics

To handle these edge cases, add a feature detection fallback:

```typescript
// In workerManager.ts
init(): Promise<void> {
  // Check if Web Workers are supported
  if (typeof Worker === 'undefined') {
    console.warn('Web Workers not supported, falling back to main thread processing');
    this.isInitialized = true;
    this.useFallback = true;
    return Promise.resolve();
  }
  
  // Rest of initialization code
}

// Add fallback processing method
async fallbackProcessStream(roundIndex: number, prompt: string, apiEndpoint: string) {
  // Similar implementation to the current in-thread processing
  // but with token event dispatch
}

// In startStream method
async startStream(roundIndex: number, prompt: string, apiEndpoint: string) {
  await this.init();
  
  if (this.useFallback) {
    return this.fallbackProcessStream(roundIndex, prompt, apiEndpoint);
  }
  
  // Worker-based implementation
}
```

## Testing the Implementation

To verify that the Web Worker implementation is working correctly:

1. Use browser DevTools to monitor CPU usage during streaming
2. Check the "Performance" tab to verify processing is happening off the main thread
3. Test with multiple simultaneous streams to ensure they process in parallel
4. Verify that UI remains responsive during intensive streaming operations
5. Test cancellation by navigating away during an active stream

### Example Test Procedure

1. Open the application and navigate to the round summary view
2. Open Chrome DevTools and go to the Performance tab
3. Start recording
4. Trigger multiple round summaries at once
5. Observe CPU usage and thread activity in the Performance panel
6. Verify UI responsiveness by interacting with other elements during streaming
7. Stop recording and analyze the results
8. Check that the main thread is not blocked by stream processing
</rewritten_file> 