import { FC } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { DownloadIcon, UpdateIcon } from "@radix-ui/react-icons"
import { useStore, Round, Chapter, SummaryQueueItem } from "@/store"
import { toast } from "sonner"
import { StatusBadge } from './StatusBadge'

export const SummarizationQueueView: FC = () => {
  const { 
    rounds, 
    chapters, 
    roundSummaryQueue, 
    chapterSummaryQueue,
    rerollRoundSummary,
    updateSummaryStatus,
    enqueueChapterSummary
  } = useStore()

  // Simulate summarization process
  const simulateSummarization = (id: number, type: 'round' | 'chapter') => {
    // First mark as in progress
    updateSummaryStatus(id, type, 'inProgress')
    
    // Set a random timeout between 1-3 seconds to simulate API call
    const timeout = Math.random() * 2000 + 1000
    
    setTimeout(() => {
      // 80% chance of success, 20% chance of failure
      const success = Math.random() > 0.2
      
      if (success) {
        updateSummaryStatus(id, type, 'completed')
        toast.success(`${type === 'round' ? 'Round' : 'Chapter'} ${id} summarization completed`)
      } else {
        updateSummaryStatus(id, type, 'failed')
        toast.error(`${type === 'round' ? 'Round' : 'Chapter'} ${id} summarization failed`)
      }
    }, timeout)
  }

  // Export final summary
  const exportFinalSummary = () => {
    // Generate a combined summary from all chapters
    const finalSummary = chapters
      .filter(chapter => chapter.summary)
      .map((chapter, index) => `Chapter ${index + 1}: ${chapter.summary}`)
      .join('\n\n')
    
    // Create and download text file
    const blob = new Blob([finalSummary], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = 'story-summary.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success("Final summary exported successfully")
  }

  // Calculate progress percentage
  const getProgressPercentage = (queue: SummaryQueueItem[]) => {
    if (queue.length === 0) return 100
    const completed = queue.filter(item => item.status === 'completed').length
    return Math.round((completed / queue.length) * 100)
  }

  // Check if there's an active item in the queue (in progress)
  const hasActiveItem = (queue: SummaryQueueItem[]) => {
    return queue.some(item => item.status === 'inProgress')
  }

  // Handle prioritize/reroll for round
  const handleRerollRound = (roundIndex: number) => {
    rerollRoundSummary(roundIndex)
    toast.success(`Round ${roundIndex} prioritized in queue`)
  }

  // Find a round by index
  const findRound = (roundIndex: number): Round | undefined => {
    return rounds.find(r => r.roundIndex === roundIndex)
  }

  // Get the pending items count
  const getPendingCount = (queue: SummaryQueueItem[]) => {
    return queue.filter(item => item.status === 'pending' || item.status === 'inProgress').length
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Story Summarization</CardTitle>
          <CardDescription>
            Generate and manage summaries for your story chapters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="rounds" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="rounds">Round Queue</TabsTrigger>
              <TabsTrigger value="chapters">Chapter Summaries</TabsTrigger>
            </TabsList>
            
            <TabsContent value="rounds" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Round Queue</h3>
                  <Badge variant="outline">{getPendingCount(roundSummaryQueue)} Pending</Badge>
                </div>
                
                <Progress value={getProgressPercentage(roundSummaryQueue)} className="h-2 w-full" />
                
                {roundSummaryQueue.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    No rounds in queue. Use the "Reroll" button in Chapter Fine-Tuning to add rounds.
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] rounded-md border">
                    <div className="p-4 space-y-4">
                      {roundSummaryQueue.map((item) => {
                        const round = findRound(item.id)
                        if (!round) return null
                        
                        return (
                          <div key={item.id} className="flex items-center justify-between pb-4">
                            <div>
                              <div className="font-medium">Round {item.id}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.status === 'inProgress' 
                                  ? "Summarizing..." 
                                  : item.status === 'completed'
                                    ? "Completed"
                                    : item.status === 'failed'
                                      ? "Failed - click to retry"
                                      : "In queue"}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <StatusBadge status={item.status} />
                              
                              {item.status === 'pending' && !hasActiveItem(roundSummaryQueue) && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => simulateSummarization(item.id, 'round')}
                                >
                                  Process
                                </Button>
                              )}
                              
                              {(item.status === 'pending' && item.id !== roundSummaryQueue[0].id) && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleRerollRound(item.id)}
                                >
                                  Prioritize
                                </Button>
                              )}
                              
                              {item.status === 'failed' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleRerollRound(item.id)}
                                >
                                  <UpdateIcon className="h-4 w-4 mr-1" />
                                  Retry
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="chapters" className="mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Chapter Summaries</h3>
                
                {chapters.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    No chapters available. Upload a file first to generate chapters.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chapters.map((chapter, index) => {
                      // Count completed rounds for this chapter
                      const [startRound, endRound] = chapter.roundsRange
                      const totalRounds = endRound - startRound + 1
                      const completedRounds = rounds
                        .filter(r => 
                          r.roundIndex >= startRound && 
                          r.roundIndex <= endRound &&
                          r.summaryStatus === 'completed' &&
                          !chapter.omit.includes(r.roundIndex)
                        ).length
                      
                      // Get chapter from queue if exists
                      const queueItem = chapterSummaryQueue.find(
                        item => item.id === index && item.type === 'chapter'
                      )
                      
                      return (
                        <div key={index} className="rounded-lg border p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Chapter {index + 1}</h4>
                            {queueItem ? 
                              <StatusBadge status={queueItem.status} /> : 
                              <Badge variant="outline">Not Processed</Badge>
                            }
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-4">
                            {completedRounds} of {totalRounds - chapter.omit.length} rounds summarized
                            {chapter.omit.length > 0 && ` (${chapter.omit.length} omitted)`}.
                          </p>
                          
                          {chapter.summary ? (
                            <>
                              <Separator className="my-4" />
                              <div className="space-y-2">
                                <h5 className="font-medium">Chapter Outline</h5>
                                <p className="text-sm">
                                  {chapter.summary}
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className="flex justify-end">
                              {!queueItem && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => enqueueChapterSummary(index)}
                                >
                                  Queue for Summarization
                                </Button>
                              )}
                              {queueItem && queueItem.status === 'pending' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => simulateSummarization(index, 'chapter')}
                                >
                                  Generate Summary
                                </Button>
                              )}
                              {queueItem && queueItem.status === 'failed' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => simulateSummarization(index, 'chapter')}
                                >
                                  <UpdateIcon className="h-4 w-4 mr-1" />
                                  Retry
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button 
          className="gap-2"
          onClick={exportFinalSummary}
          disabled={!chapters.some(chapter => chapter.summary)}
        >
          <DownloadIcon className="h-4 w-4" />
          Export Final Summary
        </Button>
      </div>
    </div>
  )
} 