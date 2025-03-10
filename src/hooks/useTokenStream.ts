import { useState, useEffect, useRef } from 'react';
import { subscribeToTokenEvents, TokenStreamEvent } from '@/utils/tokenEvents';

/**
 * Options for the useTokenStream hook
 */
export interface UseTokenStreamOptions {
  /**
   * Callback when stream is complete
   */
  onComplete?: (text: string) => void;
  
  /**
   * Callback when an error occurs
   */
  onError?: (error: string) => void;
  
  /**
   * Initial text to display (defaults to empty string)
   */
  initialText?: string;
}

/**
 * Hook to subscribe to token stream events for a specific round
 * 
 * @param roundIndex - The round index to subscribe to
 * @param options - Hook configuration options
 * @returns Object containing the current text, completion, and error status
 */
export function useTokenStream(roundIndex: number | null, options: UseTokenStreamOptions = {}) {
  const [text, setText] = useState(options.initialText || '');
  const [isComplete, setIsComplete] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Use ref to prevent stale closure issues in the event listener
  const textRef = useRef(options.initialText || '');
  
  useEffect(() => {
    // If roundIndex is null, don't subscribe
    if (roundIndex === null) return;
    
    // Reset state when roundIndex changes
    setText(options.initialText || '');
    setIsComplete(false);
    setIsError(false);
    setErrorMessage('');
    textRef.current = options.initialText || '';
    
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
    
    // Clean up subscription on unmount or when roundIndex changes
    return unsubscribe;
  }, [roundIndex, options.onComplete, options.onError, options.initialText]);
  
  // Return the current state
  return {
    text,
    isComplete,
    isError,
    errorMessage,
    
    // Helper method to check if streaming is active
    isStreaming: roundIndex !== null && !isComplete && !isError
  };
} 