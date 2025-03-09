import { FC, useEffect, useState } from 'react'
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerFooter,
    DrawerClose,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Round } from '@/store'
import { StatusBadge } from './StatusBadge'
import { RoundActionsToolbar } from './RoundActionsToolbar'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronLeft, ChevronRight, BookOpen, AlignJustify, FileText } from 'lucide-react'
import { extractBlocks } from '@/utils/content-transformation'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import { CopyableText } from './ui/copyable-text'

// Create a DrawerBody component similar to DrawerHeader and DrawerFooter
const DrawerBody: FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
    className, 
    ...props 
}) => {
    return (
        <div
            className={cn("flex-1 overflow-auto", className)}
            {...props}
        />
    )
}

interface RoundDetailsDrawerProps {
    round: Round | null
    open: boolean
    onClose: () => void
    onReroll?: (roundIndex: number) => void
    onSlideUp?: (chapterIndex: number, roundIndex: number) => void
    onSlideDown?: (chapterIndex: number, roundIndex: number) => void
    onSplit?: (chapterIndex: number, roundIndex: number) => void
    onOmit?: (chapterIndex: number, roundIndex: number, currentOmitted: boolean) => void
    chapterIndex?: number
    isFirstChapter?: boolean
    isLastChapter?: boolean
    isOmitted?: boolean
    rawContent?: string
    onPrevious?: () => void
    onNext?: () => void
}

export const RoundDetailsDrawer: FC<RoundDetailsDrawerProps> = ({
    round,
    open,
    onClose,
    onReroll,
    onSlideUp,
    onSlideDown,
    onSplit,
    onOmit,
    chapterIndex = 0,
    isFirstChapter = false,
    isLastChapter = false,
    isOmitted = false,
    rawContent,
    onPrevious,
    onNext
}) => {
    console.log('RoundDetailsDrawer', { round });
    const [userContent, setUserContent] = useState<string>('');
    const [dmContent, setDmContent] = useState<string>('');
    const { chapters } = useStore();

    // Find the actual chapter index for this round
    const findChapterForRound = (roundIndex: number) => {
        for (let i = 0; i < chapters.length; i++) {
            const [start, end] = chapters[i].roundsRange;
            if (roundIndex >= start && roundIndex <= end) {
                return {
                    index: i,
                    isFirst: i === 0,
                    isLast: i === chapters.length - 1,
                    isOmitted: chapters[i].omit.includes(roundIndex)
                };
            }
        }
        // Fallback to provided values if not found
        return {
            index: chapterIndex,
            isFirst: isFirstChapter,
            isLast: isLastChapter,
            isOmitted: isOmitted
        };
    };

    // Get chapter info for the current round
    const getChapterInfo = () => {
        if (!round) return { index: chapterIndex, isFirst: isFirstChapter, isLast: isLastChapter, isOmitted: isOmitted };
        return findChapterForRound(round.roundIndex);
    };

    // Check if the current round is the first round in the first chapter
    const isFirstRoundOfFirstChapter = () => {
        if (!round || !chapters.length) return false;

        // Get the current chapter info
        const { index: currentChapterIndex } = getChapterInfo();

        // If not the first chapter, it's not the first round of the first chapter
        if (currentChapterIndex !== 0) return false;

        // Get the first round index of the first chapter
        const [firstRoundIndex] = chapters[0].roundsRange;

        // Check if the current round is the first round
        return round.roundIndex === firstRoundIndex;
    };

    // Check if the current round is the last round in the last chapter
    const isLastRoundOfLastChapter = () => {
        if (!round || !chapters.length) return false;

        // Get the current chapter info
        const { index: currentChapterIndex } = getChapterInfo();

        // If not the last chapter, it's not the last round of the last chapter
        if (currentChapterIndex !== chapters.length - 1) return false;

        // Get the last round index of the last chapter
        const [, lastRoundIndex] = chapters[chapters.length - 1].roundsRange;

        // Check if the current round is the last round
        return round.roundIndex === lastRoundIndex;
    };

    // Check if we have all the required callbacks for the toolbar
    const showToolbar = onReroll && onSlideUp && onSlideDown && onSplit && onOmit;

    // Format the round index with padding to match the ChapterTable display
    const getPaddedRoundIndex = (index: number) => {
        // Use a fixed magnitude for padding
        const magnitude = 4;
        return index.toString().padStart(magnitude, '0');
    };

    // Extract user and dungeon master content when the round changes
    useEffect(() => {
        if (round) {
            // If round.userText and round.dmText are already populated, use them
            if (round.userText && round.dmText) {
                setUserContent(round.userText);
                setDmContent(round.dmText);
            }
            // Otherwise, try to extract from the raw content if available
            else if (round.rawContent) {
                const { userContent, dmContent } = extractBlocks(round.rawContent);
                setUserContent(userContent);
                setDmContent(dmContent);
            }
            // Otherwise, try to extract from the raw content if available
            else if (rawContent) {
                const lines = rawContent.split('\n')
                const roundLines = lines.slice(round.startLine, round.endLine)
                console.log('roundLines', { roundLines });
                setUserContent(userContent);
                setDmContent(dmContent);
            }
            // Reset if no content is available
            else {
                setUserContent('');
                setDmContent('');
            }
        }
    }, [round]);

    if (!round) return null

    // Get the current chapter information
    const { index: currentChapterIndex, isFirst, isLast, isOmitted: roundIsOmitted } = getChapterInfo();

    // Determine if previous/next buttons should be disabled
    const isPreviousDisabled = isFirstRoundOfFirstChapter() || !onPrevious;
    const isNextDisabled = isLastRoundOfLastChapter() || !onNext;

    return (
        <Drawer open={open} onOpenChange={onClose}>
            <DrawerContent className="h-[85vh] max-h-[85vh] flex flex-col">
                <DrawerHeader className="flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <DrawerTitle className="flex items-center gap-2">
                                <StatusBadge status={round.summaryStatus || 'pending'} />
                                Round <span className="font-mono text-sm font-extralight text-muted-foreground">{getPaddedRoundIndex(round.roundIndex)}</span>
                            </DrawerTitle>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline" className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                Chapter {currentChapterIndex + 1}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                                <AlignJustify className="h-3 w-3" />
                                {round.lineCount} lines
                            </Badge>
                        </div>
                    </div>
                </DrawerHeader>
                
                <DrawerBody className="p-4">
                    {/* Toolbar Section */}
                    {showToolbar && (
                        <div className="flex justify-end mb-4">
                            <RoundActionsToolbar
                                size="sm"
                                roundIndex={round.roundIndex}
                                chapterIndex={currentChapterIndex}
                                isFirstChapter={isFirst}
                                isLastChapter={isLast}
                                isOmitted={roundIsOmitted}
                                onSlideUp={onSlideUp}
                                onSlideDown={onSlideDown}
                                onSplit={onSplit}
                                onOmit={onOmit}
                                onReroll={onReroll}
                            />
                        </div>
                    )}
                    
                    {/* Grid Layout */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* Full-width Summary Section */}
                        {round.summary && (
                            <CopyableText 
                                text={round.summary}
                                label="Round Summary"
                                icon={<FileText className="h-4 w-4" />}
                                variant="muted"
                                copySuccessMessage="Round summary copied to clipboard!"
                            />
                        )}
                        
                        {/* Two-column Grid for Text Areas */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="user-text">User</Label>
                                <div className="border rounded-md h-[350px]">
                                    <ScrollArea className="h-full">
                                        <CopyableText
                                            text={userContent}
                                            variant="outline"
                                            textWrapper="pre"
                                            className="border-0 rounded-none font-mono text-sm"
                                            copySuccessMessage="User text copied to clipboard!"
                                        />
                                    </ScrollArea>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dm-text">Dungeon Master</Label>
                                <div className="border rounded-md h-[350px]">
                                    <ScrollArea className="h-full">
                                        <CopyableText
                                            text={dmContent}
                                            variant="outline"
                                            textWrapper="pre"
                                            className="border-0 rounded-none font-mono text-sm"
                                            copySuccessMessage="DM text copied to clipboard!"
                                        />
                                    </ScrollArea>
                                </div>
                            </div>
                        </div>
                    </div>
                </DrawerBody>
                <DrawerFooter className="pt-2 flex-shrink-0">
                    <div className="flex justify-between w-full">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onPrevious}
                            disabled={isPreviousDisabled}
                        >
                            <ChevronLeft className="mr-1 h-4 w-4" />
                            Previous
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="outline">Close</Button>
                        </DrawerClose>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onNext}
                            disabled={isNextDisabled}
                        >
                            Next
                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
} 