import { FC, useState } from 'react'
import { Chapter, Round } from '@/store'
import { ChapterPreviewTable } from './ChapterPreviewTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

// Sample data for demo purposes
const sampleChapter: Chapter = {
  roundsRange: [0, 9], // 10 rounds in total (0-9)
  omit: [2, 5], // Omit a couple of rounds
  summary: 'Sample Chapter',
  summaryStatus: 'completed'
}

const generateSampleRounds = (): Round[] => {
  return Array.from({ length: 10 }, (_, i) => ({
    roundIndex: i,
    startLine: i * 10,
    endLine: (i * 10) + 9,
    lineCount: 10,
    summary: `This is round ${i} with some sample text to demonstrate truncation for longer content`,
    summaryStatus: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'inProgress' : 'pending',
  }))
}

export const ChapterPreviewDemo: FC = () => {
  const [introRounds, setIntroRounds] = useState<number>(2)
  const [outroRounds, setOutroRounds] = useState<number>(2)
  
  const rounds = generateSampleRounds()
  const totalRounds = sampleChapter.roundsRange[1] - sampleChapter.roundsRange[0] + 1
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Chapter Preview Demo</CardTitle>
        <CardDescription>
          Adjust the sliders to control how many rounds are shown from the beginning and end of the chapter
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="intro-rounds">Intro Rounds: {introRounds}</Label>
              <Badge variant="outline">{Math.min(introRounds, totalRounds)} shown</Badge>
            </div>
            <Slider 
              id="intro-rounds"
              min={0} 
              max={10} 
              step={1} 
              value={[introRounds]} 
              onValueChange={(value) => setIntroRounds(value[0])}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="outro-rounds">Outro Rounds: {outroRounds}</Label>
              <Badge variant="outline">{Math.min(outroRounds, totalRounds)} shown</Badge>
            </div>
            <Slider 
              id="outro-rounds"
              min={0} 
              max={10} 
              step={1} 
              value={[outroRounds]} 
              onValueChange={(value) => setOutroRounds(value[0])}
            />
          </div>
          
          <div className="pt-2 pb-2 text-sm text-muted-foreground">
            <p>
              Total rounds in chapter: <strong>{totalRounds}</strong> | 
              Visible: <strong>{Math.min(introRounds + outroRounds, totalRounds)}</strong> | 
              Hidden: <strong>{Math.max(0, totalRounds - introRounds - outroRounds)}</strong>
            </p>
          </div>
        </div>
        
        <div className="border rounded-md">
          <ChapterPreviewTable 
            chapter={sampleChapter} 
            rounds={rounds} 
            introRounds={introRounds} 
            outroRounds={outroRounds} 
          />
        </div>
        
        <div className="text-sm">
          <p className="text-muted-foreground">
            Note: Rounds #2 and #5 are marked as omitted (dimmed) in this example.
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 