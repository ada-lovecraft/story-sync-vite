import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { extractBlocks } from '@/utils/content-transformation';
import { roundPrompt } from '@/data/round-prompt';

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
interface StoreState {
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

// Create the store
export const useStore = create<StoreState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        rawFileContent: null,
        processedContent: null,
        rounds: [],
        chapters: [],
        roundSummaryQueue: [],
        chapterSummaryQueue: [],
        isProcessingQueue: false,

        // File Upload & Raw Content Actions
        setRawFileContent: (content) => set({ rawFileContent: content }),
        setProcessedContent: (content) => set({ processedContent: content }),

        // Rounds Metadata Actions
        setRounds: (rounds) => set({ rounds }),
        updateRound: (roundIndex, updatedData) => set((state) => ({
          rounds: state.rounds.map((round) =>
            round.roundIndex === roundIndex
              ? { ...round, ...updatedData }
              : round
          )
        })),

        // Chapters Actions
        setChapters: (chapters) => set({ chapters }),
        updateChapter: (chapterIndex, updatedData) => set((state) => ({
          chapters: state.chapters.map((chapter, index) =>
            index === chapterIndex
              ? { ...chapter, ...updatedData }
              : chapter
          )
        })),

        // Chapter Manipulation Actions
        slideRoundUp: (chapterIndex, roundIndex) => set((state) => {
          // Can't slide up if it's the first chapter
          if (chapterIndex === 0) return state;

          const newChapters = [...state.chapters];
          const currentChapter = { ...newChapters[chapterIndex] };
          const previousChapter = { ...newChapters[chapterIndex - 1] };

          // Find the position of the roundIndex in the current chapter
          const [currentStart, currentEnd] = currentChapter.roundsRange;

          // If the round is not in this chapter or it's the first round, return unchanged state
          if (roundIndex < currentStart || roundIndex > currentEnd) {
            return state;
          }

          // Calculate how many rounds to move (from the clicked round to the end of the chapter)
          const roundsToMove = currentEnd - roundIndex + 1;

          // Update the previous chapter's end range
          const [prevStart, prevEnd] = previousChapter.roundsRange;
          previousChapter.roundsRange = [prevStart, prevEnd + roundsToMove] as [number, number];

          // Update the current chapter's start range
          currentChapter.roundsRange = [currentStart, roundIndex - 1] as [number, number];

          // If the current chapter would be empty after this operation, remove it
          if (currentChapter.roundsRange[0] > currentChapter.roundsRange[1]) {
            newChapters.splice(chapterIndex, 1);
          } else {
            newChapters[chapterIndex] = currentChapter;
          }

          // Update the previous chapter
          newChapters[chapterIndex - 1] = previousChapter;

          // Move any omitted rounds to the appropriate chapter
          const omittedRoundsToMove = currentChapter.omit.filter(
            omittedIndex => omittedIndex >= roundIndex && omittedIndex <= currentEnd
          );

          if (omittedRoundsToMove.length > 0) {
            // Remove from current chapter
            currentChapter.omit = currentChapter.omit.filter(
              omittedIndex => omittedIndex < roundIndex
            );

            // Add to previous chapter
            previousChapter.omit = [...previousChapter.omit, ...omittedRoundsToMove];
          }

          return { chapters: newChapters };
        }),

        slideRoundDown: (chapterIndex, roundIndex) => set((state) => {
          // Can't slide down if it's the last chapter
          if (chapterIndex === state.chapters.length - 1) return state;

          const newChapters = [...state.chapters];
          const currentChapter = { ...newChapters[chapterIndex] };
          const nextChapter = { ...newChapters[chapterIndex + 1] };

          // Find the position of the roundIndex in the current chapter
          const [currentStart, currentEnd] = currentChapter.roundsRange;

          // If the round is not in this chapter, return unchanged state
          if (roundIndex < currentStart || roundIndex > currentEnd) {
            return state;
          }

          // Calculate how many rounds to move (from the clicked round to the end of the chapter)
          const roundsToMove = currentEnd - roundIndex + 1;

          // Update the next chapter's start range
          const [nextStart, nextEnd] = nextChapter.roundsRange;
          nextChapter.roundsRange = [nextStart - roundsToMove, nextEnd] as [number, number];

          // Update the current chapter's end range
          currentChapter.roundsRange = [currentStart, roundIndex - 1] as [number, number];

          // If the current chapter would be empty after this operation, remove it
          if (currentChapter.roundsRange[0] > currentChapter.roundsRange[1]) {
            newChapters.splice(chapterIndex, 1);
          } else {
            newChapters[chapterIndex] = currentChapter;
          }

          // Update the next chapter
          newChapters[chapterIndex + 1] = nextChapter;

          // Move any omitted rounds to the appropriate chapter
          const omittedRoundsToMove = currentChapter.omit.filter(
            omittedIndex => omittedIndex >= roundIndex && omittedIndex <= currentEnd
          );

          if (omittedRoundsToMove.length > 0) {
            // Remove from current chapter
            currentChapter.omit = currentChapter.omit.filter(
              omittedIndex => omittedIndex < roundIndex
            );

            // Add to next chapter
            nextChapter.omit = [...nextChapter.omit, ...omittedRoundsToMove];
          }

          return { chapters: newChapters };
        }),

        splitChapter: (chapterIndex, roundIndex) => set((state) => {
          const newChapters = [...state.chapters];
          const chapterToSplit = { ...newChapters[chapterIndex] };

          // Find the position of the roundIndex in the chapter
          const [start, end] = chapterToSplit.roundsRange;

          // If the round is not in this chapter, return unchanged state
          if (roundIndex < start || roundIndex > end) {
            return state;
          }

          // If trying to split at the first round, just return the original state
          // since we can't create an empty first chapter
          if (roundIndex === start) {
            return state;
          }

          // Create two new chapters from the split
          const firstChapter = {
            ...chapterToSplit,
            roundsRange: [start, roundIndex - 1] as [number, number],
            omit: chapterToSplit.omit.filter(idx => idx < roundIndex)
          };

          const secondChapter: Chapter = {
            roundsRange: [roundIndex, end] as [number, number],
            omit: chapterToSplit.omit.filter(idx => idx >= roundIndex),
            summary: undefined,
            summaryStatus: undefined
          };

          // Replace the original chapter with the first chapter
          newChapters[chapterIndex] = firstChapter;

          // Insert the second chapter after the first one
          newChapters.splice(chapterIndex + 1, 0, secondChapter);

          return { chapters: newChapters };
        }),

        omitRound: (chapterIndex, roundIndex, omit) => set((state) => {
          const newChapters = [...state.chapters];
          const chapter = { ...newChapters[chapterIndex] };

          if (omit) {
            // Add roundIndex to omit array if not already there
            if (!chapter.omit.includes(roundIndex)) {
              chapter.omit = [...chapter.omit, roundIndex];
            }
          } else {
            // Remove roundIndex from omit array
            chapter.omit = chapter.omit.filter(idx => idx !== roundIndex);
          }

          newChapters[chapterIndex] = chapter;

          // Update the corresponding round's summary status to reflect it's omitted
          // This will help with visual indication in the UI
          const newRounds = [...state.rounds];
          const roundToUpdate = newRounds.find(round => round.roundIndex === roundIndex);

          if (roundToUpdate) {
            // If omitted, mark round with a special status (or use existing status)
            // This is purely for UI indication and doesn't affect actual summarization
            const updatedRound = {
              ...roundToUpdate,
              // Optional: Add a flag to indicate this round is omitted from processing
              // We could add a new property like `isOmitted` but using the chapter.omit array is cleaner
            };

            // Update the round in the array
            const roundIdx = newRounds.findIndex(r => r.roundIndex === roundIndex);
            if (roundIdx !== -1) {
              newRounds[roundIdx] = updatedRound;
            }
          }

          return {
            chapters: newChapters,
            rounds: newRounds
          };
        }),

        // Summarization Queue Actions
        enqueueRoundSummary: (roundIndex) => set((state) => {
          // Check if round is already in queue
          const existingIndex = state.roundSummaryQueue.findIndex(
            item => item.id === roundIndex && item.type === 'round'
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

        dequeueRoundSummary: (roundIndex) => set((state) => ({
          roundSummaryQueue: state.roundSummaryQueue.filter(
            item => !(item.id === roundIndex && item.type === 'round')
          )
        })),

        rerollRoundSummary: (roundIndex) => set((state) => {
          const newQueue = [...state.roundSummaryQueue];
          const existingIndex = newQueue.findIndex(
            item => item.id === roundIndex && item.type === 'round'
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

        enqueueChapterSummary: (chapterIndex) => set((state) => {
          // Check if chapter is already in queue
          const existingIndex = state.chapterSummaryQueue.findIndex(
            item => item.id === chapterIndex && item.type === 'chapter'
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

        updateSummaryStatus: (id, type, status) => set((state) => {
          if (type === 'round') {
            return {
              roundSummaryQueue: state.roundSummaryQueue.map(item =>
                item.id === id && item.type === 'round'
                  ? { ...item, status }
                  : item
              ),
              rounds: state.rounds.map(round =>
                round.roundIndex === id
                  ? { ...round, summaryStatus: status }
                  : round
              )
            };
          } else {
            return {
              chapterSummaryQueue: state.chapterSummaryQueue.map(item =>
                item.id === id && item.type === 'chapter'
                  ? { ...item, status }
                  : item
              ),
              chapters: state.chapters.map((chapter, index) =>
                index === id
                  ? { ...chapter, summaryStatus: status }
                  : chapter
              )
            };
          }
        }),

        // Process Queue
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
              return;
            }
            
            const roundIndex = queueItem.id;
            
            // Get the round
            const round = state.rounds.find(r => r.roundIndex === roundIndex);
            
            if (!round) {
              console.error(`Round with index ${roundIndex} not found in rounds array`);
              // Remove from queue and continue
              set((state) => ({
                roundSummaryQueue: state.roundSummaryQueue.filter((_, i) => i !== 0),
                isProcessingQueue: false
              }));
              return;
            }
            
            // Extract roundContent
            let roundContent = round.rawContent;
            if (!roundContent) {
              // Get processed content from store
              const processedContent = state.processedContent;
              if (!processedContent) {
                console.error('No processed content available in store');
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
                // Update queue item status to failed
                set((state) => {
                  const newQueue = [...state.roundSummaryQueue];
                  newQueue.shift(); // Remove the first item (current)
                  return {
                    roundSummaryQueue: newQueue,
                    isProcessingQueue: false
                  };
                });
                return;
              }
            }
            
            // Extract DM content from the raw content
            const { dmContent } = extractBlocks(roundContent);
            if (!dmContent) {
              console.error("No dungeon master content found in the round");
              // Update queue item status to failed
              set((state) => {
                const newQueue = [...state.roundSummaryQueue];
                newQueue.shift(); // Remove the first item (current)
                return {
                  roundSummaryQueue: newQueue,
                  isProcessingQueue: false
                };
              });
              return;
            }
            
            // Update round status to inProgress
            state.updateRound(roundIndex, { summaryStatus: 'inProgress' });
            
            // Prepare the prompt by replacing the placeholder
            const prompt = roundPrompt.replace("[[narrative-excerpt]]", dmContent);
            
            // Call the API
            const response = await fetch('http://localhost:4000/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt, model: 'gpt-4o-mini' }),
            });

            if (!response.ok) {
              throw new Error(`Server error: ${response.status}`);
            }

            // Handle streaming response
            const reader = response.body?.getReader();
            if (!reader) {
              throw new Error('Failed to get response stream reader');
            }

            
            const decoder = new TextDecoder();
            let done = false;
            let summary = '';
            state.updateRound(roundIndex, { summary: '', summaryStatus: 'inProgress' });
            while (!done) {
              const { value, done: doneReading } = await reader.read();
              done = doneReading;

              if (value) {
                const text = decoder.decode(value, { stream: !done });
                summary += text;
                
                // Update the summary as it comes in
                state.updateRound(roundIndex, { 
                  summary: summary.trim(),
                  summaryStatus: 'inProgress'
                });
              }
            }

            // Update with completed status
            state.updateRound(roundIndex, { 
              summary: summary.trim(),
              summaryStatus: 'completed'
            });
            
            // Update queue - remove the processed item
            set((state) => {
              const newQueue = [...state.roundSummaryQueue];
              newQueue.shift(); // Remove the first item (current)
              
              // Continue processing if there are more items
              if (newQueue.length > 0) {
                requestAnimationFrame(() => {
                  useStore.getState().processRoundSummaryQueue();
                });
              }
              
              return {
                roundSummaryQueue: newQueue,
                isProcessingQueue: false
              };
            });
            
          } catch (error) {
            console.error('Error processing queue:', error);
            
            // Get the current queue item
            const state = useStore.getState();
            const currentItem = state.roundSummaryQueue[0];
            
            if (currentItem && currentItem.type === 'round') {
              // Update the round status to failed
              state.updateRound(currentItem.id, { summaryStatus: 'failed' });
            }
            
            // Remove failed item and reset processing flag
            set((state) => {
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
                isProcessingQueue: false
              };
            });
          }
        },
        
        // Reset Store
        resetStore: () => set({
          rawFileContent: null,
          processedContent: null,
          rounds: [],
          chapters: [],
          roundSummaryQueue: [],
          chapterSummaryQueue: [],
          isProcessingQueue: false
        }),
      }),
      {
        name: 'story-sync-storage', // Name for the localStorage key
        partialize: (state) => ({
          // Only persist these parts of the state
          rawFileContent: state.rawFileContent,
          processedContent: state.processedContent,
          rounds: state.rounds,
          chapters: state.chapters,
          roundSummaryQueue: state.roundSummaryQueue,
          chapterSummaryQueue: state.chapterSummaryQueue,
        }),
      }
    ),
    { name: 'story-sync-store' }
  )
); 