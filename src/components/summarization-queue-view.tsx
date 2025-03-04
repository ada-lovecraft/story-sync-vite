import { FC } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { DownloadIcon } from "@radix-ui/react-icons"

export const SummarizationQueueView: FC = () => {
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
                  <Badge variant="outline">3 Pending</Badge>
                </div>
                
                <Progress value={40} className="h-2 w-full" />
                
                <ScrollArea className="h-[300px] rounded-md border">
                  <div className="p-4 space-y-4">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="flex items-center justify-between pb-4">
                        <div>
                          <div className="font-medium">Round {item}</div>
                          <div className="text-sm text-muted-foreground">
                            {item === 1 ? "Summarizing..." : "In queue"}
                          </div>
                        </div>
                        <Badge variant={item === 1 ? "secondary" : "outline"}>
                          {item === 1 ? "Processing" : "Pending"}
                        </Badge>
                        {item !== 1 && <Button variant="ghost" size="sm">Prioritize</Button>}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
            
            <TabsContent value="chapters" className="mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Chapter Summaries</h3>
                
                <div className="space-y-4">
                  {[1, 2].map((chapter) => (
                    <div key={chapter} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Chapter {chapter}</h4>
                        <Badge>{chapter === 1 ? "Complete" : "In Progress"}</Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4">
                        {chapter === 1 
                          ? "All rounds summarized and chapter outline generated." 
                          : "2 of 5 rounds summarized."}
                      </p>
                      
                      {chapter === 1 && (
                        <>
                          <Separator className="my-4" />
                          <div className="space-y-2">
                            <h5 className="font-medium">Chapter Outline</h5>
                            <p className="text-sm">
                              This is a placeholder for the chapter summary that would be generated from all the round summaries.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button className="gap-2">
          <DownloadIcon className="h-4 w-4" />
          Export Final Summary
        </Button>
      </div>
    </div>
  )
} 