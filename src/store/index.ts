import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Define types for each slice
export interface Round {
  roundIndex: number;
  startLine: number;
  endLine: number;
  lineCount: number;
  summary?: string;
  summaryStatus?: 'pending' | 'inProgress' | 'completed' | 'failed';
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
  
  // Reset Store
  resetStore: () => void;
}

// Create the store
export const useStore = create<StoreState>()(
  devtools(
    (set) => ({
      // Initial state
      rawFileContent: null,
      processedContent: null,
      rounds: [],
      chapters: [],
      roundSummaryQueue: [],
      chapterSummaryQueue: [],
      
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
        
        // Update the round ranges
        // This is a simplified implementation that would need more logic
        // based on how rounds are actually stored and referenced
        return { chapters: newChapters };
      }),
      
      slideRoundDown: (chapterIndex, roundIndex) => set((state) => {
        // Can't slide down if it's the last chapter
        if (chapterIndex === state.chapters.length - 1) return state;
        
        const newChapters = [...state.chapters];
        const currentChapter = { ...newChapters[chapterIndex] };
        const nextChapter = { ...newChapters[chapterIndex + 1] };
        
        // Update the round ranges
        // This is a simplified implementation that would need more logic
        // based on how rounds are actually stored and referenced
        return { chapters: newChapters };
      }),
      
      splitChapter: (chapterIndex, roundIndex) => set((state) => {
        const newChapters = [...state.chapters];
        const chapterToSplit = { ...newChapters[chapterIndex] };
        
        // Create two new chapters from the split
        // This is a simplified implementation that would need more logic
        // based on how rounds are actually stored and referenced
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
        return { chapters: newChapters };
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
        
        if (existingIndex !== -1) {
          // Remove from current position
          const item = newQueue.splice(existingIndex, 1)[0];
          // Add to the front of the queue
          newQueue.unshift({ ...item, status: 'pending' });
        } else {
          // Add to the front if not in queue
          newQueue.unshift({ id: roundIndex, type: 'round', status: 'pending' });
        }
        
        return { roundSummaryQueue: newQueue };
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
      
      // Reset Store
      resetStore: () => set({
        rawFileContent: null,
        processedContent: null,
        rounds: [],
        chapters: [],
        roundSummaryQueue: [],
        chapterSummaryQueue: []
      })
    }),
    { name: 'story-sync-store' }
  )
); 