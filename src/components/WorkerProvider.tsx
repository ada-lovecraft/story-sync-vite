import { FC, ReactNode, createContext, useContext, useMemo } from 'react';
import { useWorkerManager } from '@/hooks/useWorkerManager';

/**
 * Context for the Worker Manager
 */
interface WorkerContextType {
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  initialize: () => Promise<void>;
}

// Create context with a default value
const WorkerContext = createContext<WorkerContextType>({
  isInitialized: false,
  isInitializing: false,
  error: null,
  initialize: async () => {}
});

/**
 * Hook to access the worker context
 */
export function useWorker() {
  return useContext(WorkerContext);
}

interface WorkerProviderProps {
  children: ReactNode;
}

/**
 * Provider component that initializes the worker manager
 * and makes it available to the application
 */
export const WorkerProvider: FC<WorkerProviderProps> = ({ children }) => {
  // Initialize the worker manager
  const {
    isInitialized,
    isInitializing,
    error,
    initialize
  } = useWorkerManager({
    initializeImmediately: true
  });
  
  // Create context value
  const contextValue = useMemo(() => ({
    isInitialized,
    isInitializing,
    error,
    initialize
  }), [isInitialized, isInitializing, error, initialize]);
  
  return (
    <WorkerContext.Provider value={contextValue}>
      {children}
    </WorkerContext.Provider>
  );
}; 