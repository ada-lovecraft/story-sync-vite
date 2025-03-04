import { FC } from 'react'
import { ChapterPreviewCard } from '@/components/ChapterPreviewCard'
import { Chapter, Round } from '@/store'

// Example data for demonstration
const exampleChapter: Chapter = {
  roundsRange: [0, 9], // 10 rounds in total
  omit: [2, 5], // Omit rounds 2 and 5
  summary: "Chapter preview example",
  summaryStatus: 'completed'
}

const exampleRounds: Round[] = Array.from({ length: 10 }, (_, i) => ({
  roundIndex: i,
  startLine: i * 10,
  endLine: (i * 10) + 9,
  lineCount: 10,
  summary: `Round ${i} summary text. This is an example summary that might be a bit longer.`,
  summaryStatus: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'pending' : 'inProgress'
}))

export const ChapterPreviewExample: FC = () => {
  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold">Chapter Preview Examples</h2>
      
      <div>
        <h3 className="text-lg font-medium mb-2">Default Preview (3 start, 2 end)</h3>
        <ChapterPreviewCard
          chapter={exampleChapter}
          chapterIndex={0}
          rounds={exampleRounds}
        />
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">More Start Rows (5 start, 2 end)</h3>
        <ChapterPreviewCard
          chapter={exampleChapter}
          chapterIndex={1}
          rounds={exampleRounds}
          startRowsCount={5}
          endRowsCount={2}
        />
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">More End Rows (2 start, 4 end)</h3>
        <ChapterPreviewCard
          chapter={exampleChapter}
          chapterIndex={2}
          rounds={exampleRounds}
          startRowsCount={2}
          endRowsCount={4}
        />
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">Show All (set counts higher than available rounds)</h3>
        <ChapterPreviewCard
          chapter={exampleChapter}
          chapterIndex={3}
          rounds={exampleRounds}
          startRowsCount={15}
          endRowsCount={0}
        />
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">No Ellipsis (either start or end is 0)</h3>
        <ChapterPreviewCard
          chapter={exampleChapter}
          chapterIndex={4}
          rounds={exampleRounds}
          startRowsCount={5}
          endRowsCount={0}
        />
      </div>
    </div>
  )
} 