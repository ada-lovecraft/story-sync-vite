Below is a detailed dev story for creating the Zustand store as part of the state management setup:

---

### Dev Story: Create Zustand Store

**Objective:**  
As a developer, I want to set up a centralized Zustand store to manage all application state so that file uploads, processed content, rounds metadata, chapters, and summarization queues can be maintained and updated consistently throughout the application.

**Acceptance Criteria:**

- A new Zustand store is created and initialized.
- The store contains separate slices for:
  - **File Upload & Raw Content:** Holds raw file data and processed text.
  - **Rounds Metadata:** Contains an array of round objects with properties like round index, start line, end line, and line count.
  - **Chapters:** Manages chapter information, including the round range (start and end) and any omitted round indices.
  - **Summarization Queues:** Includes separate queues for round summarization and chapter summarization, with status indicators.
- Actions are defined to update and retrieve state for each slice.
- The store is integrated into the application, and initial tests (or manual testing via a simple demo component) confirm that updates propagate as expected.

**Checklist:**

- **[ ] Initialize the Zustand Store File**
  - Create a new file (e.g., `src/store/useStore.js` or `src/store/index.ts`).
  - Import and set up the basic Zustand store instance.

- **[ ] Define File Upload & Raw Content Slice**
  - **State:**  
    - `rawFileContent` (string) – stores the original text from the uploaded file.
    - `processedContent` (string) – holds the cleaned and formatted text.
  - **Actions:**  
    - `setRawFileContent(content)` – updates the raw file content.
    - `setProcessedContent(content)` – updates the processed file content.

- **[ ] Define Rounds Metadata Slice**
  - **State:**  
    - `rounds` (array) – each round object should contain:
      - `roundIndex` (number)
      - `startLine` (number)
      - `endLine` (number)
      - `lineCount` (number)
  - **Actions:**  
    - `setRounds(roundsArray)` – initializes the rounds metadata.
    - `updateRound(roundIndex, updatedData)` – updates a specific round's metadata.

- **[ ] Define Chapters Slice**
  - **State:**  
    - `chapters` (array) – each chapter object includes:
      - `roundsRange` (array, e.g., `[start, end]`)
      - `omit` (array of round indices marked as omitted)
  - **Actions:**  
    - `setChapters(chaptersArray)` – initializes chapter data.
    - `updateChapter(chapterIndex, updatedData)` – updates a chapter’s data, such as adding an omitted flag.

- **[ ] Define Summarization Queues Slice**
  - **State:**  
    - `roundSummaryQueue` (array) – each entry includes round ID and summary status.
    - `chapterSummaryQueue` (array) – each entry includes chapter ID and summary status.
  - **Actions:**  
    - `enqueueRoundSummary(round)` – adds a round to the summarization queue.
    - `dequeueRoundSummary(round)` – removes a round (or reorders it, per reroll behavior).
    - `enqueueChapterSummary(chapter)` – adds a chapter to the chapter summarization queue.
    - `updateSummaryStatus(id, status)` – updates the status for a round/chapter summary.

- **[ ] Integrate and Test Store Functionality**
  - Create a simple demo component that reads from and writes to the store.
  - Manually verify that each action (e.g., updating file content, adding rounds, modifying chapters, enqueuing summary tasks) correctly updates the store.
  - Document any expected behavior for future development reference.

- **[ ] Code Review & Merge**
  - Review the Zustand store implementation with the team.
  - Ensure that code follows the project conventions and is well-commented.
  - Merge the store setup into the main branch.

---

This dev story and checklist ensure that the Zustand store is set up in a modular, testable, and scalable manner, laying a solid foundation for subsequent features in the Story Sync MVP.