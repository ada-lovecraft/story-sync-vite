# Dev Story: Creating Code and StateView Components

This document outlines the steps to reproduce the `Code` component with syntax highlighting and the reusable `StateView` component for displaying structured data with string truncation features.

## Code Component with Syntax Highlighting

### Prerequisites
- [ ] React project with TypeScript
- [ ] Tailwind CSS for styling
- [ ] shadcn/ui for base components

### Implementation Steps

#### 1. Install the Required Packages
- [ ] Install prism-react-renderer package
  ```bash
  npm install prism-react-renderer --legacy-peer-deps
  ```

#### 2. Create the Code Component
- [ ] Create or update the `src/components/ui/code.tsx` file with the following changes:

```tsx
import React from "react";
import { cn } from "@/lib/utils";
import { Highlight, themes, type Language } from "prism-react-renderer";

interface CodeProps extends Omit<React.HTMLAttributes<HTMLPreElement>, "children"> {
  language?: Language;
  code: string;
  showLineNumbers?: boolean;
}

const Code = React.forwardRef<HTMLPreElement, CodeProps>(
  ({ language = "tsx", code, showLineNumbers = false, className, ...props }, ref) => {
    return (
      <Highlight theme={themes.nightOwl} code={code} language={language}>
        {({ className: _className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            ref={ref}
            className={cn(
              "rounded-md border border-border bg-muted px-4 py-3 font-mono text-sm text-left overflow-auto",
              className
            )}
            style={style}
            {...props}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line, key: i })}>
                {showLineNumbers && (
                  <span className="inline-block w-6 mr-2 text-gray-500 text-right select-none">
                    {i + 1}
                  </span>
                )}
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token, key })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    );
  }
);

Code.displayName = "Code";

export { Code };
```

#### 3. Testing the Code Component
- [ ] Create a demo component that uses the Code component
- [ ] Test with different languages
- [ ] Test with and without line numbers
- [ ] Test with different color themes if desired

#### 4. Usage Example
```tsx
import { Code } from "@/components/ui/code";

// Example component using the Code component
const CodeExample = () => {
  const exampleCode = `
  function greet(name: string): string {
    return \`Hello, \${name}!\`;
  }
  `;

  return (
    <Code 
      language="typescript" 
      code={exampleCode} 
      showLineNumbers={true} 
    />
  );
};
```

## StateView Component for Data Visualization

### Implementation Steps

#### 1. Create the ObjectWithStringProps Interface
- [ ] Create a base interface for objects with string properties
```tsx
interface ObjectWithStringProps {
  [key: string]: any;
}
```

#### 2. Create the StateView Component
- [ ] Create `src/components/StateView.tsx` with the following content:

```tsx
import React from 'react';
import { Code } from "@/components/ui/code";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ObjectWithStringProps {
  [key: string]: any;
}

interface StateViewProps {
  data: ObjectWithStringProps;
  title?: string;
  description?: string;
  truncateStrings?: boolean;
  truncateLength?: number;
  onTruncateStringsChange?: (value: boolean) => void;
  onTruncateLengthChange?: (value: number) => void;
  className?: string;
  maxHeight?: string;
  showControls?: boolean;
}

export const StateView: React.FC<StateViewProps> = ({
  data,
  title = "State Viewer",
  description = "View the current state",
  truncateStrings = true,
  truncateLength = 100,
  onTruncateStringsChange,
  onTruncateLengthChange,
  className = "",
  maxHeight = "500px",
  showControls = true
}) => {
  // Function to truncate string values in an object recursively
  const truncateStringValues = (obj: ObjectWithStringProps): ObjectWithStringProps => {
    if (!obj) return obj;
    
    return Object.entries(obj).reduce((acc: ObjectWithStringProps, [key, value]) => {
      // Handle string values
      if (typeof value === 'string' && value.length > truncateLength) {
        acc[key] = `${value.substring(0, truncateLength)}... (${value.length})`;
      }
      // Handle arrays
      else if (Array.isArray(value)) {
        acc[key] = value.map(item => 
          typeof item === 'object' && item !== null 
            ? truncateStringValues(item) 
            : (typeof item === 'string' && item.length > truncateLength 
                ? `${item.substring(0, truncateLength)}... (${item.length})` 
                : item)
        );
      }
      // Handle nested objects
      else if (typeof value === 'object' && value !== null) {
        acc[key] = truncateStringValues(value);
      }
      // Keep other values as is
      else {
        acc[key] = value;
      }
      
      return acc;
    }, {});
  };

  // Prepare data for display, applying truncation if needed
  const getDataForDisplay = () => {
    return truncateStrings ? truncateStringValues(data) : data;
  };

  const handleTruncateLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0 && onTruncateLengthChange) {
      onTruncateLengthChange(value);
    }
  };

  const handleTruncateStringsChange = (value: boolean) => {
    if (onTruncateStringsChange) {
      onTruncateStringsChange(value);
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
        {showControls && (
          <div className="flex items-center gap-6 pt-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="truncate-strings"
                checked={truncateStrings}
                onCheckedChange={handleTruncateStringsChange}
              />
              <Label htmlFor="truncate-strings">Truncate long strings</Label>
            </div>
            
            {truncateStrings && (
              <div className="flex items-center space-x-2">
                <Label htmlFor="truncate-length">Max length:</Label>
                <Input
                  id="truncate-length"
                  type="number"
                  value={truncateLength}
                  onChange={handleTruncateLengthChange}
                  className="w-20"
                  min={10}
                />
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Code
          language="json"
          code={JSON.stringify(getDataForDisplay(), null, 2)}
          showLineNumbers={true}
          className={`w-full overflow-auto`}
          style={{ maxHeight }}
        />
      </CardContent>
    </Card>
  );
};
```

#### 3. Create a StateView Drawer Component
- [ ] Create `src/components/StateViewDrawer.tsx` for a drawer-based implementation:

```tsx
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
```

#### 4. Integrate StateView Drawer with Sidebar
- [ ] Update the sidebar component to include a button for opening the StateView drawer:

```tsx
import { FC, useState } from 'react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  // Other imports...
  DashboardIcon 
} from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { StateViewDrawer } from './StateViewDrawer'

export const Sidebar: FC = () => {
  const [stateViewOpen, setStateViewOpen] = useState(false);
  
  return (
    <div className="h-full border-r">
      <ScrollArea className="h-full">
        {/* Other sidebar content */}
        <div className="px-4 py-2">
          <h2 className="mb-2 px-2 text-lg font-semibold">Actions</h2>
          <div className="space-y-1">
            {/* Other buttons */}
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => setStateViewOpen(true)}
            >
              <DashboardIcon className="mr-2 h-4 w-4" />
              View Store State
            </Button>
          </div>
        </div>
      </ScrollArea>
      
      <StateViewDrawer open={stateViewOpen} onOpenChange={setStateViewOpen} />
    </div>
  )
}
```

#### 5. Example Usage in Components
- [ ] Embed StateView in another component:

```tsx
import React, { useState } from 'react';
import { StateView } from './StateView';

const DataDisplay = () => {
  const [truncateStrings, setTruncateStrings] = useState(true);
  const [truncateLength, setTruncateLength] = useState(100);
  
  const sampleData = {
    user: {
      name: "John Doe",
      description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
    },
    items: [
      { id: 1, content: "Short string" },
      { id: 2, content: "A longer string that will be truncated when the feature is enabled by the user in the StateView component." }
    ]
  };
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Data Display</h1>
      <StateView
        data={sampleData}
        title="Sample Data"
        description="Example of using the StateView component"
        truncateStrings={truncateStrings}
        truncateLength={truncateLength}
        onTruncateStringsChange={setTruncateStrings}
        onTruncateLengthChange={setTruncateLength}
      />
    </div>
  );
};
```

## Testing Checklist
- [ ] Verify Code component syntax highlighting works for different languages
- [ ] Confirm line numbers display properly when enabled
- [ ] Test StateView with various data structures (nested objects, arrays)
- [ ] Verify string truncation functions correctly
- [ ] Test controls for toggling truncation and changing max length
- [ ] Ensure the drawer opens and closes as expected
- [ ] Confirm responsive behavior on different screen sizes

## Completion Criteria
- [ ] Both components render correctly
- [ ] All features work as expected
- [ ] Components are well-integrated with other parts of the application
- [ ] Documentation is complete and accurate 