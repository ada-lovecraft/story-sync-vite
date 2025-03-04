### 1. Project Instantiation & Setup

#### - [x] Create Project Repository & Initial Setup
  - [x] Initialize a new Vite typescript project using React (v19)  
  - [x] Install the latest (5.x) `zustand` package
  - [x] Install Tailwind CSS (v4) 
    - [x] `npm install tailwindcss @tailwindcss/vite`
    - [x] remove all contents of `index.css` and replace with `@import "tailwindcss";`
  - [x] Add custom path aliases
    - [x] install node types
      - [x] `npm install -D @types/node`
    - [x] in `tsconfig.json` add:

      ```json
      "compilerOptions": {
        "baseUrl": ".",
        "paths": {
          "@/*": ["./src/*"]
        }
      }
      ```
    - [x] in `tsconfig.app.json` add the following to the `compilerOptions` object:

      ```json:
        "baseUrl": ".",
        "paths": {
          "@/*": [
            "./src/*"
          ]
        }
      ```
    - [x] Update `vite.config.ts` to read as follows:

      ```typescript
      import path from "path"
      import tailwindcss from "@tailwindcss/vite"
      import react from "@vitejs/plugin-react"
      import { defineConfig } from "vite"

      // https://vite.dev/config/
      export default defineConfig({
        plugins: [react(), tailwindcss()],
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "./src"),
          },
        },
      })
      ```

      
  - [x] initialize shadcn-ui components
    ```shell
    npx shadcn@latest init -y -d
    ```
  - [x] add all available shadcn component
    ```shell
    npx shadcn@latest add -a -y -o
    ```
  - [x] Set up the project folder structure (components, hooks, store, utils, etc.)
  - [x] Enhance utility components
    - [x] implemented dev-story: `docs/dev-story-code-and-stateview-components.md`
    - [x] Add syntax highlighting to Code component with prism-react-renderer
    - [x] Create StateView component for displaying structured data with string truncation

---

### 2. UI Layout & Application Skeleton

- **[x] Build Global Layout**  
  - [x] Create a responsive sidebar (for navigation or additional tools)  
  - [x] Build a top navbar  
  - [x] Define main content areas (upload area, fine-tuning view, summarization queue view)  
  - [x] Ensure desktop-first layout with potential for future responsive enhancements

---

### 3. State Management Setup

- **[x] Create Zustand Store**  
  - [x] Complete the zustand store dev-story located at `docs/dev-story-create-zustand-store.md`

---

### 4. File Upload & Content Processing

- **[x] Implement File Upload Component**  
  - [x] Develop drag-and-drop file drop zone  
  - [x] Add fallback file selector button  
  - [x] Use FileReader API to read UTF-8 files (1–3MB)

- **[x] Develop Content Transformation Functions**  
  - [x] Replace the first occurrence of `/^You said:/` with `<user>` (or prepend if missing)  
  - [x] Replace subsequent occurrences of `/^You said:/` with `</dungeon_master>\n<user>`  
  - [x] Replace all instances of `chatGPT said:` with `</user>\n<dungeon_master>`  
  - [x] Ensure file starts with `<user>` and ends with `</dungeon_master>`  
  - [x] Remove lines matching `/\d+\/\d+/` (with no other content)  
  - [x] Replace multiple newlines (`\n\n\n*`) with a single double newline (`\n\n`)  
  - [x] Verify all pattern matching is strictly case-insensitive and enforced

- **[x] Integrate File Upload & Processing**  
  - [x] Wire the file upload component to invoke transformation functions  
  - [x] Store the processed content in the Zustand store

---

### 5. Parsing and Rounds Generation

- **[x] Parse Processed Content into Rounds**  
  - [x] Identify rounds as pairs of `<user>` and `<dungeon_master>` nodes  
  - [x] For each round, extract and record:  
    - Round index  
    - Start line number  
    - End line number  
    - Total line count  
  - [x] Store round metadata (using file line number ranges) in the Zustand store

---

### 6. Chapter Chunking Module

- **[x] Implement Chapter Formation Logic**  
  - [x] Group rounds sequentially until the cumulative line count reaches or exceeds 2500  
  - [x] Ensure rounds remain in original order  
  - [x] Validate that the chapter has the minimum rounds required to meet the threshold  
  - [x] Store chapter metadata (with round ranges) in the Zustand store

---

### 7. Chapter Fine-Tuning UI & Actions

- **[x] Build Chapter Fine-Tuning View**  
  - [x] Create a table view for each chapter listing its rounds  
  - [x] Display round metadata: index, summary status icon, narrative summary (if available)  
  - [x] Add controls for each round:
    - **Slide Up:** Move chapter rounds above (including the invoked round) to the previous chapter (disabled on first chapter)  
    - **Slide Down:** Move chapter rounds below (including the invoked round) to the next chapter (disabled on last chapter)  
    - **Split:** Create a new chapter from the invoked round and all remaining rounds in chapter   
    - **Omit:** Mark the round as omitted (gray out row, flag in configuration, exclude from summarization)  
    - **Reroll:** Adjust the summarization queue (move to top if already queued or insert at the top)
  
- **[x] Integrate Fine-Tuning Controls with Store**  
  - [x] Ensure each control action updates the corresponding state in the Zustand store  
  - [x] Confirm all actions are reversible without confirmation dialogs
  - [x] Fix implementation of slide up/down and split functions to properly update state

---

### 8. Round Summarization Queue Simulation

- **[ ] Develop Round Summarization Queue UI**  
  - [ ] Create a right-hand column view displaying the round queue  
  - [ ] Show progress indicators and summary status icons (including "failed" statuses)

- **[ ] Simulate Summarization Calls**  
  - [ ] Implement simulated GPT-4o summarization for rounds  
  - [ ] Set summary status to "failed" on simulated failure  
  - [ ] Allow user-triggered "Reroll" to reattempt summarization

- **[ ] Integrate Queue Management**  
  - [ ] Ensure "Reroll" updates the queue by moving or inserting the round at the top

---

### 9. Chapter Summarization Module

- **[ ] Build Chapter Summarization View**  
  - [ ] Present each chapter with its generated narrative outline  
  - [ ] Exclude rounds marked as "omitted" from the summary

- **[ ] Simulate Chapter Summarization Calls**  
  - [ ] Process all eligible rounds in a chapter to generate a detailed outline  
  - [ ] Provide a final "formatting" button to concatenate outlines with cohesive numbering/formatting

- **[ ] Final Output & Download**  
  - [ ] Display the final concatenated outline in the UI  
  - [ ] Implement a download button for the final chapter summary output (do not persist in local storage)

---

### 10. Configuration Import/Export

- **[ ] Implement Chapter Configuration Export**  
  - [ ] Generate a JSON file using the schema:
    ```json
    {
      "chapters": [
        {
          "rounds": [start, end],
          "omit": [roundIndex, roundIndex, ...]
        },
        ...
      ]
    }
    ```
  - [ ] Provide a "Download Chapter Configuration" button in the fine-tuning view

- **[ ] Implement Chapter Configuration Import**  
  - [ ] Create a drag-and-drop drop zone for JSON configuration files  
  - [ ] Parse and override (or merge, if required) the current fine-tuning queue with imported configuration

---

### 11. Integration Testing & Bug Fixing

- **[ ] End-to-End Testing**  
  - [ ] Verify the file upload and processing flow (from raw file to transformed content)  
  - [ ] Test round parsing and chapter chunking accuracy  
  - [ ] Validate UI actions (Slide Up/Down, Split, Omit, Reroll) and their state updates  
  - [ ] Simulate round and chapter summarization flows, ensuring status icons and requeue behaviors work as intended  
  - [ ] Test configuration import/export functionality

- **[ ] Bug Fixing & Refinement**  
  - [ ] Address UI glitches and state synchronization issues  
  - [ ] Ensure all edge cases (as per MVP assumptions) are handled correctly

---

### 12. Final Polish & Documentation

- **[ ] UI Polish and Final Touches**  
  - [ ] Refine component styling using shadcn-ui and Tailwind  
  - [ ] Ensure overall consistency and usability

- **[ ] Documentation**  
  - [ ] Update README with setup instructions and project overview  
  - [ ] Document the Zustand store structure and key transformation/processing functions  
  - [ ] Prepare a developer guide for future scalability and feature enhancements

---

This checklist represents the full development timeline and dependencies for the Story Sync MVP. Each ticket is scoped as a single point task to ensure smooth progress through the project lifecycle. Let me know if you need further details or adjustments!