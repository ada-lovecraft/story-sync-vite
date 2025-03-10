import { StateCreator } from 'zustand'
import { StoreState, Round } from './index'

/**
 * Interface for round-specific actions
 */
export interface RoundActions {
  /**
   * Update a specific field for a round without affecting other fields
   * This is more efficient than updating the entire round
   * 
   * @param roundIndex The round index to update
   * @param field The field name to update
   * @param value The new value for the field
   */
  updateRoundField: <K extends keyof Round>(
    roundIndex: number, 
    field: K, 
    value: Round[K]
  ) => void
  
  /**
   * Batch update multiple rounds at once
   * This reduces the number of store updates and re-renders
   * 
   * @param updates An array of round updates to apply
   */
  batchUpdateRounds: (
    updates: Array<{
      roundIndex: number
      data: Partial<Round>
    }>
  ) => void
  
  /**
   * Efficiently update only the summary text without changing status
   * Used during streaming to update the UI without triggering unnecessary re-renders
   * 
   * @param roundIndex The round index to update
   * @param summaryText The new summary text
   */
  updateRoundSummaryText: (
    roundIndex: number, 
    summaryText: string
  ) => void
  
  /**
   * Update the summary status of a round
   * 
   * @param roundIndex The round index to update
   * @param status The new status
   */
  updateRoundSummaryStatus: (
    roundIndex: number, 
    status: Round['summaryStatus']
  ) => void
  
  /**
   * Find a round by index
   * 
   * @param roundIndex The round index to find
   * @returns The found round or undefined
   */
  findRound: (
    roundIndex: number
  ) => Round | undefined
}

/**
 * Round-specific slice creator for the Zustand store
 */
export const createRoundActionsSlice: StateCreator<
  StoreState,
  [],
  [],
  RoundActions
> = (set, get) => ({
  /**
   * Update a single field of a round
   * More efficient than updating the entire round object
   */
  updateRoundField: (roundIndex, field, value) => {
    set((state) => {
      const roundIndex1 = state.rounds.findIndex(
        round => round.roundIndex === roundIndex
      )
      
      // If round not found, return state unchanged
      if (roundIndex1 === -1) return state
      
      // Create a new rounds array with the updated round
      const newRounds = [...state.rounds]
      newRounds[roundIndex1] = {
        ...newRounds[roundIndex1],
        [field]: value
      }
      
      return { rounds: newRounds }
    })
  },
  
  /**
   * Batch update multiple rounds in a single state update
   * Reduces re-renders when updating many rounds at once
   */
  batchUpdateRounds: (updates) => {
    set((state) => {
      if (updates.length === 0) return state
      
      // Create a map for faster lookups
      const updatesMap = new Map(
        updates.map(update => [update.roundIndex, update.data])
      )
      
      // Apply all updates at once
      const newRounds = state.rounds.map(round => {
        const updateData = updatesMap.get(round.roundIndex)
        return updateData ? { ...round, ...updateData } : round
      })
      
      return { rounds: newRounds }
    })
  },
  
  /**
   * Update just the summary text field
   * Used during streaming to update text without changing status
   */
  updateRoundSummaryText: (roundIndex, summaryText) => {
    set((state) => {
      const roundIdx = state.rounds.findIndex(
        round => round.roundIndex === roundIndex
      )
      
      // If round not found, return state unchanged
      if (roundIdx === -1) return state
      
      // Create a new rounds array with the updated round
      const newRounds = [...state.rounds]
      newRounds[roundIdx] = {
        ...newRounds[roundIdx],
        summary: summaryText
      }
      
      return { rounds: newRounds }
    })
  },
  
  /**
   * Update just the summary status field
   */
  updateRoundSummaryStatus: (roundIndex, status) => {
    set((state) => {
      const roundIdx = state.rounds.findIndex(
        round => round.roundIndex === roundIndex
      )
      
      // If round not found, return state unchanged
      if (roundIdx === -1) return state
      
      // Create a new rounds array with the updated round
      const newRounds = [...state.rounds]
      newRounds[roundIdx] = {
        ...newRounds[roundIdx],
        summaryStatus: status
      }
      
      return { rounds: newRounds }
    })
  },
  
  /**
   * Find a round by its index
   */
  findRound: (roundIndex) => {
    return get().rounds.find(round => round.roundIndex === roundIndex)
  }
}) 