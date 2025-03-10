# Component Integration Plan

This document outlines the specific steps to integrate the new streaming optimizations with existing UI components without modifying the visual design or layout.

## Current Component Analysis

Based on our codebase review, the following components need to be updated:

1. **ChapterTable.tsx** - Displays round summaries in a table format
2. **RoundDetailsDrawer.tsx** - Shows detailed round information including summaries
3. **QueuePanel.tsx** - Displays the queue of rounds to be processed
4. **ChapterHeader.tsx** - Shows chapter-level information

## Integration Strategy

The key to maintaining visual consistency is to swap the data source for summary content without changing the component structure or styling.

### 1. Update ChapterTable Component

In `ChapterTable.tsx`, we need to replace the direct reference to `round.summary` with our streaming-optimized component:

```typescript
// src/components/ChapterTable.tsx

// Add import
import { StreamingSummary } from '@/components/StreamingSummary';

// Find the cell that displays the summary
<TableCell className={cn(
  "max-w-md truncate text-left py-1 px-2 text-sm",
  isOmitted && "text-muted-foreground"
)}>
  {isOmitted ? (
    <span className="italic">Omitted from summarization</span>
  ) : (
    <div className="flex items-center space-x-2">
      {/* Replace this line */}
      {/* <span className="truncate">{round.summary || "No summary available"}</span> */}
      {/* With this component */}
      <StreamingSummary 
        roundIndex={round.roundIndex} 
        className="truncate"
        fallbackText="No summary available"
      />
    </div>
  )}
</TableCell>
```

### 2. Update RoundDetailsDrawer Component

In `RoundDetailsDrawer.tsx`, we need to replace the `CopyableText` component that displays the summary:

```typescript
// src/components/RoundDetailsDrawer.tsx

// Add import
import { StreamingSummary } from '@/components/StreamingSummary';
import { useTokenStream } from '@/hooks/useTokenStream';

// Replace the CopyableText for summary with a new component that wraps StreamingSummary
const CopyableStreamingSummary = ({ roundIndex }: { roundIndex: number }) => {
  const { text } = useTokenStream(roundIndex);
  
  return (
    <CopyableText 
      text={text || 'No summary available'}
      label="Round Summary"
      icon={<FileText className="h-4 w-4" />}
      variant="muted"
      copySuccessMessage="Round summary copied to clipboard!"
    />
  );
};

// Then in the render function, replace:
{round.summary && (
  <CopyableText 
    text={round.summary}
    label="Round Summary"
    icon={<FileText className="h-4 w-4" />}
    variant="muted"
    copySuccessMessage="Round summary copied to clipboard!"
  />
)}

// With:
<CopyableStreamingSummary roundIndex={round.roundIndex} />
```

### 3. Update QueuePanel Component

In `QueuePanel.tsx`, we need to update how the summary is obtained:

```typescript
// src/components/QueuePanel.tsx

// Add import
import { useTokenStream } from '@/hooks/useTokenStream';

// Create a component for displaying queue item summaries
const QueueItemSummary = ({ roundId }: { roundId: number }) => {
  const { text } = useTokenStream(roundId);
  const { rounds } = useStore();
  
  // Fallback to store data if no streaming data yet
  const round = rounds.find(r => r.roundIndex === roundId);
  const summaryText = text || round?.summary || 'No summary available';
  
  return (
    <div className="text-xs text-muted-foreground truncate max-w-[16rem]">
      {summaryText}
    </div>
  );
};

// Then in the component rendering the queue items, replace:
<div className="text-xs text-muted-foreground truncate max-w-[16rem]">
  {getRoundSummary(item.id)}
</div>

// With:
<QueueItemSummary roundId={item.id} />
```

### 4. Create Base StreamingSummary Component

Create the core component that will be used by all other components:

```typescript
// src/components/StreamingSummary.tsx
import { FC, memo } from 'react';
import { useTokenStream } from '@/hooks/useTokenStream';
import { useStore } from '@/store';

interface StreamingSummaryProps {
  roundIndex: number;
  className?: string;
  fallbackText?: string;
}

export const StreamingSummary: FC<StreamingSummaryProps> = memo(({ 
  roundIndex,
  className = "",
  fallbackText = "No summary available"
}) => {
  // Minimal store subscription - only for status
  const { summaryStatus } = useStore(state => {
    const round = state.rounds.find(r => r.roundIndex === roundIndex);
    return {
      summaryStatus: round?.summaryStatus || 'pending'
    };
  });
  
  // Subscribe to token stream for content
  const { text, isError } = useTokenStream(roundIndex);
  
  // Fallback to store data if needed
  const { storeText } = useStore(state => {
    const round = state.rounds.find(r => r.roundIndex === roundIndex);
    return {
      storeText: round?.summary || ''
    };
  });
  
  // Use streaming text if available, otherwise use store text or fallback
  const displayText = text || storeText || fallbackText;
  
  // Match the exact rendering style of the original implementation
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

### 5. Add useCancelableStream to Prevent Memory Leaks

Ensure streams are properly canceled when components unmount:

```typescript
// Add to any component that may unmount during streaming
import { useCancelableStream } from '@/hooks/useCancelableStream';

// Inside component function
useCancelableStream(roundIndex);
```

### 6. Update the RoundActionsToolbar Component

Ensure the reroll functionality works with the new system:

```typescript
// src/components/RoundActionsToolbar.tsx

// Update the handleReroll function
const handleReroll = async (e: React.MouseEvent) => {
  e.stopPropagation();
  
  // Validate roundIndex
  if (roundIndex === undefined) {
    console.error('RoundActionsToolbar: roundIndex is undefined');
    toast.error("Cannot reroll: round index is undefined");
    return;
  }
  
  // Call onReroll to handle any UI updates
  if (typeof onReroll === 'function') {
    onReroll(roundIndex);
  }
  
  // Mark the round as being processed and enqueue it for summarization
  rerollRoundSummary(roundIndex);
  
  // Set UI state
  setIsGenerating(true);
  
  // Start processing the queue
  try {
    await processRoundSummaryQueue();
  } finally {
    setIsGenerating(false);
  }
};
```

## Testing the Integration

After integrating the components, test the following scenarios:

1. **Visual Consistency**:
   - Compare screenshots before and after changes
   - Verify that all styling, animations, and layout remain unchanged

2. **Functionality**:
   - Confirm that summaries display in real-time, token by token
   - Verify that multiple summaries can stream simultaneously
   - Test that reroll functionality works correctly

3. **Edge Cases**:
   - Test with empty summaries
   - Test with very long summaries
   - Test with special characters and line breaks in summaries

## Migration Approach

To minimize risk, follow this migration approach:

1. Create the new token event system
2. Implement the streaming infrastructure without integrating yet
3. Create the StreamingSummary component
4. Update one component at a time, testing after each update
5. Add automated tests for each component
6. Perform comprehensive UI tests after all changes are complete

## Rollback Plan

If issues arise, prepare a rollback strategy:

1. Keep the original summary display code in components but commented out
2. If problems occur, revert to the original code
3. Add feature flags to disable Web Worker usage if needed

## Potential Challenges

1. **Inconsistent Rendering**: If the StreamingSummary component renders differently from the original code, users might notice visual differences. Use identical class names and styles to ensure consistency.

2. **SSR Compatibility**: Ensure the token event system works with Server-Side Rendering by checking if window is defined before using DOM APIs.

3. **Performance Monitoring**: Add monitoring to verify that the changes actually improve performance. Before deploying to production, set up metrics to track UI responsiveness.

## Post-Implementation Verification 

After completing all changes, verify that:

1. The UI remains responsive during token streaming
2. All summaries display correctly and consistently
3. Real-time token display works as expected
4. The application functions correctly across all supported browsers
5. No console errors or warnings appear during normal operation 