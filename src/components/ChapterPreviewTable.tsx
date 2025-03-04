import { FC } from 'react'
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Chapter, Round } from "@/store"
import { cn } from "@/lib/utils"
import { StatusBadge } from './StatusBadge'

interface ChapterPreviewTableProps {
  chapter: Chapter
  rounds: Round[]
  introRounds?: number
  outroRounds?: number
}

export const ChapterPreviewTable: FC<ChapterPreviewTableProps> = ({
  chapter,
  rounds,
  introRounds = 0,
  outroRounds = 0,
}) => {
  // Get rounds for a specific chapter
  const getChapterRounds = () => {
    const [start, end] = chapter.roundsRange
    return rounds.filter(round => 
      round.roundIndex >= start && 
      round.roundIndex <= end
    )
  }

  // Check if a round is omitted in a chapter
  const isRoundOmitted = (roundIndex: number) => {
    return chapter.omit.includes(roundIndex)
  }

  // Calculate the padding length for the index based on total rounds
  const getPaddedIndex = (index: number) => {
    const magnitude = rounds.length.toString().length + 1
    return index.toString().padStart(magnitude, '0')
  }

  // Get the rounds to display based on intro and outro settings
  const getDisplayRounds = () => {
    const chapterRounds = getChapterRounds()
    
    // If both values are 0 or undefined, return empty array
    if (!introRounds && !outroRounds) return []
    
    // If only introRounds is specified
    if (introRounds && !outroRounds) {
      return { 
        introSlice: chapterRounds.slice(0, introRounds), 
        totalRounds: chapterRounds.length 
      }
    }
    
    // If only outroRounds is specified
    if (!introRounds && outroRounds) {
      return { 
        outroSlice: chapterRounds.slice(-outroRounds),
        totalRounds: chapterRounds.length 
      }
    }
    
    // If both are specified
    const introSlice = chapterRounds.slice(0, introRounds)
    const outroSlice = chapterRounds.slice(-outroRounds)
    
    return { introSlice, outroSlice, totalRounds: chapterRounds.length }
  }

  const displayData = getDisplayRounds()
  
  // If we don't have data, return empty table
  if (Array.isArray(displayData) && displayData.length === 0) {
    return <Table><TableBody /></Table>
  }
  
  // Handle the case when we have structured data (intro/outro)
  if (!Array.isArray(displayData)) {
    const { totalRounds } = displayData
    const introSlice = displayData.introSlice || []
    const outroSlice = displayData.outroSlice || []
    const hiddenCount = totalRounds - introSlice.length - outroSlice.length
    const ellipsisMessage = hiddenCount > 0 
      ? `... ${hiddenCount} more rounds ...` 
      : "..."
    
    return (
      <Table>
        <TableBody>
          {/* Intro rounds */}
          {introSlice.length > 0 && introSlice.map((round) => {
            const isOmitted = isRoundOmitted(round.roundIndex)
            return (
              <TableRow 
                key={`intro-${round.roundIndex}`} 
                className={cn(
                  "py-1",
                  isOmitted && "opacity-50 bg-muted/50"
                )}
              >
                <TableCell className="flex items-center space-x-2 py-1 px-2">
                  <StatusBadge status={round.summaryStatus} />
                  <span className="font-mono text-xs font-extralight text-muted-foreground">
                    {getPaddedIndex(round.roundIndex)}
                  </span>
                </TableCell>
                <TableCell className="max-w-md truncate text-left py-1 px-2 text-sm">
                  {round.summary || "No summary available"}
                </TableCell>
              </TableRow>
            )
          })}
          
          {/* Always show ellipsis if either intro or outro exists */}
          {(introSlice.length > 0 || outroSlice.length > 0) && (
            <TableRow className="py-1">
              <TableCell colSpan={2} className="text-center py-2 text-sm text-muted-foreground italic">
                {ellipsisMessage}
              </TableCell>
            </TableRow>
          )}
          
          {/* Outro rounds */}
          {outroSlice.length > 0 && outroSlice.map((round) => {
            const isOmitted = isRoundOmitted(round.roundIndex)
            return (
              <TableRow 
                key={`outro-${round.roundIndex}`} 
                className={cn(
                  "py-1",
                  isOmitted && "opacity-50 bg-muted/50"
                )}
              >
                <TableCell className="flex items-center space-x-2 py-1 px-2">
                  <StatusBadge status={round.summaryStatus} />
                  <span className="font-mono text-xs font-extralight text-muted-foreground">
                    {getPaddedIndex(round.roundIndex)}
                  </span>
                </TableCell>
                <TableCell className="max-w-md truncate text-left py-1 px-2 text-sm">
                  {round.summary || "No summary available"}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }
  
  // This code should no longer be reachable since we've restructured the return types
  // But keeping it for safety
  return <Table><TableBody /></Table>
} 