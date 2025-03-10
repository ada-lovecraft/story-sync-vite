/**
 * Testing Helper Utilities
 * 
 * This file contains utility functions to assist with testing edge cases
 * like network errors, large document processing, and performance monitoring.
 */

/**
 * Options for the network condition simulator
 */
export interface NetworkConditionOptions {
  /** Whether to enable latency simulation (default: false) */
  enableLatency?: boolean;
  /** Minimum latency in milliseconds (default: 100) */
  minLatencyMs?: number;
  /** Maximum latency in milliseconds (default: 500) */
  maxLatencyMs?: number;
  /** Whether to enable packet loss simulation (default: false) */
  enablePacketLoss?: boolean;
  /** Packet loss rate, 0-1 (default: 0.1 = 10%) */
  packetLossRate?: number;
  /** Whether to enable throttling (default: false) */
  enableThrottling?: boolean;
  /** Throughput in kilobits per second (default: 1000) */
  throughputKbps?: number;
}

/**
 * Class for simulating different network conditions
 */
export class NetworkConditionSimulator {
  private originalFetch: typeof window.fetch;
  private options: Required<NetworkConditionOptions>;
  private isEnabled: boolean = false;

  constructor(options: NetworkConditionOptions = {}) {
    // Set default options
    this.options = {
      enableLatency: options.enableLatency ?? false,
      minLatencyMs: options.minLatencyMs ?? 100,
      maxLatencyMs: options.maxLatencyMs ?? 500,
      enablePacketLoss: options.enablePacketLoss ?? false,
      packetLossRate: options.packetLossRate ?? 0.1,
      enableThrottling: options.enableThrottling ?? false,
      throughputKbps: options.throughputKbps ?? 1000
    };

    // Store original fetch
    this.originalFetch = window.fetch;
  }

  /**
   * Enable network condition simulation
   */
  enable(): void {
    if (this.isEnabled) return;
    
    this.isEnabled = true;
    window.fetch = this.fetchWithSimulation.bind(this);
    
    console.info('Network condition simulation enabled', this.options);
  }

  /**
   * Disable network condition simulation
   */
  disable(): void {
    if (!this.isEnabled) return;
    
    window.fetch = this.originalFetch;
    this.isEnabled = false;
    
    console.info('Network condition simulation disabled');
  }

  /**
   * Update simulation options
   */
  updateOptions(options: Partial<NetworkConditionOptions>): void {
    this.options = { ...this.options, ...options };
    console.info('Network condition simulation options updated', this.options);
  }

  /**
   * Simulate network failure for specific URLs
   */
  simulateFailure(urlPattern: RegExp | string, failureRate: number = 1): void {
    this.updateOptions({
      enablePacketLoss: true,
      packetLossRate: failureRate
    });
  }

  /**
   * Simulate slow network for specific URLs
   */
  simulateSlowNetwork(latencyMs: number = 1000, throughputKbps: number = 500): void {
    this.updateOptions({
      enableLatency: true,
      minLatencyMs: latencyMs,
      maxLatencyMs: latencyMs + 200,
      enableThrottling: true,
      throughputKbps
    });
  }

  /**
   * Wrapper for fetch that simulates network conditions
   */
  private async fetchWithSimulation(...args: Parameters<typeof fetch>): Promise<Response> {
    const [input, init] = args;
    let url: string;

    // Extract URL from input (can be string, URL, or Request)
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.href;
    } else {
      url = input.url;
    }

    // Simulate packet loss
    if (this.options.enablePacketLoss && Math.random() < this.options.packetLossRate) {
      await this.simulateLatency();
      throw new Error(`Network error: Request failed due to simulated packet loss for ${url}`);
    }

    // Simulate latency
    if (this.options.enableLatency) {
      await this.simulateLatency();
    }

    // Make the actual request
    const response = await this.originalFetch(input, init);

    // Clone the response for processing
    const clonedResponse = response.clone();
    
    // If throttling is enabled and it's a streaming response, throttle it
    if (this.options.enableThrottling && clonedResponse.body) {
      return new Response(
        this.throttleStream(clonedResponse.body, this.options.throughputKbps),
        {
          status: clonedResponse.status,
          statusText: clonedResponse.statusText,
          headers: clonedResponse.headers
        }
      );
    }

    return response;
  }

  /**
   * Simulate random latency
   */
  private async simulateLatency(): Promise<void> {
    const { minLatencyMs, maxLatencyMs } = this.options;
    const latency = Math.random() * (maxLatencyMs - minLatencyMs) + minLatencyMs;
    await new Promise(resolve => setTimeout(resolve, latency));
  }

  /**
   * Throttle a ReadableStream based on throughput
   */
  private throttleStream(
    stream: ReadableStream<Uint8Array>,
    throughputKbps: number
  ): ReadableStream<Uint8Array> {
    const bytesPerSecond = (throughputKbps * 1024) / 8; // Convert Kbps to bytes per second
    const reader = stream.getReader();

    return new ReadableStream({
      async pull(controller) {
        try {
          const { value, done } = await reader.read();
          
          if (done) {
            controller.close();
            return;
          }
          
          if (value) {
            // Calculate delay based on chunk size and throughput
            const delayMs = (value.length / bytesPerSecond) * 1000;
            
            // Add delay to simulate throttling
            await new Promise(resolve => setTimeout(resolve, delayMs));
            
            // Enqueue the chunk
            controller.enqueue(value);
          }
        } catch (error) {
          controller.error(error);
        }
      },
      
      cancel() {
        reader.cancel();
      }
    });
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private metrics: Record<string, { 
    start: number; 
    end?: number; 
    duration?: number;
    memory?: {
      jsHeapSizeLimit: number;
      totalJSHeapSize: number;
      usedJSHeapSize: number;
    };
  }> = {};
  
  /**
   * Start timing a metric
   */
  startTiming(metricName: string): void {
    if (this.metrics[metricName]?.start && !this.metrics[metricName]?.end) {
      console.warn(`Metric "${metricName}" is already being timed. Restarting.`);
    }
    
    this.metrics[metricName] = {
      start: performance.now()
    };
    
    // Capture memory if available
    this.captureMemory(metricName);
  }
  
  /**
   * End timing a metric
   */
  endTiming(metricName: string): number | undefined {
    if (!this.metrics[metricName] || this.metrics[metricName].end) {
      console.warn(`Metric "${metricName}" is not currently being timed.`);
      return undefined;
    }
    
    const end = performance.now();
    const start = this.metrics[metricName].start;
    const duration = end - start;
    
    this.metrics[metricName].end = end;
    this.metrics[metricName].duration = duration;
    
    // Capture memory if available
    this.captureMemory(metricName);
    
    return duration;
  }
  
  /**
   * Get all metrics
   */
  getMetrics(): Record<string, any> {
    return { ...this.metrics };
  }
  
  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = {};
  }
  
  /**
   * Capture current memory usage
   */
  private captureMemory(metricName: string): void {
    // @ts-ignore - performance.memory is non-standard and only available in Chrome
    if (window.performance && window.performance.memory) {
      // @ts-ignore
      this.metrics[metricName].memory = { ...window.performance.memory };
    }
  }
}

/**
 * Generate a document with a specified number of rounds for testing
 */
export function generateTestDocument(numRounds: number = 10): string {
  let content = `# Test Campaign\n\nThis is a generated test document with ${numRounds} rounds.\n\n`;
  
  for (let i = 1; i <= numRounds; i++) {
    content += `## Round ${i}\n\n`;
    content += `### User\n\nThis is the user's action for round ${i}. The user performs a complex action that requires a response from the dungeon master.`;
    content += ` The user character does something interesting that will advance the story and create new narrative possibilities.\n\n`;
    
    content += `### Dungeon Master\n\nThis is the dungeon master's response for round ${i}. It contains detailed description and narrative elements.`;
    content += ` The world responds to the user's actions, and new story elements unfold. This section typically contains the longest and most detailed text.`;
    content += ` Characters react, the environment changes, and the story advances in interesting ways that will lead to future developments.\n\n`;
  }
  
  return content;
}

/**
 * Generate a very large document for load testing
 */
export function generateLargeTestDocument(numChapters: number = 5, roundsPerChapter: number = 10): string {
  let content = `# Large Test Campaign\n\nThis is a generated large test document with ${numChapters} chapters and ${roundsPerChapter} rounds per chapter.\n\n`;
  
  for (let chapter = 1; chapter <= numChapters; chapter++) {
    content += `# Chapter ${chapter}\n\n`;
    
    for (let round = 1; round <= roundsPerChapter; round++) {
      const roundNumber = (chapter - 1) * roundsPerChapter + round;
      
      content += `## Round ${roundNumber}\n\n`;
      
      content += `### User\n\nThis is a complex user action for round ${roundNumber} in chapter ${chapter}.`;
      content += ` The user character takes significant steps to advance the plot and interact with the world.`;
      content += ` This action is designed to elicit a detailed response and create new storytelling opportunities.`;
      content += ` The character demonstrates their personality and motivations through this action.\n\n`;
      
      content += `### Dungeon Master\n\nThe dungeon master provides an elaborate response to the user's action in round ${roundNumber}.`;
      content += ` This response includes detailed descriptions of the environment, character reactions, and plot developments.`;
      content += ` New characters are introduced, existing relationships evolve, and the overall narrative takes unexpected turns.`;
      content += ` The world feels alive and responsive to the player's choices, with consequences that will echo through future rounds.`;
      content += ` This section intentionally contains a substantial amount of text to simulate realistic gameplay and test performance with large content blocks.`;
      content += ` Multiple paragraphs of rich description create an immersive experience while also providing a significant processing challenge for the application.`;
      
      // Add extra paragraphs for even more text
      for (let p = 0; p < 3; p++) {
        content += `\n\nParagraph ${p+1}: Additional narrative details expand the world and deepen the story context.`;
        content += ` Characters reveal new aspects of their personalities and histories.`;
        content += ` The setting is further developed with sensory details and historical context.`;
        content += ` Plot threads introduced earlier begin to connect in meaningful ways.`;
      }
      
      content += `\n\n`;
    }
  }
  
  return content;
} 