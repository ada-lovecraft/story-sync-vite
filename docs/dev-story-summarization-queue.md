Here's a **step-by-step** implementation checklist to help you add the **multi-chapter, multi-round concurrency** feature to your existing system. Each step includes the rationale behind it and suggestions on how to implement.

---

## 1. **Confirm Store Data Model & Actions** [IN PROGRESS]

1. **Validate `Round` structure**  
   - [ ] Ensure each `Round` has a unique `roundIndex`.  
   - [ ] Confirm `summaryStatus` can represent states like `'pending' | 'inProgress' | 'completed' | 'failed'`.  
   - [ ] Confirm you can store `summary` text in the round once completed.

2. **Validate `Chapter` structure**  
   - [ ] Each `Chapter` has `[start, end]` in `roundsRange`.  
   - [ ] Confirm that you can map each `Round` to exactly one `Chapter` by scanning for `(start <= roundIndex <= end)`.

3. **Queue Arrays**  
   - [ ] Confirm `roundSummaryQueue` is an array of objects:  
     ```ts
     { id: number; type: 'round'; status: 'pending' | 'inProgress' | ... }
     ```
   - [ ] Confirm you have actions for updating statuses, enqueuing, dequeuing, etc.

4. **Actions for Summaries**  
   - [ ] Make sure you have:  
     - [ ] `updateRound(roundIndex, updatedData)` for setting `summary` and `summaryStatus`.  
     - [ ] `updateSummaryStatus(id, 'round', newStatus)` to keep queue item and round status in sync.  
     - [ ] `dequeueRoundSummary(roundIndex)` if you want to remove completed or canceled rounds from the queue.  

**Goal**: The store is your single source of truth for which rounds are queued, their statuses, and their final summaries.

### Steps Taken

---

## 2. **Add a Function to Identify Chapter for a Given Round**

You'll need a helper function to map a `roundIndex` to the correct chapter index:

```ts
function findChapterIndexForRound(roundIndex: number, chapters: Chapter[]): number {
  return chapters.findIndex((chapter) => {
    const [start, end] = chapter.roundsRange;
    return roundIndex >= start && roundIndex <= end;
  });
}
```

**Goal**: This is crucial for concurrency logic—so you can group rounds by chapter.

---

## 3. **Decide on Concurrency Limits**

1. **`maxConcurrentChapters`**: How many chapters can process *any* rounds simultaneously? (e.g., 3)  
2. **`maxConcurrentRounds`**: How many rounds per chapter can run in parallel? (e.g., 3)  
3. **`maxRetries`**: How many times you want to retry a failed round before giving up? (e.g., 3)

**Goal**: These limits will govern your scheduling logic.

---

## 4. **Implement the Concurrency Manager Hook**

Create a dedicated hook or module (e.g., `useRoundSummaryQueueProcessor.ts`) that:

1. **Imports** the store actions (`useStore`) to read `roundSummaryQueue`, `chapters`, `rounds`, and to call `updateSummaryStatus`, `updateRound`, etc.  
2. **Maintains** a local state or ref for active tasks (so you don't double-process the same round).  
3. **Watches** the queue for changes (e.g., via a `useEffect` that depends on `roundSummaryQueue`).

### 4.1. Group Rounds by Chapter

- [ ] Write a function `groupRoundsByChapter(queue, rounds, chapters)` that returns a `Map<chapterIndex, queueItems[]>`.  
- [ ] Only include queue items with `status: 'pending'` (or whichever states you consider for new tasks).

### 4.2. Check Active Chapters

- [ ] Track which chapters are already "in progress" by scanning the `activeTasks` array and mapping them to chapter indices.  
- [ ] If `activeChaptersCount >= maxConcurrentChapters`, skip spawning tasks for any new chapter.

### 4.3. Spawn Tasks Per Chapter

- [ ] For each chapter in the grouped queue, check how many rounds are already in progress for that chapter.  
- [ ] If it's below `maxConcurrentRounds`, spawn new tasks until you reach that limit or exhaust the pending items for that chapter.  

### 4.4. Mark Items as `inProgress`

- [ ] When you spawn a task, call `updateSummaryStatus(roundIndex, 'round', 'inProgress')`.  
- [ ] Add the new task to your `activeTasks` array (with an `AbortController` for potential cancellation).

**Goal**: The concurrency manager orchestrates picking up new tasks as soon as capacity is available.

---

## 5. **Implement the Actual "Task" (LLM Request)**

When you spawn a task (e.g., `spawnTask(roundIndex)`):

1. **Fetch Round Data**  
   - [ ] Get the `Round` from the store by `roundIndex`.  
   - [ ] Construct your prompt or pass relevant context to your API endpoint.

2. **Initiate Streaming**  
   - [ ] Use `fetch` or the Vercel AI SDK streaming approach.  
   - [ ] Create an `AbortController` so you can cancel if needed.

3. **Handle Streaming**  
   - [ ] Accumulate text as you read chunks.  
   - [ ] If an error occurs, throw so you can catch it and handle retries.

4. **On Success**  
   - [ ] Call `updateRound(roundIndex, { summary: accumulatedText, summaryStatus: 'completed' })`.  
   - [ ] Also call `updateSummaryStatus(roundIndex, 'round', 'completed')`.  
   - [ ] Optionally `dequeueRoundSummary(roundIndex)` if you want to remove it from the queue.

5. **On Failure**  
   - [ ] Check if `attempts < maxRetries`. If yes, re-queue by setting `status` back to `pending` (or a similar approach). If no, mark `failed`.

6. **Cleanup**  
   - [ ] Remove the task from `activeTasks`.  
   - [ ] Re-run your queue-processor function to see if there's capacity for more tasks.

**Goal**: This is the core logic that actually calls your LLM endpoint, handles partial streaming, and updates the store accordingly.

---

## 6. **Add Reroll Logic**

If a user wants to "reroll" or re-summarize a round:

1. **Store Action**: You likely have something like `rerollRoundSummary(roundIndex)`.  
   - [ ] Internally, this sets the round's `summaryStatus` to `pending`.  
   - [ ] It might also place the queue item at the front of `roundSummaryQueue`, or just update the existing item's status.  
2. **Queue Processor**: Sees the updated status (`pending`) and picks it up again if concurrency allows.

**Goal**: Ensure your concurrency manager sees the new `pending` item and processes it.

---

## 7. **Implement Cancelation for a Chapter**

If a user wants to cancel a chapter while it's in progress:

1. **Identify All Rounds** in that chapter (based on `[start, end]`).  
2. **Abort Active Tasks**  
   - [ ] For each active task whose `roundIndex` falls in `[start, end]`, call `abortController.abort()`.  
   - [ ] Remove those tasks from the `activeTasks` array.  
3. **Update Status**  
   - [ ] Set those rounds to `'failed'` or `'canceled'`.  
   - [ ] Optionally remove them from `roundSummaryQueue` with `dequeueRoundSummary`.

**Goal**: The concurrency manager will skip them going forward, and no partial text is saved.

---

## 8. **Integrate Hook into the UI**

1. **Create a SummariesManager Component**  
   - [ ] Example:
     ```tsx
     export function SummariesManager() {
       const { activeTasks, cancelChapter } = useRoundSummaryQueueProcessor(
         3, // maxConcurrentChapters
         3, // maxConcurrentRounds
         3  // maxRetries
       );
       
       // You can display progress or statuses here
       return (
         <div>
           <h1>Summaries In Progress</h1>
           <ul>
             {activeTasks.map((task) => (
               <li key={task.roundIndex}>Round {task.roundIndex} in progress</li>
             ))}
           </ul>
           
           <button onClick={() => cancelChapter(0)}>
             Cancel Chapter 0
           </button>
         </div>
       );
     }
     ```
2. **Watch Round Summaries**  
   - [ ] In the UI that displays each round (like your table rows), you can show the current `summary` and `summaryStatus`.  
   - [ ] As soon as the concurrency manager updates the store, the UI re-renders.

3. **Test Edge Cases**  
   - [ ] **Large queue** (e.g., 50 rounds, 19 chapters).  
   - [ ] **Cancels** mid-way.  
   - [ ] **Rerolls** on completed or failed rounds.  
   - [ ] **Max concurrency** settings (set them to 1 for easy debugging).

---

## 9. **Add Logging & Debugging**

- [ ] **Logging**: Put `console.log` statements (or a more sophisticated logger) in your concurrency manager. For instance, log when a round transitions from `pending` → `inProgress` or when a chapter is canceled.  
- [ ] **Error Handling**: Make sure your catch blocks provide enough info to debug.

---

## 10. **Optional Enhancements**

1. **Partial Streaming UI**  
   - [ ] If you want real-time updates in each round's `summary` as the stream comes in, call `updateRound(roundIndex, { summary: partial })` inside the streaming loop.  
   - [ ] If you do this, be aware that if the request fails, you might want to revert to an empty summary (or handle partial text differently).

2. **Prioritization**  
   - [ ] If you want some chapters to have higher priority, you could reorder your queue items.  
   - [ ] If you want "round-robin" scheduling across chapters, you could adapt the grouping logic to pick 1 round from each chapter in turn.

3. **Unified Hook for Chapters**  
   - [ ] If you eventually want to queue "chapter summaries" as well, you could unify the logic to handle both `type: 'round'` and `type: 'chapter'` in the same concurrency manager.  
   - [ ] Just keep separate concurrency rules if you want (e.g., only 1 chapter-level summary at a time).

---

## Final Summary of Steps

1. **Ensure your Zustand store** is fully set up to handle round statuses (`pending`, `inProgress`, `completed`, `failed`), queue arrays, and actions like `updateRound`, `updateSummaryStatus`, `dequeueRoundSummary`.  
2. **Create a helper** to find the chapter index for a given round (`findChapterIndexForRound`).  
3. **Implement** a concurrency manager hook (`useRoundSummaryQueueProcessor`) that:  
   1. Groups `roundSummaryQueue` items by chapter.  
   2. Respects `maxConcurrentChapters` and `maxConcurrentRounds`.  
   3. Spawns tasks for each round, marking them `inProgress`.  
   4. Streams from your LLM, updates the store on success/failure.  
   5. Retries up to `maxRetries`.  
   6. Allows cancelation of an entire chapter.  
4. **Integrate** the hook in a manager component (`SummariesManager`), and ensure your UI can reflect round statuses.  
5. **Test** with various scenarios: large queues, parallel chapters, cancelation, retries, partial streaming, etc.

Following these steps in order should give you a robust system that processes multiple chapters in parallel (up to your configured concurrency), with multiple rounds per chapter in parallel, plus the ability to reroll or cancel as needed.