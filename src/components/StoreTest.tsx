import React, { useState } from 'react';
import { useStore, Round, Chapter } from '@/store';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Code } from "@/components/ui/code";

const StoreTest: React.FC = () => {
  const [fileContent, setFileContent] = useState<string>('');
  const store = useStore();
  
  // Handler for "raw" file content upload
  const handleSetRawContent = () => {
    store.setRawFileContent(fileContent);
    
    // For demo purposes, also set a processed version
    const processed = fileContent
      .replace(/^You said:/i, '<user>')
      .replace(/chatGPT said:/i, '</user>\n<dungeon_master>');
    
    store.setProcessedContent(processed);
  };
  
  // Generate sample rounds for testing
  const generateSampleRounds = () => {
    const rounds: Round[] = [
      { roundIndex: 0, startLine: 1, endLine: 10, lineCount: 10 },
      { roundIndex: 1, startLine: 11, endLine: 25, lineCount: 15 },
      { roundIndex: 2, startLine: 26, endLine: 40, lineCount: 15 },
      { roundIndex: 3, startLine: 41, endLine: 60, lineCount: 20 },
      { roundIndex: 4, startLine: 61, endLine: 80, lineCount: 20 }
    ];
    
    store.setRounds(rounds);
  };
  
  // Generate sample chapters for testing
  const generateSampleChapters = () => {
    const chapters: Chapter[] = [
      { roundsRange: [0, 2], omit: [] },
      { roundsRange: [3, 4], omit: [] }
    ];
    
    store.setChapters(chapters);
  };
  
  // Test omitting a round
  const testOmitRound = () => {
    store.omitRound(0, 1, true); // Omit round 1 in chapter 0
  };
  
  // Test enqueueing a round for summary
  const testEnqueueRound = () => {
    store.enqueueRoundSummary(0); // Enqueue round 0
    store.enqueueRoundSummary(1); // Enqueue round 1
  };
  
  // Test rerolling a round summary
  const testRerollRound = () => {
    store.rerollRoundSummary(1); // Reroll round 1 (moves to front of queue)
  };
  
  // Reset the store
  const resetStore = () => {
    store.resetStore();
  };
  
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Zustand Store Test</CardTitle>
          <CardDescription>
            Test the functionality of the Zustand store for Story Sync
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">File Content Test</h3>
            <Textarea
              placeholder="Enter some content to test file upload..."
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              className="h-32"
            />
            <Button 
              onClick={handleSetRawContent}
              className="mt-2"
            >
              Set Raw Content
            </Button>
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={generateSampleRounds}>
              Generate Sample Rounds
            </Button>
            <Button onClick={generateSampleChapters}>
              Generate Sample Chapters
            </Button>
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={testOmitRound}>
              Test Omit Round
            </Button>
            <Button onClick={testEnqueueRound}>
              Test Enqueue Round
            </Button>
            <Button onClick={testRerollRound}>
              Test Reroll Round
            </Button>
          </div>
          
          <Button 
            onClick={resetStore}
            variant="destructive"
          >
            Reset Store
          </Button>
          
          <div>
            <h3 className="text-lg font-medium">Current Store State</h3>
            <Code className="w-full mt-2 p-4 max-h-64 overflow-auto">
              {JSON.stringify(
                {
                  rawFileContent: store.rawFileContent,
                  processedContent: store.processedContent,
                  rounds: store.rounds,
                  chapters: store.chapters,
                  roundSummaryQueue: store.roundSummaryQueue,
                  chapterSummaryQueue: store.chapterSummaryQueue
                }, 
                null, 
                2
              )}
            </Code>
          </div>
        </CardContent>
        
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            This component is for testing purposes only and would be removed from the production app.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default StoreTest; 