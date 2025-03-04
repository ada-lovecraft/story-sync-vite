import React, { useState } from 'react';
import { useStore } from '@/store';
import { StateView } from './StateView';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

interface StateViewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StateViewDrawer: React.FC<StateViewDrawerProps> = ({
  open,
  onOpenChange,
}) => {
  const store = useStore();
  const [truncateStrings, setTruncateStrings] = useState(true);
  const [truncateLength, setTruncateLength] = useState(100);

  // Prepare store data for StateView
  const getStoreData = () => {
    return {
      rawFileContent: store.rawFileContent,
      processedContent: store.processedContent,
      rounds: store.rounds,
      chapters: store.chapters,
      roundSummaryQueue: store.roundSummaryQueue,
      chapterSummaryQueue: store.chapterSummaryQueue,
      // Add any other state properties you want to display
    };
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[85vh] max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Store State</DrawerTitle>
          <DrawerDescription>
            View the current state of the application store
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="p-4 pt-0 h-full overflow-auto">
          <StateView
            data={getStoreData()}
            truncateStrings={truncateStrings}
            truncateLength={truncateLength}
            onTruncateStringsChange={setTruncateStrings}
            onTruncateLengthChange={setTruncateLength}
            maxHeight="calc(80vh - 200px)"
            className="mb-4"
          />
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}; 