# Dev Story: Real-Time Streaming Performance Optimization

## Overview

This dev story addresses the UI performance issue during round summary streaming without compromising the real-time token display feature. The goal is to maintain the current visual design and layout while eliminating UI jank and freezing that occurs during token streaming.

## Background

As identified in `issue-report-ui-slowdown-during-queue-processing.md`, our application experiences UI slowdown when processing the stream of tokens for round summaries. The current implementation updates the global Zustand store on every token, triggering extensive re-renders across the application. We need to optimize this process while preserving the real-time token display that users expect.

## Architecture Changes

The solution involves:
1. Creating a token event system that bypasses the global store for real-time updates
2. Using Web Workers to offload processing from the main thread
3. Implementing component-level optimizations for rendering tokens
4. Optimizing the store update patterns to reduce re-renders

## Tasks

### Phase 1: Token Event System [COMPLETE]

#### Documentation
For detailed implementation instructions, see [implementation-token-event-system.md](./implementation-token-event-system.md).

#### Tasks
- [x] **1.1 Design Custom Event System**  
  Create a custom event emitter for token streaming that components can subscribe to.
  
- [x] **1.2 Implement Token Event Dispatcher**  
  Add a function to dispatch token events when new tokens are received from the stream.
  
- [x] **1.3 Create Token Event Subscription Hook**  
  Build a React hook (`useTokenStream`) that components can use to subscribe to token events.
  
- [x] **1.4 Add Event Cleanup**  
  Ensure proper cleanup of event listeners when components unmount.

#### Steps Taken
- Created `src/utils/tokenEvents.ts` with base utilities for the token event system:
  - Defined the `TokenStreamEvent` interface for structured event data
  - Created `getTokenEventName` utility for consistent event naming
  - Implemented `dispatchTokenEvent` function to emit token events
  - Added `subscribeToTokenEvents` function for components to listen to token streams
- Added comprehensive tests in `src/utils/tokenEvents.test.ts`
- Ensured SSR compatibility by checking for window existence
- Added proper TypeScript typing for all functions and interfaces
- Modified `processRoundSummaryQueue` in the store to use token events:
  - Added import for `dispatchTokenEvent` in `src/store/index.ts`
  - Updated `readNextChunk` to dispatch token events for real-time updates
  - Optimized global store updates to be less frequent (every 100 characters)
  - Added token events for completion and error states
  - Decoupled token processing from UI updates to improve performance
- Created React hook for token streaming:
  - Implemented `useTokenStream` hook in `src/hooks/useTokenStream.ts`
  - Added options for callbacks (onComplete, onError) and initial text
  - Implemented automatic cleanup when component unmounts
  - Used a ref to avoid stale closure issues with event callbacks
  - Returned helpful properties (text, isComplete, isError, isStreaming)
  - Added comprehensive tests in `src/hooks/useTokenStream.test.ts`
- Implemented event cleanup functionality:
  - Created `useCancelableStream` hook in `src/hooks/useCancelableStream.ts`
  - Added automatic cleanup when components unmount or roundIndex changes
  - Implemented manual cancellation via the `cancel` method
  - Added proper cancellation events to notify the store and UI
  - Wrote tests in `src/hooks/useCancelableStream.test.ts`

### Phase 2: Web Worker Implementation [COMPLETE]

#### Documentation
For detailed implementation instructions, see [implementation-web-worker.md](./implementation-web-worker.md).

#### Tasks
- [x] **2.1 Create Stream Processor Worker**  
  Implement a Web Worker (`streamProcessor.worker.ts`) to handle token streaming off the main thread.
  
- [x] **2.2 Set Up Message Channel**  
  Implement a MessageChannel for fast communication between the worker and UI components.
  
- [x] **2.3 Handle Worker Lifecycle**  
  Add proper initialization and cleanup of workers to prevent memory leaks.
  
- [x] **2.4 Implement Error Handling**  
  Add robust error handling for stream processing failures.

#### Steps Taken
- Created `src/workers/streamProcessor.worker.ts` for off-main-thread processing:
  - Defined message types and interfaces for typed communication
  - Implemented stream processing with AbortController for cancellation
  - Added token dispatch for real-time UI updates
  - Created periodic store updates to maintain consistency
  - Implemented proper cleanup and error handling
- Implemented MessageChannel for fast communication:
  - Created `src/services/workerManager.ts` to manage worker instances
  - Added MessageChannel for high-performance token streaming
  - Set up dual communication paths (MessagePort for tokens, postMessage for state updates)
  - Added fallback implementation for browsers without Worker support
  - Implemented stream tracking and cancellation support
- Added worker lifecycle management:
  - Created `src/hooks/useWorkerManager.ts` hook to handle worker initialization and cleanup
  - Implemented React context for worker state with `src/components/WorkerProvider.tsx`
  - Added application-wide worker provider in the main App component
  - Added cleanup on component unmount and page unload
  - Implemented browser compatibility checks and fallbacks
- Implemented robust error handling:
  - Created `src/components/StreamErrorBoundary.tsx` for catching and displaying stream errors
  - Added `src/hooks/useStreamErrorHandler.ts` for managing error states and retries
  - Enhanced worker manager with detailed error reporting and logging
  - Added automatic retry mechanism with configurable retry limits
  - Implemented error reporting integration with monitoring systems

### Phase 3: Component-Level Optimizations [COMPLETE]

#### Tasks
- [x] **3.1 Create StreamingSummary Component**  
  Build a specialized component that efficiently handles streaming text display.
  
- [x] **3.2 Add Local State Management**  
  Implement component-level state for tracking token accumulation.
  
- [x] **3.3 Add requestIdleCallback Integration**  
  Use browser idle time for non-critical UI updates.
  
- [x] **3.4 Optimize Render Cycles**  
  Use React's `useTransition` to prioritize UI responsiveness during updates.

#### Steps Taken
- Created `src/components/StreamingSummary.tsx` for efficient token streaming display:
  - Implemented a specialized component that handles streaming content display
  - Added skeleton loading state for improved perceived performance
  - Integrated with error boundary for robust error handling
  - Used CSS transitions and optimized animations to preserve UI performance
  - Implemented proper cleanup to prevent memory leaks
- Implemented local state management with `src/hooks/useLocalTokenState.ts`:
  - Created a specialized hook for token accumulation that minimizes re-renders
  - Added token batching to reduce render frequency while maintaining responsiveness
  - Used refs to track internal state without triggering unnecessary re-renders
  - Implemented proper cleanup to prevent memory leaks
- Added requestIdleCallback integration with `src/utils/useIdleProcessing.ts`:
  - Created a utility hook for scheduling non-critical UI updates during idle periods
  - Implemented browser compatibility with fallbacks for unsupported browsers
  - Added configurable timeout options to ensure updates happen within a reasonable time
  - Created proper cleanup to prevent memory leaks and canceled callbacks
- Implemented render optimization with `src/hooks/useOptimizedRender.ts`:
  - Used React's useTransition API to prioritize UI responsiveness
  - Added controls to bypass transitions for critical updates
  - Implemented a simple API for components to use without worrying about transitions
  - Created typed interfaces for better developer experience

### Phase 4: Store Optimizations [COMPLETE]

#### Tasks
- [x] **4.1 Refine Store Update Strategy**  
  Modify the store to handle streaming updates more efficiently.
  
- [x] **4.2 Add Selective Updates**  
  Implement more granular update methods that affect only the necessary state.
  
- [x] **4.3 Create Specialized Selectors**  
  Create optimized selectors for components to minimize re-renders.
  
- [x] **4.4 Update Round-Specific Actions**  
  Add dedicated actions for streaming updates to reduce global state changes.

#### Steps Taken
- Refined the store update strategy:
  - Modified store to batch updates during streaming
  - Implemented token frequency control to reduce store updates
  - Added state normalization to improve selector performance
  - Created dedicated streaming state section to isolate updates
- Added selective updates with the creation of `src/store/streaming.ts`:
  - Implemented specialized streaming state slice with efficient update patterns
  - Added throttling logic to control update frequency
  - Created token batching to reduce store updates during streaming
  - Added isolated streaming state to prevent UI jank from global updates
- Created specialized selectors in `src/store/selectors.ts`:
  - Implemented memoized selectors that only update when relevant data changes
  - Created component-focused hooks like `useRound` and `useStreamingState`
  - Added specialized status selectors to minimize re-renders
  - Added queue-related selectors for optimized queue displays
- Implemented round-specific actions in `src/store/roundActions.ts`:
  - Added fine-grained field updates to avoid unnecessary re-renders
  - Created efficient batch update methods for multiple rounds
  - Added specialized summary text and status updaters
  - Implemented performance-optimized round lookup methods

### Phase 5: Integration with Existing Components [COMPLETE]

#### Documentation
For detailed implementation instructions, see [implementation-component-integration.md](./implementation-component-integration.md).

#### Tasks
- [x] **5.1 Update ChapterTable Component**  
  Modify to use the new streaming components without changing the visual design.
  
- [x] **5.2 Update ChapterCard Component**  
  Ensure it works with the new streaming architecture.
  
- [x] **5.3 Update RoundDetailsDrawer Component**  
  Integrate streaming capabilities while maintaining current layout.
  
- [x] **5.4 Update QueuePanel Component**  
  Ensure queue-related UI remains consistent with the new architecture.

#### Steps Taken
- Updated ChapterTable Component in `src/components/ChapterTable.tsx`:
  - Replaced direct summary references with StreamingSummary component
  - Used specialized selectors from `src/store/selectors.ts` to minimize re-renders
  - Maintained existing visual design and layout
  - Added loading states for improved user experience
  - Ensured existing functionality continues to work
- Updated ChapterCard Component in `src/components/ChapterCard.tsx`:
  - Integrated optimized selectors for queue operations
  - Replaced direct store access with specialized selectors
  - Used useQueueActions hook for more efficient queue operations
  - Maintained compatibility with existing props structure
  - Ensured visual design remains consistent
- Enhanced RoundDetailsDrawer in `src/components/RoundDetailsDrawer.tsx`:
  - Created StreamingSummaryWithCopy component for copyable streaming text
  - Replaced static summary display with real-time streaming component
  - Used useStreamingState hook for efficient state tracking
  - Maintained existing drawer layout and functionality
  - Added streaming status indicators for better UX
- Updated QueuePanel in `src/components/QueuePanel.tsx`:
  - Created QueueItemSummary component for streaming text in queue items
  - Replaced direct summary references with streaming state
  - Used optimized selectors for more efficient queue rendering
  - Maintained existing queue item design and animations
  - Added proper TypeScript typing for enhanced reliability

### Phase 6: Queue Processing Optimization [COMPLETE]

#### Tasks
- [x] **6.1 Refactor processRoundSummaryQueue**  
  Update the queue processing function to use the new streaming architecture.
  
- [x] **6.2 Update Round Status Management**  
  Ensure round status updates (pending, inProgress, completed, failed) work correctly.
  
- [x] **6.3 Optimize API Calls**  
  Ensure API calls for summary generation are properly managed with the new architecture.
  
- [x] **6.4 Handle Queue State Transitions**  
  Ensure smooth transitions between queue states during processing.

#### Steps Taken
- Refactored `processRoundSummaryQueue` in `src/store/index.ts`:
  - Moved API call logic to the worker manager for off-main-thread processing
  - Added immediate queue item processing to increase throughput
  - Implemented proper error handling with detailed error states
  - Improved state transitions with clear processing flags
  - Added dynamic queue updating to maintain queue integrity
- Enhanced round status management in `src/store/streaming.ts`:
  - Added automatic queue status updates during state transitions
  - Created safety measures to prevent stalled queue processing
  - Implemented proper cleanup for completed and failed items
  - Added logic to sync streaming state with round state
- Optimized API calls in `src/services/workerManager.ts`:
  - Added retry logic with exponential backoff for transient failures
  - Enhanced error handling with detailed error messages
  - Improved API request parameters for better performance
  - Added proper cancellation support with AbortController
  - Created new retry stream functionality for failed streams
- Implemented queue state transition handling in `src/store/selectors.ts`:
  - Created specialized `useQueueMonitor` hook for queue state tracking
  - Added queue statistics for better UI feedback
  - Implemented specialized queue actions like `clearFailedItems` and `restartQueueProcessing`
  - Added safety checks and validation for queue operations
  - Implemented detailed queue item tracking with additional metadata

### Phase 7: Testing and Verification [COMPLETE]

#### Documentation
For detailed testing instructions, see [performance-testing-script.md](./performance-testing-script.md).

#### Tasks
- [x] **7.1 Create Performance Test Cases**  
  Develop test cases to measure UI responsiveness before and after changes.
  
- [x] **7.2 Implement Visual Regression Tests**  
  Verify that the UI appearance remains unchanged after optimizations.
  
- [x] **7.3 Test Edge Cases**  
  Verify behavior with large documents, rapid rerolls, and concurrent processing.
  
- [x] **7.4 Create User Testing Script**  
  Prepare a script for manual verification of the user experience.

#### Steps Taken
- Created comprehensive performance testing script in `docs/performance-testing-script.md`:
  - Defined objective metrics (FPS, memory usage, event count, etc.)
  - Added subjective metrics (perceived smoothness, visual stability)
  - Created detailed test cases for single round processing, batch processing, and large documents
  - Added guidance for visual regression testing
  - Included edge case testing scenarios and browser compatibility testing
- Implemented visual regression testing utilities in `src/utils/visualRegression.ts`:
  - Created `captureElement` function for taking screenshots of components
  - Added `compareScreenshots` function for pixel-by-pixel comparison
  - Implemented result visualization with difference highlighting
  - Created `useCaptureScreenshot` hook for React components
  - Added localStorage integration for persistent screenshot comparison
- Added edge case testing utilities in `src/utils/testingHelpers.ts`:
  - Implemented `NetworkConditionSimulator` for testing network failures
  - Created `PerformanceMonitor` for measuring and logging performance metrics
  - Added test document generation tools for various document sizes
  - Implemented throttling and error simulation for API requests
- Created user testing script UI panel in `src/components/TestingScriptPanel.tsx`:
  - Added interactive interface for running test cases
  - Implemented network condition simulation controls
  - Added tools for capturing and exporting test results
  - Created browser compatibility information collection
  - Added sections for performance testing, visual regression, and edge cases

## Implementation Details

### Token Event System

The token event system will use custom DOM events for communication:

```typescript
// Helper function to dispatch token events
function dispatchTokenEvent(roundIndex: number, token: string, isComplete = false) {
  const event = new CustomEvent(`token-stream-${roundIndex}`, {
    detail: { 
      token,
      isComplete 
    }
  });
  
  window.dispatchEvent(event);
}
```

### Streaming Component Pattern

The streaming component will efficiently display tokens as they arrive:

```typescript
// Example component pattern - implementation details will be in the actual tasks
export const StreamingSummary: FC<StreamingSummaryProps> = ({ roundIndex }) => {
  const [localSummary, setLocalSummary] = useState('');
  const [isPending, startTransition] = useTransition();
  
  // Subscribe to token events
  useEffect(() => {
    const handleToken = (event: CustomEvent) => {
      const { token } = event.detail;
      
      // Update UI with low priority
      startTransition(() => {
        setLocalSummary(prev => prev + token);
      });
    };
    
    window.addEventListener(`token-stream-${roundIndex}`, handleToken as EventListener);
    
    return () => {
      window.removeEventListener(`token-stream-${roundIndex}`, handleToken as EventListener);
    };
  }, [roundIndex]);
  
  return (
    <div className={isPending ? "opacity-90" : ""}>
      {localSummary || 'No summary available'}
    </div>
  );
};
```

## Success Criteria

1. Real-time token display is maintained (each token appears immediately)
2. UI remains responsive during streaming (no freezing or jank)
3. Visual design and layout of components remain unchanged
4. All existing functionality continues to work correctly
5. Stream processing occurs off the main thread
6. Memory usage remains stable during long streaming sessions 