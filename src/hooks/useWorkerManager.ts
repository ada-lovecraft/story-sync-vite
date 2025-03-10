import { useEffect, useState } from 'react';
import { workerManager } from '@/services/workerManager';

/**
 * Options for the useWorkerManager hook
 */
interface UseWorkerManagerOptions {
  /**
   * Whether to initialize the worker immediately
   * @default true
   */
  initializeImmediately?: boolean;
}

/**
 * Hook to manage worker lifecycle
 * 
 * This hook handles initializing the worker when needed and cleaning it up
 * when the component unmounts to prevent memory leaks.
 */
export function useWorkerManager(options: UseWorkerManagerOptions = {}) {
  const { initializeImmediately = true } = options;
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Initialize worker when the component mounts
  useEffect(() => {
    let isMounted = true;
    
    if (initializeImmediately) {
      initWorker();
    }
    
    async function initWorker() {
      if (isInitialized || isInitializing) return;
      
      try {
        setIsInitializing(true);
        await workerManager.init();
        
        // Only update state if component is still mounted
        if (isMounted) {
          setIsInitialized(true);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to initialize worker:', err);
        
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }
    
    // Cleanup when component unmounts
    return () => {
      isMounted = false;
    };
  }, [initializeImmediately, isInitialized, isInitializing]);
  
  // Cleanup worker on page unload or component unmount
  useEffect(() => {
    // Handle page unload
    const handleBeforeUnload = () => {
      workerManager.terminate();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup when component unmounts
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Only terminate the worker if no other components are using it
      // In a real app, you might want to track references or use a context provider
      if (isInitialized) {
        workerManager.terminate();
      }
    };
  }, [isInitialized]);
  
  return {
    /**
     * Whether the worker has been initialized
     */
    isInitialized,
    
    /**
     * Whether the worker is currently being initialized
     */
    isInitializing,
    
    /**
     * Error that occurred during initialization, if any
     */
    error,
    
    /**
     * Manually initialize the worker
     */
    initialize: async () => {
      try {
        setIsInitializing(true);
        await workerManager.init();
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        console.error('Failed to initialize worker:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      } finally {
        setIsInitializing(false);
      }
    },
    
    /**
     * Terminate the worker
     */
    terminate: () => {
      workerManager.terminate();
      setIsInitialized(false);
    }
  };
} 