import React, { useState } from 'react'
import { ClipboardCopy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from './button'

interface CopyableTextProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Text content to display and copy */
  text: string
  /** Optional label for the section */
  label?: string
  /** Icon to display next to the label */
  icon?: React.ReactNode
  /** Wrapper element for the text content */
  textWrapper?: 'p' | 'pre' | 'div' | 'code'
  /** Background color variant */
  variant?: 'default' | 'outline' | 'muted'
  /** Max height with scrolling, useful for large content */
  maxHeight?: string | number
  /** Text to show in the toast after copying */
  copySuccessMessage?: string
}

export function CopyableText({
  text,
  label,
  icon,
  className,
  textWrapper: TextWrapper = 'p',
  variant = 'default',
  maxHeight,
  copySuccessMessage = 'Copied to clipboard!',
  ...props
}: CopyableTextProps) {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = async () => {
    if (!text) return

    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      toast.success(copySuccessMessage)
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
      toast.error('Failed to copy text')
    }
  }

  const variantStyles = {
    default: 'bg-white dark:bg-slate-900 border',
    outline: 'border',
    muted: 'bg-slate-50 dark:bg-slate-900 border'
  }

  return (
    <div 
      className={cn(
        'relative rounded-md',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {/* Header with label and copy button */}
      <div className="flex items-center justify-between p-3 pb-1">
        {label && (
          <div className="flex items-center gap-2 text-sm font-medium">
            {icon}
            <span>{label}</span>
          </div>
        )}
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-8 w-8 ml-auto rounded-full"
          onClick={handleCopy}
        >
          {isCopied ? 
            <Check className="h-4 w-4" /> : 
            <ClipboardCopy className="h-4 w-4" />
          }
          <span className="sr-only">Copy to clipboard</span>
        </Button>
      </div>

      {/* Text content */}
      <div className={cn("px-3 pb-3", maxHeight && "overflow-auto")} style={maxHeight ? { maxHeight } : undefined}>
        <TextWrapper className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
          {text}
        </TextWrapper>
      </div>
    </div>
  )
} 