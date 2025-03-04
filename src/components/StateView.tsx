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