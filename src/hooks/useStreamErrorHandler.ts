import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { workerManager } from '@/services/workerManager';
import { useStore } from '@/store';

interface UseStreamErrorHandlerOptions {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries?: number;
  
  /**
   * Delay between retries in milliseconds
   * @default 1000
   */
  retryDelay?: number;
  
  /**
   * Whether to show toast notifications for errors
   * @default true
   */
  showToasts?: boolean;
}

/**
 * Hook for handling stream errors and retries
 */
export function useStreamErrorHandler(options: UseStreamErrorHandlerOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    showToasts = true
  } = options;
  
  const [errors, setErrors] = useState<Record<number, Error>>({});
  const [retryCount, setRetryCount] = useState<Record<number, number>>({});
  
  // Get needed store actions
  const { rerollRoundSummary, processRoundSummaryQueue } = useStore();
  
  /**
   * Handle a stream error
   */
  const handleError = useCallback((roundIndex: number, error: Error) => {
    // Update errors state
    setErrors(prev => ({
      ...prev,
      [roundIndex]: error
    }));
    
    // Get current retry count for this round
    const currentRetryCount = retryCount[roundIndex] || 0;
    
    // Check if we've exceeded max retries
    if (currentRetryCount >= maxRetries) {
      if (showToasts) {
        toast.error(`Max retries (${maxRetries}) exceeded for round ${roundIndex}`, {
          description: error.message,
          duration: 5000
        });
      }
      
      // Update round status to failed
      useStore.getState().updateRound(roundIndex, { summaryStatus: 'failed' });
      return;
    }
    
    // Increment retry count
    setRetryCount(prev => ({
      ...prev,
      [roundIndex]: currentRetryCount + 1
    }));
    
    if (showToasts) {
      toast.error(`Error processing stream for round ${roundIndex}. Retrying... (${currentRetryCount + 1}/${maxRetries})`, {
        description: error.message,
        duration: 3000
      });
    }
    
    // Retry after delay
    setTimeout(() => {
      retryStream(roundIndex);
    }, retryDelay);
  }, [maxRetries, retryDelay, retryCount, showToasts]);
  
  /**
   * Retry a stream
   */
  const retryStream = useCallback((roundIndex: number) => {
    // Cancel any existing stream first
    workerManager.cancelStream(roundIndex);
    
    // Reset error
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[roundIndex];
      return newErrors;
    });
    
    // Requeue for processing
    rerollRoundSummary(roundIndex);
    processRoundSummaryQueue();
    
    if (showToasts) {
      toast.info(`Retrying stream for round ${roundIndex}...`);
    }
  }, [processRoundSummaryQueue, rerollRoundSummary, showToasts]);
  
  /**
   * Reset error state and retry counts for a round
   */
  const resetErrorState = useCallback((roundIndex: number) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[roundIndex];
      return newErrors;
    });
    
    setRetryCount(prev => {
      const newCounts = { ...prev };
      delete newCounts[roundIndex];
      return newCounts;
    });
  }, []);
  
  /**
   * Check if a round has an error
   */
  const hasError = useCallback((roundIndex: number) => {
    return !!errors[roundIndex];
  }, [errors]);
  
  /**
   * Get the error for a round
   */
  const getError = useCallback((roundIndex: number) => {
    return errors[roundIndex] || null;
  }, [errors]);
  
  return {
    errors,
    retryCount,
    handleError,
    retryStream,
    resetErrorState,
    hasError,
    getError
  };
} 