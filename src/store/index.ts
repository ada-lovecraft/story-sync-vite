import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { createStreamingSlice, StreamingSlice } from './streaming';
import { createRoundActionsSlice, RoundActions } from './roundActions';
import { extractBlocks } from '@/utils/content-transformation';
import { roundPrompt } from '@/data/round-prompt';
import { dispatchTokenEvent } from '@/utils/tokenEvents';

// Define types for each slice
export interface Round {
  roundIndex: number;
  startLine: number;
  endLine: number;
  lineCount: number;
  summary?: string;
  summaryStatus?: 'pending' | 'inProgress' | 'completed' | 'failed';
  userText?: string;
  dmText?: string;
  rawContent?: string;
}

export interface Chapter {
  roundsRange: [number, number]; // [start, end]
  omit: number[]; // array of round indices to omit
  summary?: string;
  summaryStatus?: 'pending' | 'inProgress' | 'completed' | 'failed';
}

export interface SummaryQueueItem {
  id: number;
  type: 'round' | 'chapter';
  status: 'pending' | 'inProgress' | 'completed' | 'failed';
}

// Define the store state
export interface StoreState {
  // File Upload & Raw Content Slice
  rawFileContent: string | null;
  processedContent: string | null;

  // Rounds Metadata Slice
  rounds: Round[];

  // Chapters Slice
  chapters: Chapter[];

  // Summarization Queues Slice
  roundSummaryQueue: SummaryQueueItem[];
  chapterSummaryQueue: SummaryQueueItem[];

  // File Upload & Raw Content Actions
  setRawFileContent: (content: string) => void;
  setProcessedContent: (content: string) => void;

  // Rounds Metadata Actions
  setRounds: (rounds: Round[]) => void;
  updateRound: (roundIndex: number, updatedData: Partial<Round>) => void;

  // Chapters Actions
  setChapters: (chapters: Chapter[]) => void;
  updateChapter: (chapterIndex: number, updatedData: Partial<Chapter>) => void;

  // Chapter Manipulation Actions
  slideRoundUp: (chapterIndex: number, roundIndex: number) => void;
  slideRoundDown: (chapterIndex: number, roundIndex: number) => void;
  splitChapter: (chapterIndex: number, roundIndex: number) => void;
  omitRound: (chapterIndex: number, roundIndex: number, omit: boolean) => void;

  // Summarization Queue Actions
  enqueueRoundSummary: (roundIndex: number) => void;
  dequeueRoundSummary: (roundIndex: number) => void;
  rerollRoundSummary: (roundIndex: number) => void;
  enqueueChapterSummary: (chapterIndex: number) => void;
  updateSummaryStatus: (id: number, type: 'round' | 'chapter', status: 'pending' | 'inProgress' | 'completed' | 'failed') => void;
  processRoundSummaryQueue: () => Promise<void>;
  isProcessingQueue: boolean;

  // Reset Store
  resetStore: () => void;
}

// Update the store state type to include streaming slice and round actions
export type StoreStateWithExtensions = StoreState & StreamingSlice & RoundActions;

// First, extract the slice creation functions to the top level
// Move the slice creation functions to be defined before they are used
const createStoreSlice = (set: any, get: any) => ({
  // Initial state
  rawFileContent: null,
  processedContent: null,
  rounds: [],
  chapters: [],
  roundSummaryQueue: [],
  chapterSummaryQueue: [],
  isProcessingQueue: false,

  // File Upload & Raw Content Actions
  setRawFileContent: (content: string) => set({ rawFileContent: content }),
  setProcessedContent: (content: string) => set({ processedContent: content }),

  // Rounds Metadata Actions
  setRounds: (rounds: Round[]) => set({ rounds }),
  updateRound: (roundIndex: number, updatedData: Partial<Round>) => set((state: StoreState) => {
    const roundIndex_idx = state.rounds.findIndex(r => r.roundIndex === roundIndex);
    if (roundIndex_idx === -1) return state; // round not found
    
    const newRounds = [...state.rounds];
    newRounds[roundIndex_idx] = {
      ...newRounds[roundIndex_idx],
      ...updatedData
    };
    
    return { rounds: newRounds };
  }),

  // Chapters Actions
  setChapters: (chapters: Chapter[]) => set({ chapters }),
  updateChapter: (chapterIndex: number, updatedData: Partial<Chapter>) => set((state: StoreState) => {
    if (chapterIndex < 0 || chapterIndex >= state.chapters.length) return state;
    
    const newChapters = [...state.chapters];
    newChapters[chapterIndex] = {
      ...newChapters[chapterIndex],
      ...updatedData
    };
    
    return { chapters: newChapters };
  }),

  // Chapter Manipulation Actions
  slideRoundUp: (chapterIndex: number, roundIndex: number) => set((state: StoreState) => {
    // Can't slide up if it's the first chapter
    if (chapterIndex === 0) return state;

    const newChapters = [...state.chapters];
    const currentChapter = { ...newChapters[chapterIndex] };
    const prevChapter = { ...newChapters[chapterIndex - 1] };

    // Round must be at the beginning of its chapter
    if (roundIndex !== currentChapter.roundsRange[0]) return state;

    // Update chapter round ranges
    prevChapter.roundsRange = [prevChapter.roundsRange[0], roundIndex] as [number, number];
    currentChapter.roundsRange = [roundIndex + 1, currentChapter.roundsRange[1]] as [number, number];

    // If this causes current chapter to have no rounds, merge it into prev chapter
    if (currentChapter.roundsRange[0] > currentChapter.roundsRange[1]) {
      newChapters.splice(chapterIndex, 1); // Remove current chapter
      return { chapters: newChapters };
    }

    // Otherwise, update both chapters
    newChapters[chapterIndex - 1] = prevChapter;
    newChapters[chapterIndex] = currentChapter;

    return { chapters: newChapters };
  }),

  slideRoundDown: (chapterIndex: number, roundIndex: number) => set((state: StoreState) => {
    // Can't slide down if it's the last chapter
    if (chapterIndex === state.chapters.length - 1) return state;

    const newChapters = [...state.chapters];
    const currentChapter = { ...newChapters[chapterIndex] };
    const nextChapter = { ...newChapters[chapterIndex + 1] };

    // Round must be at the end of its chapter
    if (roundIndex !== currentChapter.roundsRange[1]) return state;

    // Update chapter round ranges
    currentChapter.roundsRange = [currentChapter.roundsRange[0], roundIndex - 1] as [number, number];
    nextChapter.roundsRange = [roundIndex, nextChapter.roundsRange[1]] as [number, number];

    // If this causes current chapter to have no rounds, merge it into next chapter
    if (currentChapter.roundsRange[0] > currentChapter.roundsRange[1]) {
      newChapters.splice(chapterIndex, 1); // Remove current chapter
      return { chapters: newChapters };
    }

    // Otherwise, update both chapters
    newChapters[chapterIndex] = currentChapter;
    newChapters[chapterIndex + 1] = nextChapter;

    return { chapters: newChapters };
  }),

  splitChapter: (chapterIndex: number, roundIndex: number) => set((state: StoreState) => {
    const newChapters = [...state.chapters];
    const chapterToSplit = { ...newChapters[chapterIndex] };
    
    // Check if round is in the middle of the chapter (not the first or last)
    const [start, end] = chapterToSplit.roundsRange;
    if (roundIndex <= start || roundIndex > end) {
      // Round not in chapter or is the first round (can't split before first)
      return state;
    }
    
    // Create two new chapters from the split
    let firstChapter: Chapter = {
      ...chapterToSplit,
      roundsRange: [start, roundIndex - 1] as [number, number],
      omit: chapterToSplit.omit.filter((idx: number) => idx < roundIndex)
    };

    const secondChapter: Chapter = {
      roundsRange: [roundIndex, end] as [number, number],
      omit: chapterToSplit.omit.filter((idx: number) => idx >= roundIndex),
      summary: undefined,
      summaryStatus: undefined
    };
    
    // Replace the original chapter with the first part
    newChapters[chapterIndex] = firstChapter;
    
    // Insert the second part at the next position
    newChapters.splice(chapterIndex + 1, 0, secondChapter);
    
    return { chapters: newChapters };
  }),

  omitRound: (chapterIndex: number, roundIndex: number, omit: boolean) => set((state: StoreState) => {
    const newChapters = [...state.chapters];
    const chapter = { ...newChapters[chapterIndex] };
    
    // Check if round is in this chapter
    const [start, end] = chapter.roundsRange;
    if (roundIndex < start || roundIndex > end) {
      return state; // Not in this chapter
    }
    
    if (omit) {
      // Add roundIndex to omit array if not already present
      if (!chapter.omit.includes(roundIndex)) {
        chapter.omit = [...chapter.omit, roundIndex];
      }
    } else {
      // Remove roundIndex from omit array
      chapter.omit = chapter.omit.filter((idx: number) => idx !== roundIndex);
    }
    
    newChapters[chapterIndex] = chapter;
    
    return { chapters: newChapters };
  }),

  // Summarization Queue Actions
  enqueueRoundSummary: (roundIndex: number) => set((state: StoreState) => {
    // Check if round is already in queue
    const existingIndex = state.roundSummaryQueue.findIndex(
      (item: SummaryQueueItem) => item.id === roundIndex && item.type === 'round'
    );

    if (existingIndex === -1) {
      // Add to queue if not already present
      return {
        roundSummaryQueue: [
          ...state.roundSummaryQueue,
          { id: roundIndex, type: 'round', status: 'pending' }
        ]
      };
    }

    return state;
  }),

  dequeueRoundSummary: (roundIndex: number) => set((state: StoreState) => ({
    roundSummaryQueue: state.roundSummaryQueue.filter(
      (item: SummaryQueueItem) => !(item.id === roundIndex && item.type === 'round')
    )
  })),

  rerollRoundSummary: (roundIndex: number) => set((state: StoreState) => {
    const newQueue = [...state.roundSummaryQueue];
    const existingIndex = newQueue.findIndex(
      (item: SummaryQueueItem) => item.id === roundIndex && item.type === 'round'
    );

    // Update the round status to 'pending' in the rounds array
    const newRounds = [...state.rounds];
    const roundToUpdateIndex = newRounds.findIndex(round => round.roundIndex === roundIndex);
    if (roundToUpdateIndex !== -1) {
      newRounds[roundToUpdateIndex] = {
        ...newRounds[roundToUpdateIndex],
        summaryStatus: 'pending'
      };
    }

    if (existingIndex !== -1) {
      // Remove from current position
      const item = newQueue.splice(existingIndex, 1)[0];
      // Add to the front of the queue
      newQueue.unshift({ ...item, status: 'pending' });
    } else {
      // Add to the front if not in queue
      newQueue.unshift({ id: roundIndex, type: 'round', status: 'pending' });
    }

    return {
      roundSummaryQueue: newQueue,
      rounds: newRounds
    };
  }),

  enqueueChapterSummary: (chapterIndex: number) => set((state: StoreState) => {
    // Check if chapter is already in queue
    const existingIndex = state.chapterSummaryQueue.findIndex(
      (item: SummaryQueueItem) => item.id === chapterIndex && item.type === 'chapter'
    );

    if (existingIndex === -1) {
      // Add to queue if not already present
      return {
        chapterSummaryQueue: [
          ...state.chapterSummaryQueue,
          { id: chapterIndex, type: 'chapter', status: 'pending' }
        ]
      };
    }

    return state;
  }),

  updateSummaryStatus: (id: number, type: 'round' | 'chapter', status: 'pending' | 'inProgress' | 'completed' | 'failed') => set((state: StoreState) => {
    if (type === 'round') {
      return {
        roundSummaryQueue: state.roundSummaryQueue.map((item: SummaryQueueItem) =>
          item.id === id && item.type === 'round'
            ? { ...item, status }
            : item
        ),
        rounds: state.rounds.map((round: Round) =>
          round.roundIndex === id
            ? { ...round, summaryStatus: status }
            : round
        )
      };
    } else {
      return {
        chapterSummaryQueue: state.chapterSummaryQueue.map((item: SummaryQueueItem) =>
          item.id === id && item.type === 'chapter'
            ? { ...item, status }
            : item
        ),
        chapters: state.chapters.map((chapter: Chapter, index: number) =>
          index === id
            ? { ...chapter, summaryStatus: status }
            : chapter
        )
      };
    }
  }),

  // Process Queue - Update to use the streaming slice methods
  processRoundSummaryQueue: async () => {
    const state = useStore.getState();
    
    // If queue is empty or already processing, don't proceed
    if (state.roundSummaryQueue.length === 0 || state.isProcessingQueue) {
      return;
    }
    
    // Set processing flag
    set({ isProcessingQueue: true });
    
    try {
      // Get the first item in the queue (highest priority)
      const queueItem = state.roundSummaryQueue[0];
      
      if (queueItem.type !== 'round') {
        // Skip non-round items (would be handled by a different processor)
        set({ isProcessingQueue: false });
        return;
      }
      
      const roundIndex = queueItem.id;
      
      // Get the round
      const round = state.rounds.find(r => r.roundIndex === roundIndex);
      
      if (!round) {
        console.error(`Round with index ${roundIndex} not found in rounds array`);
        // Remove from queue and continue processing the next item
        set((state: StoreState) => {
          const newQueue = [...state.roundSummaryQueue];
          newQueue.shift(); // Remove the first item
          return {
            roundSummaryQueue: newQueue,
            isProcessingQueue: false
          };
        });
        
        // Continue with next item in queue if available
        requestAnimationFrame(() => {
          useStore.getState().processRoundSummaryQueue();
        });
        return;
      }
      
      // Extract roundContent
      let roundContent = round.rawContent;
      if (!roundContent) {
        // Get processed content from store
        const processedContent = state.processedContent;
        if (!processedContent) {
          console.error('No processed content available in store');
          set({ isProcessingQueue: false });
          return;
        }
        
        // Extract the content for this round from the processed content
        const lines = processedContent.split('\n');
        roundContent = lines.slice(round.startLine, round.endLine + 1).join('\n');
        
        // Update the round with the raw content
        if (roundContent) {
          // Extract user and dungeon master content
          const { userContent, dmContent } = extractBlocks(roundContent);
          
          // Update the round in the store
          state.updateRound(roundIndex, {
            rawContent: roundContent,
            userText: userContent,
            dmText: dmContent
          });
        } else {
          console.error(`Could not extract content for round ${roundIndex}`);
          // Update queue item status to failed and continue with next item
          set((state: StoreState) => {
            const newQueue = [...state.roundSummaryQueue];
            newQueue.shift(); // Remove the first item (current)
            
            // Continue with next item in queue if available
            if (newQueue.length > 0) {
              requestAnimationFrame(() => {
                useStore.getState().processRoundSummaryQueue();
              });
            }
            
            return {
              roundSummaryQueue: newQueue,
              isProcessingQueue: newQueue.length === 0 ? false : true
            };
          });
          return;
        }
      }
      
      // Extract DM content from the raw content
      const { dmContent } = extractBlocks(roundContent);
      if (!dmContent) {
        console.error("No dungeon master content found in the round");
        // Update queue item status to failed and continue with next item
        state.failStreaming(roundIndex, "No dungeon master content found");
        
        set((state: StoreState) => {
          const newQueue = [...state.roundSummaryQueue];
          newQueue.shift(); // Remove the first item (current)
          
          // Continue with next item in queue if available
          if (newQueue.length > 0) {
            requestAnimationFrame(() => {
              useStore.getState().processRoundSummaryQueue();
            });
          }
          
          return {
            roundSummaryQueue: newQueue,
            isProcessingQueue: newQueue.length === 0 ? false : true
          };
        });
        return;
      }
      
      // Update round status to inProgress
      state.startStreaming(roundIndex);
      
      // Update queue item status to inProgress
      set((state: StoreState) => {
        const newQueue = [...state.roundSummaryQueue];
        if (newQueue[0] && newQueue[0].id === roundIndex) {
          newQueue[0] = { ...newQueue[0], status: 'inProgress' };
        }
        return { roundSummaryQueue: newQueue };
      });
      
      // Prepare the prompt by replacing the placeholder
      const prompt = roundPrompt.replace("[[narrative-excerpt]]", dmContent);
      
      // Import WorkerManager dynamically to avoid circular dependencies
      const { workerManager } = await import('@/services/workerManager');
      
      // Start streaming using the worker manager
      await workerManager.startStream(
        roundIndex,
        prompt,
        'http://localhost:4000/generate'
      )
      .then(() => {
        // This resolves when the worker manager has started the stream
        // The worker will handle the actual streaming and update the store
        console.log(`Stream started for round ${roundIndex}`);
      })
      .catch((error: Error) => {
        console.error(`Error starting stream for round ${roundIndex}:`, error);
        // Handle stream start error
        state.failStreaming(roundIndex, error.message || "Failed to start stream");
        
        // Remove from queue and continue with next item
        set((state: StoreState) => {
          const newQueue = [...state.roundSummaryQueue];
          newQueue.shift(); // Remove the failed item
          
          // Continue with next item in queue if available
          if (newQueue.length > 0) {
            requestAnimationFrame(() => {
              useStore.getState().processRoundSummaryQueue();
            });
          }
          
          return {
            roundSummaryQueue: newQueue,
            isProcessingQueue: newQueue.length === 0 ? false : true
          };
        });
      });
      
      // Once we've started the stream, immediately process the next item in the queue
      // The worker handles all the streaming and updates without blocking
      set((state: StoreState) => {
        const newQueue = [...state.roundSummaryQueue];
        newQueue.shift(); // Remove the item we just started processing
        
        // If there are more items, continue processing the queue
        if (newQueue.length > 0) {
          requestAnimationFrame(() => {
            useStore.getState().processRoundSummaryQueue();
          });
        }
        
        return {
          roundSummaryQueue: newQueue,
          isProcessingQueue: newQueue.length === 0 ? false : true
        };
      });
      
    } catch (error) {
      console.error('Error processing queue:', error);
      
      // Get the current queue item
      const state = useStore.getState();
      const currentItem = state.roundSummaryQueue[0];
      
      if (currentItem && currentItem.type === 'round') {
        // Use streaming slice for error handling
        state.failStreaming(currentItem.id, error instanceof Error ? error.message : "Unknown error");
      }
      
      // Remove failed item and reset processing flag
      set((state: StoreState) => {
        const newQueue = [...state.roundSummaryQueue];
        newQueue.shift(); // Remove the failed item
        
        // Continue processing if there are more items
        if (newQueue.length > 0) {
          requestAnimationFrame(() => {
            useStore.getState().processRoundSummaryQueue();
          });
        }
        
        return {
          roundSummaryQueue: newQueue,
          isProcessingQueue: newQueue.length === 0 ? false : true
        };
      });
    }
  },
  
  // Reset Store - also reset streaming state and cleanup resources
  resetStore: () => {
    console.log('⚠️ Resetting store state completely')
    
    // First, try to cancel any active streams or workers
    try {
      if (typeof window !== 'undefined') {
        // Clean up any active worker instances
        if ((window as any).workerManager) {
          console.log('🧹 Aborting all active streams')
          ;(window as any).workerManager.abortAll?.()
        }
        
        // Clean up any active event listeners
        console.log('🧹 Cleaning up event listeners')
        const events = document.querySelectorAll('*')
        events.forEach(el => {
          el.replaceWith(el.cloneNode(true))
        })
      }
    } catch (error) {
      console.error('Error during worker cleanup:', error)
    }
    
    // Set all state back to initial values
    console.log('🧹 Resetting state to initial values')
    set({
      rawFileContent: null,
      processedContent: null,
      rounds: [],
      chapters: [],
      roundSummaryQueue: [],
      chapterSummaryQueue: [],
      isProcessingQueue: false,
      activeStreams: {} // Clear streaming state
    })
    
    console.log('✅ Store reset complete')
    
    return true
  },
});

// Define type for the partialize result
type PersistedState = {
  rawFileContent: string | null;
  processedContent: string | null;
  rounds: Round[];
  chapters: Chapter[];
  roundSummaryQueue: SummaryQueueItem[];
  chapterSummaryQueue: SummaryQueueItem[];
};

// Create the store using the previously defined slice functions
export const useStore = create<StoreStateWithExtensions>()(
  devtools(
    persist(
      (set, get, api) => ({
        ...createStoreSlice(set, get),
        ...createStreamingSlice(set, get, api),
        ...createRoundActionsSlice(set, get, api),
      }),
      {
        name: 'story-sync-storage', // Name for the localStorage key
        partialize: (state) => {
          console.log('Persist middleware partializing state', { 
            rawFileContent: state.rawFileContent ? `${state.rawFileContent.length} chars` : null,
            processedContent: state.processedContent ? `${state.processedContent.length} chars` : null,
            rounds: state.rounds.length,
            chapters: state.chapters.length,
            roundSummaryQueue: state.roundSummaryQueue.length,
            chapterSummaryQueue: state.chapterSummaryQueue.length,
          });
          
          // Only persist essential data, avoid large content fields if possible
          return {
            // For large text content, consider not persisting or truncating
            // to avoid localStorage limits and performance issues
            rawFileContent: null, // Don't persist raw content, it can be too large
            processedContent: null, // Don't persist processed content, it can be too large
            rounds: state.rounds,
            chapters: state.chapters,
            roundSummaryQueue: state.roundSummaryQueue,
            chapterSummaryQueue: state.chapterSummaryQueue,
          };
        },
        // Add these options to fix the caching issue
        version: 1, // Add a version number for migrations
        // Cache the result of getSnapshot to avoid infinite loops
        storage: {
          getItem: (name: string) => {
            const str = localStorage.getItem(name);
            if (!str) return null;
            try {
              return JSON.parse(str);
            } catch (e) {
              console.error('Failed to parse storage item:', e);
              return null;
            }
          },
          setItem: (name: string, value: unknown) => {
            try {
              localStorage.setItem(name, JSON.stringify(value));
            } catch (e) {
              console.error('Failed to save to storage:', e);
            }
          },
          removeItem: (name: string) => localStorage.removeItem(name),
        },
        // Add a proper migrate function to handle version changes
        migrate: (persistedState: unknown, version): PersistedState => {
          console.log('Migrate function called', { version, persistedState });
          
          // If there's no version (first time) or version is 0, create default state
          if (version === 0) {
            console.log('Creating default state for migration');
            // Return empty state to be merged with initial state
            return {
              rawFileContent: null,
              processedContent: null,
              rounds: [],
              chapters: [],
              roundSummaryQueue: [],
              chapterSummaryQueue: [],
            };
          }

          // Handle actual migrations based on version
          console.log('Using persisted state for migration');
          return persistedState as PersistedState;
        },
        // Fix the merge function with proper typing and structural sharing
        merge: (persistedState: unknown, currentState) => {
          console.log('Merge function called', { 
            hasPersistedState: !!persistedState,
            currentStateKeys: Object.keys(currentState),
          });
          
          // Type assertion to make TypeScript happy
          const typedPersistedState = persistedState as PersistedState;
          
          // If typedPersistedState is null or undefined, just return current state
          if (!typedPersistedState) {
            console.log('No persisted state, using current state');
            return currentState;
          }
          
          // Create a new object with structural sharing for better performance
          // This helps avoid unnecessary re-renders
          const result = {
            ...currentState,
            // Carefully merge only what we need from persisted state
            ...(typedPersistedState ? {
              // Don't restore content from localStorage to avoid potential issues
              // with large data or stale state
              rounds: typedPersistedState.rounds || [],
              chapters: typedPersistedState.chapters || [],
              roundSummaryQueue: typedPersistedState.roundSummaryQueue || [],
              chapterSummaryQueue: typedPersistedState.chapterSummaryQueue || [],
            } : {}),
          };
          
          console.log('Merge result', { 
            roundsLength: result.rounds?.length,
            chaptersLength: result.chapters?.length,
          });
          
          return result;
        },
      }
    ),
    { name: 'story-sync-store' }
  )
);

// Add a debugging function to the window object
if (typeof window !== 'undefined') {
  (window as any).debugStore = {
    getState: () => useStore.getState(),
    resetStore: () => useStore.getState().resetStore(),
    clearStorage: () => {
      localStorage.removeItem('story-sync-storage');
      console.log('Cleared localStorage for story-sync-storage');
    }
  };
  
  console.log('Debug store attached to window object. Use window.debugStore to inspect and debug');
}

// Helper functions and types remain at the bottom
// ... existing code ... 