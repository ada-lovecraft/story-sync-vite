import React, { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { PerformanceMonitor, NetworkConditionSimulator, generateLargeTestDocument } from '@/utils/testingHelpers'
import { captureElement } from '@/utils/visualRegression'
import { useStore } from '@/store'
import { useQueueMonitor } from '@/store/selectors'

/**
 * A panel that guides users through the testing process and collects results
 */
export function TestingScriptPanel() {
  const [activeTab, setActiveTab] = useState('performance')
  const [networkSimulationEnabled, setNetworkSimulationEnabled] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, any>>({})
  const performanceMonitor = useRef(new PerformanceMonitor()).current
  const networkSimulator = useRef(new NetworkConditionSimulator()).current
  const reportRef = useRef<HTMLDivElement>(null)
  const queueMonitor = useQueueMonitor()
  const { rawFileContent, setRawFileContent, resetStore } = useStore(state => ({
    rawFileContent: state.rawFileContent,
    setRawFileContent: state.setRawFileContent,
    resetStore: state.resetStore
  }))

  // Toggle network condition simulation
  const toggleNetworkSimulation = () => {
    if (networkSimulationEnabled) {
      networkSimulator.disable()
    } else {
      networkSimulator.enable()
    }
    setNetworkSimulationEnabled(!networkSimulationEnabled)
  }

  // Generate a test document with a specified number of rounds
  const generateTestDoc = (size: 'small' | 'medium' | 'large') => {
    let content = ''
    
    if (size === 'small') {
      content = generateLargeTestDocument(1, 5) // 5 rounds in 1 chapter
    } else if (size === 'medium') {
      content = generateLargeTestDocument(3, 10) // 30 rounds in 3 chapters
    } else {
      content = generateLargeTestDocument(5, 20) // 100 rounds in 5 chapters
    }
    
    setRawFileContent(content)
    return content
  }

  // Start a performance test
  const startPerformanceTest = (testCase: string) => {
    performanceMonitor.clearMetrics()
    performanceMonitor.startTiming(testCase)
    
    // Record the start of the test in results
    setTestResults(prev => ({
      ...prev,
      [testCase]: {
        started: new Date().toISOString(),
        completed: false
      }
    }))
  }

  // End a performance test
  const endPerformanceTest = (testCase: string) => {
    const duration = performanceMonitor.endTiming(testCase)
    const metrics = performanceMonitor.getMetrics()
    
    // Record the results
    setTestResults(prev => ({
      ...prev,
      [testCase]: {
        ...prev[testCase],
        completed: true,
        completedAt: new Date().toISOString(),
        duration,
        metrics: metrics[testCase]
      }
    }))
  }

  // Simulate different network conditions
  const setNetworkCondition = (condition: 'normal' | 'slow' | 'unstable' | 'offline') => {
    if (!networkSimulationEnabled) {
      networkSimulator.enable()
      setNetworkSimulationEnabled(true)
    }
    
    switch (condition) {
      case 'normal':
        networkSimulator.updateOptions({
          enableLatency: true,
          minLatencyMs: 20,
          maxLatencyMs: 50,
          enablePacketLoss: false,
          enableThrottling: false
        })
        break
      case 'slow':
        networkSimulator.simulateSlowNetwork(2000, 200) // 2s latency, 200kbps
        break
      case 'unstable':
        networkSimulator.updateOptions({
          enableLatency: true,
          minLatencyMs: 100,
          maxLatencyMs: 5000,
          enablePacketLoss: true,
          packetLossRate: 0.1
        })
        break
      case 'offline':
        networkSimulator.simulateFailure(/.*/, 1) // All requests fail
        break
    }
  }

  // Capture a screenshot of a component
  const captureScreenshot = async (testCase: string) => {
    if (!reportRef.current) return
    
    try {
      const { dataUrl } = await captureElement(reportRef.current, {
        prefix: `test-${testCase}`,
        download: true
      })
      
      // Record the screenshot data URL
      setTestResults(prev => ({
        ...prev,
        [testCase]: {
          ...prev[testCase],
          screenshot: dataUrl
        }
      }))
    } catch (error) {
      console.error('Failed to capture screenshot', error)
    }
  }

  // Reset testing environment
  const resetTestingEnvironment = () => {
    resetStore()
    performanceMonitor.clearMetrics()
    
    if (networkSimulationEnabled) {
      networkSimulator.disable()
      setNetworkSimulationEnabled(false)
    }
    
    setTestResults({})
  }

  return (
    <Card className="max-w-4xl w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Testing Script Panel
          <Badge variant={networkSimulationEnabled ? "destructive" : "outline"}>
            Network Simulation: {networkSimulationEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Follow the test cases below to verify performance and behavior
        </CardDescription>
      </CardHeader>
      
      <Tabs defaultValue="performance" value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="visual">Visual Regression</TabsTrigger>
            <TabsTrigger value="edge-cases">Edge Cases</TabsTrigger>
            <TabsTrigger value="results">Test Results</TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="pt-6">
          <TabsContent value="performance">
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">Test Case 1: Single Round Summary</h3>
                  <p className="text-sm mb-4">Measure performance when generating a single round summary.</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => startPerformanceTest('single-round')}
                    >
                      Start Test
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => endPerformanceTest('single-round')}
                    >
                      End Test
                    </Button>
                  </div>
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">Test Case 2: Batch Round Summary</h3>
                  <p className="text-sm mb-4">Measure performance when processing multiple rounds in sequence.</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => startPerformanceTest('batch-rounds')}
                    >
                      Start Test
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => endPerformanceTest('batch-rounds')}
                    >
                      End Test
                    </Button>
                  </div>
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">Test Case 3: Large Document</h3>
                  <p className="text-sm mb-4">Generate test documents of various sizes to test with.</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => generateTestDoc('small')}
                    >
                      Small (5 rounds)
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => generateTestDoc('medium')}
                    >
                      Medium (30 rounds)
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => generateTestDoc('large')}
                    >
                      Large (100 rounds)
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="visual">
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">Test Case 6: Visual Consistency</h3>
                  <p className="text-sm mb-4">Capture screenshots to verify components appear as expected.</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="component-selector">Select Component</Label>
                      <select 
                        id="component-selector" 
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      >
                        <option value="chapter-table">ChapterTable</option>
                        <option value="round-details">RoundDetailsDrawer</option>
                        <option value="queue-panel">QueuePanel</option>
                        <option value="streaming-summary">StreamingSummary</option>
                      </select>
                    </div>
                    
                    <div className="flex items-end">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => captureScreenshot('visual-test')}
                      >
                        Capture Screenshot
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="edge-cases">
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">Test Case 7: Network Conditions</h3>
                  <p className="text-sm mb-4">Simulate different network conditions to test error handling.</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <Button 
                      variant={networkSimulationEnabled ? "secondary" : "outline"} 
                      onClick={toggleNetworkSimulation}
                    >
                      {networkSimulationEnabled ? 'Disable' : 'Enable'} Network Simulation
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    <Button 
                      variant="outline" 
                      disabled={!networkSimulationEnabled}
                      onClick={() => setNetworkCondition('normal')}
                    >
                      Normal
                    </Button>
                    <Button 
                      variant="outline" 
                      disabled={!networkSimulationEnabled}
                      onClick={() => setNetworkCondition('slow')}
                    >
                      Slow
                    </Button>
                    <Button 
                      variant="outline" 
                      disabled={!networkSimulationEnabled}
                      onClick={() => setNetworkCondition('unstable')}
                    >
                      Unstable
                    </Button>
                    <Button 
                      variant="outline" 
                      disabled={!networkSimulationEnabled}
                      onClick={() => setNetworkCondition('offline')}
                    >
                      Offline
                    </Button>
                  </div>
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">Test Case 8: Browser Compatibility</h3>
                  <p className="text-sm mb-4">Record browser information for compatibility testing.</p>
                  
                  <div className="flex flex-col gap-2">
                    <div>
                      <Label htmlFor="browser-info">Browser Information</Label>
                      <Input 
                        id="browser-info" 
                        value={navigator.userAgent} 
                        readOnly
                      />
                    </div>
                    <div>
                      <Label htmlFor="tester-notes">Tester Notes</Label>
                      <Textarea 
                        id="tester-notes" 
                        placeholder="Enter any browser-specific issues or observations here..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="results">
            <div ref={reportRef} className="space-y-4">
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-2">Test Report</h3>
                
                <div className="grid gap-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Test Date:</span>
                    <span>{new Date().toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Browser:</span>
                    <span>{navigator.userAgent}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Queue Status:</span>
                    <span>
                      Total: {queueMonitor.queueStats.total}, 
                      Pending: {queueMonitor.queueStats.pending}, 
                      In Progress: {queueMonitor.queueStats.inProgress}, 
                      Completed: {queueMonitor.queueStats.completed}, 
                      Failed: {queueMonitor.queueStats.failed}
                    </span>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Test Results</h4>
                    <pre className="bg-muted p-4 rounded-md text-xs overflow-auto">
                      {JSON.stringify(testResults, null, 2)}
                    </pre>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => captureScreenshot('test-report')}
                  >
                    Export Report
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={resetTestingEnvironment}>
          Reset Testing Environment
        </Button>
        <Button 
          variant="default" 
          onClick={() => setActiveTab(
            activeTab === 'performance' ? 'visual' : 
            activeTab === 'visual' ? 'edge-cases' : 
            activeTab === 'edge-cases' ? 'results' : 'performance'
          )}
        >
          Next Section
        </Button>
      </CardFooter>
    </Card>
  )
} 