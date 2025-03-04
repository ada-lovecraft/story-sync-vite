import { FC } from 'react'
import { MoonIcon, SunIcon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTheme } from '@/hooks/use-theme'

interface NavbarProps {
  setActiveView: (view: 'upload' | 'fine-tuning' | 'summary' | 'store-test') => void
}

export const Navbar: FC<NavbarProps> = ({ setActiveView }) => {
  const { theme, setTheme } = useTheme()

  return (
    <header className="border-b">
      <div className="container mx-auto h-16 px-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">Story Sync</h1>
          
          <Tabs defaultValue="upload" className="ml-6" onValueChange={(value) => setActiveView(value as any)}>
            <TabsList>
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="fine-tuning">Fine-Tuning</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="store-test">Store Test</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  )
} 