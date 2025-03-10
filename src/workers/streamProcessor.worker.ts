/**
 * Stream Processor Worker
 * 
 * This Web Worker handles the processing of streaming responses from the API.
 * It offloads token processing from the main thread to improve UI responsiveness.
 */

// Define message types for worker communication
export type WorkerMessageType = 
  | 'START_STREAM' 
  | 'CANCEL_STREAM' 
  | 'WORKER_READY';

export type WorkerResponseType = 
  | 'WORKER_INITIALIZED'
  | 'STREAM_STARTED'
  | 'TOKEN'
  | 'UPDATE_STORE'
  | 'STREAM_COMPLETED'
  | 'STREAM_CANCELLED'
  | 'STREAM_ERROR';

export interface WorkerMessage {
  type: WorkerMessageType;
  data: any;
}

export interface WorkerResponse {
  type: WorkerResponseType;
  data: any;
}

// Track active streams to enable cancellation
const activeStreams = new Map<number, AbortController>();

// MessagePort for fast communication with the main thread
let messagePort: MessagePort | null = null;

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
      // If message contains a port, set it up
      if (data.port instanceof MessagePort) {
        setupMessagePort(data.port);
      }
      
      // Respond that the worker is initialized
      self.postMessage({ 
        type: 'WORKER_INITIALIZED' 
      } as WorkerResponse);
      break;
  }
};

/**
 * Set up the MessagePort for fast communication
 */
function setupMessagePort(port: MessagePort): void {
  messagePort = port;
  messagePort.onmessage = handlePortMessage;
  messagePort.start();
}

/**
 * Handle messages from the MessagePort
 */
function handlePortMessage(event: MessageEvent): void {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CANCEL_STREAM':
      cancelStream(data.roundIndex);
      break;
      
    // Add more handlers as needed
  }
}

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
    } as WorkerResponse);
    
    // Process chunks
    while (true) {
      const { value, done } = await reader.read();
      
      if (done) break;
      
      // Decode chunk
      const text = decoder.decode(value, { stream: true });
      summary += text;
      
      // Send token to main thread via MessagePort (fast path) if available
      if (messagePort) {
        messagePort.postMessage({
          type: 'TOKEN',
          data: {
            roundIndex,
            token: text
          }
        });
      } else {
        // Fallback to regular postMessage
        self.postMessage({
          type: 'TOKEN',
          data: {
            roundIndex,
            token: text
          }
        } as WorkerResponse);
      }
      
      // Periodically update the store to ensure state consistency (slower path)
      const now = Date.now();
      if (now - lastUpdateTime >= UPDATE_INTERVAL_MS) {
        self.postMessage({
          type: 'UPDATE_STORE',
          data: {
            roundIndex,
            summary: summary.trim(),
            status: 'inProgress'
          }
        } as WorkerResponse);
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
    } as WorkerResponse);
    
    // Clean up
    activeStreams.delete(roundIndex);
    
  } catch (error: any) {
    // Check if this was an abort error
    if (error.name === 'AbortError') {
      self.postMessage({
        type: 'STREAM_CANCELLED',
        data: { roundIndex }
      } as WorkerResponse);
    } else {
      // Other errors
      self.postMessage({
        type: 'STREAM_ERROR',
        data: {
          roundIndex,
          error: error.message || 'Unknown error'
        }
      } as WorkerResponse);
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