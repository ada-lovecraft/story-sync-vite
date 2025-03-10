# Token Event System Implementation Plan

This document provides detailed implementation steps for the token event system that will improve UI performance during streaming summaries.

## Current Architecture Review

Currently, our application processes streaming tokens as follows:

1. The `processRoundSummaryQueue` function in the Zustand store fetches and processes streaming responses
2. For each token received, it updates the global store using `updateRound`
3. This triggers re-renders across the application, causing UI jank

## New Architecture Design

The new architecture separates token processing from state updates:

1. Tokens will be dispatched as custom DOM events
2. Components can subscribe to these events to get real-time updates
3. The global store will be updated less frequently
4. Processing will be moved off the main thread using Web Workers

## Implementation Steps

### 1. Create Token Event Utilities (src/utils/tokenEvents.ts)

```typescript
// src/utils/tokenEvents.ts

/**
 * Dispatches a token event for a specific round
 */
export function dispatchTokenEvent(
  roundIndex: number, 
  token: string, 
  metadata: {
    isComplete?: boolean;
    isError?: boolean;
    errorMessage?: string;
  } = {}
) {
  const event = new CustomEvent(`token-stream-${roundIndex}`, {
    detail: { 
      token,
      roundIndex,
      ...metadata
    }
  });
  
  window.dispatchEvent(event);
}

/**
 * Event types for token streaming
 */
export interface TokenStreamEvent {
  token: string;
  roundIndex: number;
  isComplete?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

/**
 * Type for token event callback function
 */
export type TokenEventCallback = (event: TokenStreamEvent) => void;

/**
 * Subscribes to token events for a specific round
 */
export function subscribeToTokenEvents(
  roundIndex: number, 
  callback: TokenEventCallback
): () => void {
  const eventListener = (event: Event) => {
    const customEvent = event as CustomEvent;
    callback(customEvent.detail as TokenStreamEvent);
  };
  
  const eventName = `token-stream-${roundIndex}`;
  window.addEventListener(eventName, eventListener);
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener(eventName, eventListener);
  };
}
```

### 2. Create React Hook for Token Streaming (src/hooks/useTokenStream.ts)

```typescript
// src/hooks/useTokenStream.ts
import { useState, useEffect, useRef } from 'react';
import { subscribeToTokenEvents, TokenStreamEvent } from '@/utils/tokenEvents';

interface UseTokenStreamOptions {
  onComplete?: (text: string) => void;
  onError?: (error: string) => void;
}

/**
 * React hook to subscribe to token stream events for a specific round
 */
export function useTokenStream(roundIndex: number, options: UseTokenStreamOptions = {}) {
  const [text, setText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Use ref to prevent stale closure issues in the event listener
  const textRef = useRef('');
  
  useEffect(() => {
    // Reset state when roundIndex changes
    setText('');
    setIsComplete(false);
    setIsError(false);
    setErrorMessage('');
    textRef.current = '';
    
    // Subscribe to token events
    const unsubscribe = subscribeToTokenEvents(roundIndex, (event) => {
      if (event.token) {
        // Update our local text
        const newText = textRef.current + event.token;
        textRef.current = newText;
        setText(newText);
      }
      
      if (event.isComplete) {
        setIsComplete(true);
        options.onComplete?.(textRef.current);
      }
      
      if (event.isError) {
        setIsError(true);
        setErrorMessage(event.errorMessage || 'Unknown error');
        options.onError?.(event.errorMessage || 'Unknown error');
      }
    });
    
    return unsubscribe;
  }, [roundIndex, options.onComplete, options.onError]);
  
  return {
    text,
    isComplete,
    isError,
    errorMessage
  };
}
```

### 3. Modify Store to Dispatch Token Events (src/store/index.ts)

```typescript
// Add this to src/store/index.ts
import { dispatchTokenEvent } from '@/utils/tokenEvents';

// Inside the readNextChunk function
function readNextChunk() {
  definedReader.read().then(({ value, done: doneReading }) => {
    if (!doneReading && value) {
      const text = decoder.decode(value, { stream: true });
      summary += text;
      
      // Dispatch token event for real-time UI updates
      dispatchTokenEvent(roundIndex, text);
      
      // Update store less frequently (e.g., every 100 characters)
      // This reduces global re-renders while maintaining state consistency
      if (summary.length % 100 === 0) {
        requestAnimationFrame(() => {
          const currentState = useStore.getState();
          currentState.updateRound(roundIndex, { 
            summary: summary.trim(),
            summaryStatus: 'inProgress'
          });
        });
      }
      
      // Continue reading without waiting for frame render
      readNextChunk();
    } else {
      // Stream complete
      dispatchTokenEvent(roundIndex, '', { isComplete: true });
      
      // Final state update
      const currentState = useStore.getState();
      currentState.updateRound(roundIndex, { 
        summary: summary.trim(),
        summaryStatus: 'completed'
      });
      
      // Rest of function remains unchanged
    }
  }).catch(error => {
    // Error handling
    dispatchTokenEvent(roundIndex, '', { 
      isError: true, 
      errorMessage: error.message 
    });
    
    // Update state
    const currentState = useStore.getState();
    currentState.updateRound(roundIndex, { 
      summaryStatus: 'failed' 
    });
    
    // Rest of error handling
  });
}
```

### 4. Create Streaming Summary Component (src/components/StreamingSummary.tsx)

```typescript
// src/components/StreamingSummary.tsx
import { FC, memo } from 'react';
import { useTokenStream } from '@/hooks/useTokenStream';
import { useStore } from '@/store';

interface StreamingSummaryProps {
  roundIndex: number;
  className?: string;
}

/**
 * Component that displays streaming summary text with optimal performance
 */
export const StreamingSummary: FC<StreamingSummaryProps> = memo(({ 
  roundIndex,
  className = ""
}) => {
  // Get round status from store (minimal subscription)
  const { summaryStatus } = useStore(state => {
    const round = state.rounds.find(r => r.roundIndex === roundIndex);
    return {
      summaryStatus: round?.summaryStatus || 'pending'
    };
  });
  
  // Subscribe to token stream
  const { text, isError } = useTokenStream(roundIndex);
  
  // Use the text from token stream for real-time updates
  // This will display each token as it arrives
  const displayText = text || 'No summary available';
  
  // Only apply styling based on status
  return (
    <div className={className}>
      {summaryStatus === 'inProgress' ? (
        <div className="animate-pulse">
          {displayText}
        </div>
      ) : isError ? (
        <div className="text-red-500">
          Failed to generate summary
        </div>
      ) : (
        <div>
          {displayText}
        </div>
      )}
    </div>
  );
});

StreamingSummary.displayName = 'StreamingSummary';
```

## Integration with Existing Code

To maintain the current visual appearance while improving performance, we'll replace direct references to `round.summary` with the new `StreamingSummary` component:

### Example: Updating ChapterTable.tsx

```typescript
// Before
<TableCell className={cn(
  "max-w-md truncate text-left py-1 px-2 text-sm",
  isOmitted && "text-muted-foreground"
)}>
  {isOmitted ? (
    <span className="italic">Omitted from summarization</span>
  ) : (
    <div className="flex items-center space-x-2">
      <span className="truncate">{round.summary || "No summary available"}</span>
    </div>
  )}
</TableCell>

// After
<TableCell className={cn(
  "max-w-md truncate text-left py-1 px-2 text-sm",
  isOmitted && "text-muted-foreground"
)}>
  {isOmitted ? (
    <span className="italic">Omitted from summarization</span>
  ) : (
    <div className="flex items-center space-x-2">
      <StreamingSummary 
        roundIndex={round.roundIndex} 
        className="truncate"
      />
    </div>
  )}
</TableCell>
```

## Testing the Implementation

To verify that the token event system is working correctly:

1. Add the `StreamingSummary` component to a test page
2. Manually trigger token events using the browser console:
   ```javascript
   // In browser console
   window.dispatchTokenEvent = (roundIndex, token, isComplete) => {
     const event = new CustomEvent(`token-stream-${roundIndex}`, {
       detail: { token, roundIndex, isComplete }
     });
     window.dispatchEvent(event);
   }
   
   // Test streaming tokens
   window.dispatchTokenEvent(1, "Hello ", false);
   window.dispatchTokenEvent(1, "world", false);
   window.dispatchTokenEvent(1, "!", true);
   ```
3. Verify that the component displays the tokens as they arrive
4. Check that UI remains responsive during token streaming 