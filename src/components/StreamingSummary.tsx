import { FC, memo, useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { StreamErrorBoundary } from '@/components/StreamErrorBoundary'
import { useWorkerManager } from '@/hooks/useWorkerManager'
import { useLocalTokenState } from '@/hooks/useLocalTokenState'
import { useIdleProcessing } from '@/utils/useIdleProcessing'

/**
 * Props for the StreamingSummary component
 */
interface StreamingSummaryProps {
  /**
   * The round index to display streaming content for
   */
  roundIndex: number
  
  /**
   * Optional className to apply to the component
   */
  className?: string
  
  /**
   * Text to display when no summary is available
   * @default "No summary available"
   */
  fallbackText?: string
  
  /**
   * Whether to show animation effects
   * @default true
   */
  showAnimations?: boolean
  
  /**
   * Whether to use error boundary for error handling
   * @default true
   */
  useErrorBoundary?: boolean
  
  /**
   * Number of tokens to batch before updating UI
   * Higher values improve performance but reduce update frequency
   * @default 5
   */
  batchSize?: number
  
  /**
   * Time in ms before applying non-critical UI updates during idle periods
   * @default 100
   */
  idleTimeout?: number
}

/**
 * A component that efficiently displays streaming summary content
 * with optimized rendering using batched updates and idle processing
 */
export const StreamingSummary: FC<StreamingSummaryProps> = memo(({
  roundIndex,
  className,
  fallbackText = "No summary available",
  showAnimations = true,
  useErrorBoundary = true,
  batchSize = 5,
  idleTimeout = 100
}) => {
  // Initialize worker manager to ensure worker is ready
  const { isInitialized, isInitializing } = useWorkerManager()
  
  // Use local token state for optimized rendering
  const {
    text,
    isComplete,
    isError,
    errorMessage,
    isStreaming,
    isPending
  } = useLocalTokenState(roundIndex, {
    batchSize,
    useTransitionForUpdates: true
  })
  
  // Setup idle processing for non-critical UI updates
  const { scheduleTask } = useIdleProcessing({ timeout: idleTimeout })
  
  // Refs to track whether we need styling updates
  const animationRef = useRef<HTMLDivElement>(null)
  const prevStreamingRef = useRef(false)
  
  // Apply animation class changes during idle periods to avoid layout thrashing
  useEffect(() => {
    if (!animationRef.current || prevStreamingRef.current === isStreaming) return
    
    prevStreamingRef.current = isStreaming
    
    scheduleTask(() => {
      if (animationRef.current) {
        if (isStreaming && showAnimations) {
          animationRef.current.classList.add('animate-pulse')
        } else {
          animationRef.current.classList.remove('animate-pulse')
        }
      }
    })
  }, [isStreaming, showAnimations, scheduleTask])
  
  // Track whether content is ready to display
  const isReady = isInitialized && !isInitializing
  const hasContent = !!text
  
  // Conditionally wrap with error boundary
  const content = (
    <div 
      ref={animationRef}
      className={cn(
        "relative",
        isPending && showAnimations && "opacity-90 transition-opacity",
        className
      )}
    >
      {!isReady ? (
        <Skeleton className="h-4 w-full" />
      ) : isError ? (
        <div className="text-destructive">{errorMessage || "Error loading summary"}</div>
      ) : hasContent ? (
        <div>{text}</div>
      ) : (
        <div className="text-muted-foreground">{fallbackText}</div>
      )}
    </div>
  )
  
  return useErrorBoundary ? (
    <StreamErrorBoundary roundIndex={roundIndex}>
      {content}
    </StreamErrorBoundary>
  ) : content
})

StreamingSummary.displayName = 'StreamingSummary' 