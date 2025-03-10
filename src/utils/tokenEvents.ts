/**
 * Token Events System
 * 
 * This file contains utilities for handling real-time token streaming events.
 * It provides a way for components to subscribe to token stream events without
 * causing unnecessary global state updates and re-renders.
 */

/**
 * TokenStreamEvent interface defines the structure of token streaming events
 */
export interface TokenStreamEvent {
  /** The token text content */
  token: string;
  
  /** The round index this token belongs to */
  roundIndex: number;
  
  /** Flag indicating if this is the final token in the stream */
  isComplete?: boolean;
  
  /** Flag indicating if an error occurred during streaming */
  isError?: boolean;
  
  /** Error message if an error occurred */
  errorMessage?: string;
}

/**
 * Callback function type for token event listeners
 */
export type TokenEventCallback = (event: TokenStreamEvent) => void;

/**
 * Creates the custom event name for a specific round
 */
export function getTokenEventName(roundIndex: number): string {
  return `token-stream-${roundIndex}`;
}

/**
 * Dispatches a token event for a specific round
 * 
 * @param roundIndex - The round index this token belongs to
 * @param token - The token text content
 * @param metadata - Additional metadata for the event
 */
export function dispatchTokenEvent(
  roundIndex: number, 
  token: string, 
  metadata: {
    isComplete?: boolean;
    isError?: boolean;
    errorMessage?: string;
  } = {}
): void {
  // Make sure we're in a browser environment
  if (typeof window === 'undefined') return;
  
  const eventName = getTokenEventName(roundIndex);
  
  const event = new CustomEvent(eventName, {
    detail: { 
      token,
      roundIndex,
      ...metadata
    }
  });
  
  window.dispatchEvent(event);
}

/**
 * Subscribes to token events for a specific round
 * 
 * @param roundIndex - The round index to subscribe to
 * @param callback - Function to call when tokens arrive
 * @returns Unsubscribe function to clean up the event listener
 */
export function subscribeToTokenEvents(
  roundIndex: number, 
  callback: TokenEventCallback
): () => void {
  // Make sure we're in a browser environment
  if (typeof window === 'undefined') return () => {};
  
  const eventName = getTokenEventName(roundIndex);
  
  const eventListener = (event: Event) => {
    const customEvent = event as CustomEvent;
    callback(customEvent.detail as TokenStreamEvent);
  };
  
  window.addEventListener(eventName, eventListener);
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener(eventName, eventListener);
  };
} 