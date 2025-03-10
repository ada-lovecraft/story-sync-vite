import { useState, useRef, useCallback, useEffect, useTransition } from 'react'
import { subscribeToTokenEvents } from '@/utils/tokenEvents'

/**
 * Options for the useLocalTokenState hook
 */
interface UseLocalTokenStateOptions {
  /**
   * Number of tokens to accumulate before updating state
   * Higher values improve performance but reduce update frequency
   * @default 1
   */
  batchSize?: number
  
  /**
   * Initial text value
   * @default ''
   */
  initialText?: string
  
  /**
   * Whether to use React's useTransition for state updates
   * @default true
   */
  useTransitionForUpdates?: boolean
  
  /**
   * Whether to reset state when roundIndex changes
   * @default true
   */
  resetOnRoundChange?: boolean
}

/**
 * Hook for efficiently managing local token state with optimized rendering
 * 
 * This hook provides component-level state management for token accumulation
 * without causing unnecessary re-renders or impacting UI responsiveness.
 */
export function useLocalTokenState(
  roundIndex: number | null,
  options: UseLocalTokenStateOptions = {}
) {
  const {
    batchSize = 1,
    initialText = '',
    useTransitionForUpdates = true,
    resetOnRoundChange = true
  } = options
  
  // State for token accumulation
  const [text, setText] = useState(initialText)
  const [isPending, startTransition] = useTransition()
  
  // Use refs to track state without triggering re-renders
  const batchedTokensRef = useRef<string>('')
  const currentTextRef = useRef<string>(initialText)
  const isCompleteRef = useRef(false)
  const isErrorRef = useRef(false)
  const errorMessageRef = useRef<string>('')
  
  // External state indicators
  const [isComplete, setIsComplete] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  // Flush batched tokens to state
  const flushTokens = useCallback(() => {
    if (batchedTokensRef.current) {
      const newText = currentTextRef.current + batchedTokensRef.current
      currentTextRef.current = newText
      
      // Use transition for better UI responsiveness if enabled
      if (useTransitionForUpdates) {
        startTransition(() => {
          setText(newText)
        })
      } else {
        setText(newText)
      }
      
      batchedTokensRef.current = ''
    }
  }, [useTransitionForUpdates])
  
  // Subscribe to token events
  useEffect(() => {
    if (roundIndex === null) return
    
    // Reset state when roundIndex changes if option is enabled
    if (resetOnRoundChange) {
      setText(initialText)
      currentTextRef.current = initialText
      batchedTokensRef.current = ''
      setIsComplete(false)
      setIsError(false)
      setErrorMessage('')
      isCompleteRef.current = false
      isErrorRef.current = false
      errorMessageRef.current = ''
    }
    
    // Subscribe to token events
    const unsubscribe = subscribeToTokenEvents(roundIndex, (event) => {
      if (event.token) {
        // Add token to batch
        batchedTokensRef.current += event.token
        
        // Flush if batch size reached or if we're not batching
        if (batchedTokensRef.current.length >= batchSize) {
          flushTokens()
        }
      }
      
      if (event.isComplete && !isCompleteRef.current) {
        isCompleteRef.current = true
        flushTokens() // Ensure any remaining tokens are flushed
        setIsComplete(true)
      }
      
      if (event.isError && !isErrorRef.current) {
        isErrorRef.current = true
        errorMessageRef.current = event.errorMessage || 'Unknown error'
        flushTokens() // Ensure any remaining tokens are flushed
        setIsError(true)
        setErrorMessage(event.errorMessage || 'Unknown error')
      }
    })
    
    // Set up interval to flush tokens periodically even if batch size not reached
    const flushInterval = setInterval(flushTokens, 100)
    
    // Cleanup
    return () => {
      unsubscribe()
      clearInterval(flushInterval)
    }
  }, [roundIndex, batchSize, flushTokens, initialText, resetOnRoundChange])
  
  return {
    /**
     * Current accumulated text
     */
    text,
    
    /**
     * Whether token streaming is complete
     */
    isComplete,
    
    /**
     * Whether an error occurred during streaming
     */
    isError,
    
    /**
     * Error message if an error occurred
     */
    errorMessage,
    
    /**
     * Whether a state update is pending (if using transitions)
     */
    isPending,
    
    /**
     * Whether streaming is currently active
     */
    isStreaming: roundIndex !== null && !isComplete && !isError,
    
    /**
     * Manually set the text value
     */
    setText: useCallback((newText: string) => {
      currentTextRef.current = newText
      setText(newText)
    }, []),
    
    /**
     * Reset the state to initial values
     */
    reset: useCallback(() => {
      batchedTokensRef.current = ''
      currentTextRef.current = initialText
      setText(initialText)
      setIsComplete(false)
      setIsError(false)
      setErrorMessage('')
      isCompleteRef.current = false
      isErrorRef.current = false
      errorMessageRef.current = ''
    }, [initialText])
  }
} 