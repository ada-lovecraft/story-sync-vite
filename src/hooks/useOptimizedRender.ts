import { useCallback, useTransition, useState } from 'react'

/**
 * Options for the useOptimizedRender hook
 */
interface UseOptimizedRenderOptions<T> {
  /**
   * Initial value for the state
   */
  initialValue: T
  
  /**
   * Whether to skip transitions for critical updates
   * @default false
   */
  allowDirectUpdates?: boolean
}

/**
 * Hook for optimizing render cycles using React's useTransition API
 * 
 * This hook helps prioritize UI responsiveness by marking state updates
 * as transitions when appropriate. This tells React they can be interrupted
 * or deferred to maintain UI responsiveness.
 */
export function useOptimizedRender<T>(
  options: UseOptimizedRenderOptions<T>
) {
  const {
    initialValue,
    allowDirectUpdates = false
  } = options
  
  // Setup state and transition
  const [state, setState] = useState<T>(initialValue)
  const [isPending, startTransition] = useTransition()
  
  /**
   * Update state with optimized rendering
   * - Critical updates bypass the transition system
   * - Non-critical updates use transitions for better responsiveness
   */
  const updateState = useCallback(
    (newState: T | ((prevState: T) => T), isCritical = false) => {
      if (isCritical || allowDirectUpdates) {
        // Critical updates bypass the transition system
        setState(newState)
      } else {
        // Mark non-critical updates as transitions for better responsiveness
        startTransition(() => {
          setState(newState)
        })
      }
    },
    [allowDirectUpdates]
  )
  
  return {
    /**
     * Current state value
     */
    state,
    
    /**
     * Whether there's a pending state update
     */
    isPending,
    
    /**
     * Update state while optimizing render cycles
     * 
     * @param newState New state value or function to update previous state
     * @param isCritical Whether this update is critical and should bypass transitions
     */
    updateState
  }
} 