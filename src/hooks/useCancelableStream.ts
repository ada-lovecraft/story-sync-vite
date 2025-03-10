import { useEffect, useRef } from 'react';
import { dispatchTokenEvent } from '@/utils/tokenEvents';

/**
 * Hook to ensure streams are automatically canceled when components unmount
 * 
 * This hook makes it easy to handle proper cleanup of token streams and prevent
 * memory leaks when a component unmounts during an active streaming session.
 * 
 * @param roundIndex - The round index to manage, or null if no active stream
 * @returns Object with utility methods for managing the stream
 */
export function useCancelableStream(roundIndex: number | null) {
  // Keep track of previous roundIndex for cancellation when it changes
  const prevRoundIndexRef = useRef<number | null>(null);
  
  // Helper method to cancel a stream
  const cancelStream = (index: number) => {
    // Send a cancellation token event
    dispatchTokenEvent(index, '', { 
      isComplete: true, 
      isError: false 
    });
  };
  
  // Effect for handling cleanup
  useEffect(() => {
    // If previous round index exists and has changed, cancel the old stream
    if (prevRoundIndexRef.current !== null && 
        prevRoundIndexRef.current !== roundIndex) {
      cancelStream(prevRoundIndexRef.current);
    }
    
    // Update ref to current value
    prevRoundIndexRef.current = roundIndex;
    
    // Cleanup function that runs on unmount or when roundIndex changes
    return () => {
      // If there's an active stream when unmounting, cancel it
      if (roundIndex !== null) {
        cancelStream(roundIndex);
      }
    };
  }, [roundIndex]);
  
  // Return utility methods
  return {
    /**
     * Manually cancel the current stream
     */
    cancel: () => {
      if (roundIndex !== null) {
        cancelStream(roundIndex);
      }
    },
    
    /**
     * Check if there's an active stream
     */
    hasActiveStream: roundIndex !== null
  };
} 