import { useMemo, useCallback } from 'react'
import { useStore } from './index'
import type { Round, Chapter } from './index'

/**
 * A hook to select a specific round's data from the store
 * This prevents unnecessary re-renders when other rounds change
 * 
 * @param roundIndex The round index to select
 * @returns The selected round or null if not found
 */
export function useRound(roundIndex: number | null) {
  return useStore(
    (state) => roundIndex !== null ? 
      state.rounds.find(round => round.roundIndex === roundIndex) || null : 
      null
  )
}

/**
 * A hook to select streaming state for a specific round
 * This gives components access to real-time streaming updates
 * without causing re-renders from other store changes
 * 
 * @param roundIndex The round index to select streaming state for
 * @returns The streaming state for the round, including text and status
 */
export function useStreamingState(roundIndex: number | null) {
  const getStreamingState = useStore(state => state.getStreamingState)
  const streamingData = useStore(
    state => roundIndex !== null ? 
      state.activeStreams[roundIndex] || null : 
      null
  )
  
  // Return text and status from streaming state, with defaults if not available
  return useMemo(() => {
    if (!roundIndex) return { text: '', isStreaming: false, status: 'pending' as const }
    
    const state = streamingData || getStreamingState(roundIndex)
    
    return {
      text: state?.currentText || '',
      isStreaming: !!state && state.status === 'inProgress',
      status: state?.status || 'pending' as const,
      error: state?.error,
      startedAt: state?.startedAt,
      completedAt: state?.completedAt,
      tokenCount: state?.tokenCount || 0
    }
  }, [roundIndex, streamingData, getStreamingState])
}

/**
 * Select only the summary status of a round
 * Useful for components that only need to display status indicators
 * 
 * @param roundIndex The round index to select status for
 * @returns The summary status of the round
 */
export function useRoundSummaryStatus(roundIndex: number | null) {
  return useStore(
    state => roundIndex !== null ?
      state.rounds.find(round => round.roundIndex === roundIndex)?.summaryStatus || 'pending' :
      'pending'
  )
}

/**
 * Select a specific chapter by index
 * 
 * @param chapterIndex The index of the chapter to select
 * @returns The selected chapter or null if not found
 */
export function useChapter(chapterIndex: number | null) {
  return useStore(
    state => chapterIndex !== null && chapterIndex >= 0 && chapterIndex < state.chapters.length ?
      state.chapters[chapterIndex] :
      null
  )
}

/**
 * Select rounds that belong to a specific chapter
 * This combines chapter and rounds data efficiently
 * 
 * @param chapterIndex The index of the chapter
 * @returns Array of rounds that belong to the chapter
 */
export function useChapterRounds(chapterIndex: number | null) {
  const chapter = useChapter(chapterIndex)
  const rounds = useStore(state => state.rounds)
  
  return useMemo(() => {
    if (!chapter) return []
    
    const [start, end] = chapter.roundsRange
    return rounds.filter(round => 
      round.roundIndex >= start && 
      round.roundIndex <= end
    )
  }, [chapter, rounds])
}

/**
 * Check if a specific round is currently in the processing queue
 * 
 * @param roundIndex The round index to check
 * @returns Whether the round is in the queue and its queue position
 */
export function useIsRoundInQueue(roundIndex: number | null) {
  const queueState = useStore(state => {
    if (roundIndex === null) return { inQueue: false, position: -1 }
    
    const position = state.roundSummaryQueue.findIndex(
      item => item.id === roundIndex && item.type === 'round'
    )
    
    return {
      inQueue: position !== -1,
      position: position !== -1 ? position : -1,
      isProcessing: position === 0 && state.isProcessingQueue
    }
  })
  
  return queueState
}

/**
 * Get streaming configuration values
 * 
 * @returns Current streaming configuration
 */
export function useStreamingConfig() {
  return useStore(state => ({
    updateFrequencyMs: state.updateFrequencyMs,
    minTokenBatchSize: state.minTokenBatchSize,
    workerEnabled: state.workerEnabled
  }))
}

/**
 * A hook that provides actions for managing streaming
 * 
 * @returns Object containing streaming management actions
 */
export function useStreamingActions() {
  const startStreaming = useStore(state => state.startStreaming)
  const completeStreaming = useStore(state => state.completeStreaming)
  const appendStreamingText = useStore(state => state.appendStreamingText)
  const failStreaming = useStore(state => state.failStreaming)
  const cancelStreaming = useStore(state => state.cancelStreaming)
  const setStreamingConfig = useStore(state => state.setStreamingConfig)
  
  return {
    startStreaming,
    completeStreaming,
    appendStreamingText,
    failStreaming,
    cancelStreaming,
    setStreamingConfig
  }
}

/**
 * A hook that provides actions for managing the queue
 * 
 * @returns Object containing queue management actions
 */
export function useQueueActions() {
  const enqueueRoundSummary = useStore(state => state.enqueueRoundSummary)
  const dequeueRoundSummary = useStore(state => state.dequeueRoundSummary)
  const rerollRoundSummary = useStore(state => state.rerollRoundSummary)
  const processRoundSummaryQueue = useStore(state => state.processRoundSummaryQueue)
  
  return {
    enqueueRoundSummary,
    dequeueRoundSummary,
    rerollRoundSummary,
    processRoundSummaryQueue
  }
}

/**
 * Hook for monitoring queue state and transitions
 * 
 * @returns Queue state monitoring data and actions
 */
export function useQueueMonitor() {
  // Get queue processing state
  const isProcessingQueue = useStore(state => state.isProcessingQueue)
  
  // Get total queue stats
  const queueStats = useStore(state => {
    const queue = state.roundSummaryQueue
    
    return {
      total: queue.length,
      pending: queue.filter(item => item.status === 'pending').length,
      inProgress: queue.filter(item => item.status === 'inProgress').length,
      completed: queue.filter(item => item.status === 'completed').length,
      failed: queue.filter(item => item.status === 'failed').length,
      isEmpty: queue.length === 0,
      hasItems: queue.length > 0,
      hasPending: queue.filter(item => item.status === 'pending').length > 0,
    }
  })
  
  // Get currently active item being processed
  const activeItem = useStore(state => {
    if (!state.isProcessingQueue || state.roundSummaryQueue.length === 0) {
      return null
    }
    return state.roundSummaryQueue[0]
  })
  
  // Get full queue with processed items and timestamps
  const queueWithDetails = useStore(state => {
    return state.roundSummaryQueue.map(item => {
      if (item.type === 'round') {
        const round = state.rounds.find(r => r.roundIndex === item.id)
        return {
          ...item,
          round,
          title: round ? `Round ${round.roundIndex}` : `Round ${item.id}`
        }
      }
      
      return item
    })
  })
  
  // Actions
  const actions = useQueueActions()
  
  // Check if a specific round can be queued
  const canEnqueueRound = useCallback((roundIndex: number) => {
    const state = useStore.getState()
    const round = state.rounds.find(r => r.roundIndex === roundIndex)
    
    // Can't enqueue if round doesn't exist
    if (!round) return false
    
    // Already in queue?
    const inQueue = state.roundSummaryQueue.some(
      item => item.id === roundIndex && item.type === 'round'
    )
    
    // Allow if not in queue or if failed in queue
    return !inQueue || (inQueue && round.summaryStatus === 'failed')
  }, [])
  
  // Enqueue a round with validation
  const safeEnqueueRound = useCallback((roundIndex: number) => {
    if (canEnqueueRound(roundIndex)) {
      actions.enqueueRoundSummary(roundIndex)
      return true
    }
    return false
  }, [actions, canEnqueueRound])
  
  // Clear all failed items from queue
  const clearFailedItems = useCallback(() => {
    const state = useStore.getState()
    const newQueue = state.roundSummaryQueue.filter(item => item.status !== 'failed')
    
    useStore.setState({
      roundSummaryQueue: newQueue
    })
  }, [])
  
  // Clear the entire queue
  const clearQueue = useCallback(() => {
    useStore.setState({
      roundSummaryQueue: [],
      isProcessingQueue: false
    })
  }, [])
  
  // Restart processing if it stalled
  const restartQueueProcessing = useCallback(() => {
    const state = useStore.getState()
    
    // Only restart if there are pending items but queue isn't processing
    if (state.roundSummaryQueue.length > 0 && !state.isProcessingQueue) {
      actions.processRoundSummaryQueue()
      return true
    }
    
    return false
  }, [actions])
  
  return {
    isProcessingQueue,
    queueStats,
    activeItem,
    queueWithDetails,
    ...actions,
    canEnqueueRound,
    safeEnqueueRound,
    clearFailedItems,
    clearQueue,
    restartQueueProcessing
  }
} 