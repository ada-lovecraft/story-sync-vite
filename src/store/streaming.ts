import { StateCreator } from 'zustand'
import { StoreState } from './index'

/**
 * Represents the streaming state in the store
 */
export interface StreamingState {
  /**
   * Map of active streaming states by round index
   * This allows efficient updates without affecting the entire store
   */
  activeStreams: Record<number, {
    /**
     * Current accumulated text during streaming
     */
    currentText: string
    
    /**
     * Status of the streaming process
     */
    status: 'pending' | 'inProgress' | 'completed' | 'failed'
    
    /**
     * Timestamp when streaming started
     */
    startedAt?: number
    
    /**
     * Timestamp when streaming completed
     */
    completedAt?: number
    
    /**
     * Error message if streaming failed
     */
    error?: string
    
    /**
     * Number of tokens received
     */
    tokenCount: number
    
    /**
     * Last update timestamp (used for throttling)
     */
    lastUpdateTime: number
  }>
  
  /**
   * When worker-based streaming is enabled
   */
  workerEnabled: boolean
  
  /**
   * Update frequency in milliseconds
   * Controls how often the store should be updated during streaming
   * Lower values provide more real-time updates but may impact performance
   */
  updateFrequencyMs: number
  
  /**
   * Minimum token batch size for store updates
   * Store updates will happen after this many tokens or after updateFrequencyMs,
   * whichever comes first
   */
  minTokenBatchSize: number
}

/**
 * Defines the streaming-related actions in the store
 */
export interface StreamingActions {
  /**
   * Start streaming for a specific round
   * @param roundIndex The round index to stream for
   */
  startStreaming: (roundIndex: number) => void
  
  /**
   * Complete streaming for a specific round
   * @param roundIndex The round index to complete
   */
  completeStreaming: (roundIndex: number) => void
  
  /**
   * Mark streaming as failed for a specific round
   * @param roundIndex The round index that failed
   * @param error Optional error message
   */
  failStreaming: (roundIndex: number, error?: string) => void
  
  /**
   * Update streaming text without triggering full store updates
   * @param roundIndex The round index to update
   * @param text The text to append
   * @param forceUpdate Whether to force an update regardless of throttling
   */
  appendStreamingText: (roundIndex: number, text: string, forceUpdate?: boolean) => void
  
  /**
   * Set the configuration for streaming updates
   * @param config The configuration object
   */
  setStreamingConfig: (config: Partial<{
    updateFrequencyMs: number
    minTokenBatchSize: number
    workerEnabled: boolean
  }>) => void
  
  /**
   * Sync the streaming state to the main rounds state
   * This is called less frequently to update the main state for persistence
   * @param roundIndex The round index to sync
   */
  syncStreamingToStore: (roundIndex: number) => void
  
  /**
   * Get the streaming state for a specific round
   * @param roundIndex The round index to get state for
   */
  getStreamingState: (roundIndex: number) => StreamingState['activeStreams'][number] | null
  
  /**
   * Cancel streaming for a specific round
   * @param roundIndex The round index to cancel streaming for
   */
  cancelStreaming: (roundIndex: number) => void
}

export type StreamingSlice = StreamingState & StreamingActions

/**
 * Creates the streaming slice for the store
 */
export const createStreamingSlice: StateCreator<
  StoreState,
  [],
  [],
  StreamingSlice
> = (set, get) => ({
  // Initial state
  activeStreams: {},
  workerEnabled: true,
  updateFrequencyMs: 100, // Update store every 100ms
  minTokenBatchSize: 10, // Or after 10 tokens, whichever comes first
  
  // Actions
  startStreaming: (roundIndex) => {
    set((state) => {
      // Create a new active streams object to avoid modifying the original
      const newActiveStreams = { ...state.activeStreams }
      
      // Initialize or reset the streaming state for this round
      newActiveStreams[roundIndex] = {
        currentText: '',
        status: 'inProgress',
        startedAt: Date.now(),
        tokenCount: 0,
        lastUpdateTime: Date.now()
      }
      
      return {
        activeStreams: newActiveStreams
      }
    })
    
    // Also update the main round state to indicate streaming is in progress
    get().updateRound(roundIndex, { summaryStatus: 'inProgress' })
    
    // Update queue status if this round is in the queue
    const queueItem = get().roundSummaryQueue.find(item => 
      item.id === roundIndex && item.type === 'round'
    )
    
    if (queueItem) {
      get().updateSummaryStatus(roundIndex, 'round', 'inProgress')
    }
  },
  
  completeStreaming: (roundIndex) => {
    const state = get()
    const streamingState = state.activeStreams[roundIndex]
    
    if (!streamingState) return
    
    // First sync the streaming state to the main store
    state.syncStreamingToStore(roundIndex)
    
    // Then update streaming state and round status
    set((state) => {
      const newActiveStreams = { ...state.activeStreams }
      
      if (newActiveStreams[roundIndex]) {
        newActiveStreams[roundIndex] = {
          ...newActiveStreams[roundIndex],
          status: 'completed',
          completedAt: Date.now()
        }
      }
      
      return {
        activeStreams: newActiveStreams
      }
    })
    
    // Update the main round state
    state.updateRound(roundIndex, { 
      summaryStatus: 'completed',
      summary: streamingState.currentText.trim()
    })
    
    // Update queue status if this round is in the queue
    const queueItem = state.roundSummaryQueue.find(item => 
      item.id === roundIndex && item.type === 'round'
    )
    
    if (queueItem) {
      state.updateSummaryStatus(roundIndex, 'round', 'completed')
    }
    
    // Move to the next item in the queue if this was the active item
    // This is a safety measure in case the queue processing didn't automatically continue
    if (state.roundSummaryQueue.length > 0 && 
        state.roundSummaryQueue[0].id === roundIndex && 
        state.roundSummaryQueue[0].type === 'round') {
      
      // Remove this item from the queue
      set((state) => ({
        roundSummaryQueue: state.roundSummaryQueue.slice(1)
      }))
      
      // Process the next item if available
      if (state.roundSummaryQueue.length > 1) {
        requestAnimationFrame(() => {
          get().processRoundSummaryQueue()
        })
      }
    }
  },
  
  failStreaming: (roundIndex, error) => {
    const state = get()
    
    set((state) => {
      const newActiveStreams = { ...state.activeStreams }
      
      if (newActiveStreams[roundIndex]) {
        newActiveStreams[roundIndex] = {
          ...newActiveStreams[roundIndex],
          status: 'failed',
          error: error || 'Unknown error',
          completedAt: Date.now()
        }
      }
      
      return {
        activeStreams: newActiveStreams
      }
    })
    
    // Update the main round state
    state.updateRound(roundIndex, { summaryStatus: 'failed' })
    
    // Update queue status if this round is in the queue
    const queueItem = state.roundSummaryQueue.find(item => 
      item.id === roundIndex && item.type === 'round'
    )
    
    if (queueItem) {
      state.updateSummaryStatus(roundIndex, 'round', 'failed')
    }
    
    // Log the error for debugging
    console.error(`Streaming failed for round ${roundIndex}:`, error)
    
    // Move to the next item in the queue if this was the active item
    if (state.roundSummaryQueue.length > 0 && 
        state.roundSummaryQueue[0].id === roundIndex && 
        state.roundSummaryQueue[0].type === 'round') {
      
      // Remove this item from the queue
      set((state) => ({
        roundSummaryQueue: state.roundSummaryQueue.slice(1)
      }))
      
      // Process the next item if available
      if (state.roundSummaryQueue.length > 0) {
        requestAnimationFrame(() => {
          get().processRoundSummaryQueue()
        })
      } else {
        // No more items, reset processing flag
        set({ isProcessingQueue: false })
      }
    }
  },
  
  appendStreamingText: (roundIndex, text, forceUpdate = false) => {
    const state = get()
    const streamingState = state.activeStreams[roundIndex]
    
    // If no streaming state exists for this round, ignore
    if (!streamingState) return
    
    // Check if we should update the store based on time or token count
    const now = Date.now()
    const shouldUpdate = forceUpdate || 
      now - streamingState.lastUpdateTime >= state.updateFrequencyMs ||
      streamingState.tokenCount % state.minTokenBatchSize === 0
    
    // Update the streaming state with new text
    set((state) => {
      const newActiveStreams = { ...state.activeStreams }
      
      if (newActiveStreams[roundIndex]) {
        // Append text and increment token count
        const currentText = newActiveStreams[roundIndex].currentText + text
        const tokenCount = newActiveStreams[roundIndex].tokenCount + 1
        
        newActiveStreams[roundIndex] = {
          ...newActiveStreams[roundIndex],
          currentText,
          tokenCount,
          lastUpdateTime: shouldUpdate ? now : newActiveStreams[roundIndex].lastUpdateTime
        }
      }
      
      return {
        activeStreams: newActiveStreams
      }
    })
    
    // If we should update the main store, do so
    if (shouldUpdate) {
      state.syncStreamingToStore(roundIndex)
    }
  },
  
  setStreamingConfig: (config) => {
    set({
      ...config
    })
  },
  
  syncStreamingToStore: (roundIndex) => {
    const state = get()
    const streamingState = state.activeStreams[roundIndex]
    
    // If no streaming state exists for this round, ignore
    if (!streamingState) return
    
    // Update the round with the current streaming text
    // This happens less frequently than appendStreamingText calls
    state.updateRound(roundIndex, {
      summary: streamingState.currentText.trim()
    })
  },
  
  getStreamingState: (roundIndex) => {
    const state = get()
    return state.activeStreams[roundIndex] || null
  },
  
  cancelStreaming: (roundIndex) => {
    const state = get()
    const streamingState = state.activeStreams[roundIndex]
    
    // If no streaming state exists for this round, ignore
    if (!streamingState) return
    
    // Remove the streaming state
    set((state) => {
      const newActiveStreams = { ...state.activeStreams }
      delete newActiveStreams[roundIndex]
      
      return {
        activeStreams: newActiveStreams
      }
    })
    
    // Update the main round state to reset status if it was in progress
    if (streamingState.status === 'inProgress') {
      state.updateRound(roundIndex, { summaryStatus: 'pending' })
    }
  }
}) 