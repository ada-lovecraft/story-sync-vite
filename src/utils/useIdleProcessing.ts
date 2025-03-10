import { useCallback, useEffect, useRef } from 'react'

/**
 * Options for the useIdleProcessing hook
 */
interface UseIdleProcessingOptions {
  /**
   * Timeout in milliseconds after which the callback will be executed
   * even if the browser has not had an idle period
   * @default 2000
   */
  timeout?: number
  
  /**
   * Whether to automatically clean up when component unmounts
   * @default true
   */
  autoCleanup?: boolean
}

/**
 * A React hook that schedules processing during browser idle periods
 * using requestIdleCallback for improved UI responsiveness.
 *
 * @param callback The function to execute during idle time
 * @param options Configuration options
 * @returns Object with methods to schedule and cancel tasks
 */
export function useIdleProcessing(
  options: UseIdleProcessingOptions = {}
) {
  const {
    timeout = 2000,
    autoCleanup = true
  } = options
  
  // Store callback IDs for cancellation
  const callbackIdsRef = useRef<number[]>([])
  
  // Cancel all pending callbacks
  const cancelAll = useCallback(() => {
    callbackIdsRef.current.forEach(id => {
      cancelIdleCallback(id)
    })
    callbackIdsRef.current = []
  }, [])
  
  // Schedule a task to run during browser idle time
  const scheduleTask = useCallback(
    (callback: (deadline: IdleDeadline) => void) => {
      // Handle browsers that don't support requestIdleCallback
      const requestIdleCallbackPolyfill = 
        window.requestIdleCallback || 
        ((cb: IdleRequestCallback, options?: IdleRequestOptions) => {
          const timeoutId = setTimeout(() => {
            const deadline = {
              didTimeout: true,
              timeRemaining: () => 0,
            }
            cb(deadline as IdleDeadline)
          }, options?.timeout || 1)
          return timeoutId as unknown as number
        })
      
      // Schedule the callback
      const id = requestIdleCallbackPolyfill(
        (deadline) => {
          // Remove this ID from our tracking array
          callbackIdsRef.current = callbackIdsRef.current.filter(i => i !== id)
          
          // Execute the callback
          callback(deadline)
        },
        { timeout }
      )
      
      // Store the ID for potential cancellation
      callbackIdsRef.current.push(id)
      
      return id
    },
    [timeout]
  )
  
  // Clean up pending callbacks on unmount
  useEffect(() => {
    if (autoCleanup) {
      return cancelAll
    }
  }, [autoCleanup, cancelAll])
  
  return {
    /**
     * Schedule a task to run during browser idle time
     */
    scheduleTask,
    
    /**
     * Cancel a specific scheduled idle task
     */
    cancelTask: useCallback((id: number) => {
      const cancelIdleCallbackPolyfill = 
        window.cancelIdleCallback || 
        ((id: number) => clearTimeout(id))
      
      cancelIdleCallbackPolyfill(id)
      callbackIdsRef.current = callbackIdsRef.current.filter(i => i !== id)
    }, []),
    
    /**
     * Cancel all scheduled idle tasks
     */
    cancelAll
  }
}

// Add type definitions for browsers that don't have them
declare global {
  interface Window {
    requestIdleCallback: (
      callback: (deadline: IdleDeadline) => void,
      options?: IdleRequestOptions
    ) => number
    cancelIdleCallback: (handle: number) => void
  }
} 