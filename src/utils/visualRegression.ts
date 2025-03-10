/**
 * Visual Regression Testing Utilities
 * 
 * This file contains utilities to help with visual regression testing by capturing
 * screenshots of components and comparing them for visual differences.
 */

import html2canvas from 'html2canvas';

/**
 * Options for capturing screenshots
 */
export interface CaptureOptions {
  /** Optional filename prefix for the screenshot */
  prefix?: string;
  /** Optional scale factor for the screenshot (default: 1) */
  scale?: number;
  /** Whether to automatically download the screenshot (default: false) */
  download?: boolean;
  /** Optional callback to execute after capturing the screenshot */
  onCapture?: (canvas: HTMLCanvasElement, dataUrl: string) => void;
}

/**
 * Captures a screenshot of a DOM element
 * 
 * @param element The DOM element to capture
 * @param options Options for the capture
 * @returns Promise that resolves with the canvas and dataUrl
 */
export async function captureElement(
  element: HTMLElement,
  options: CaptureOptions = {}
): Promise<{ canvas: HTMLCanvasElement; dataUrl: string }> {
  const {
    prefix = 'screenshot',
    scale = 1,
    download = false,
    onCapture
  } = options;

  try {
    // Generate canvas from element
    const canvas = await html2canvas(element, {
      scale,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    // Generate data URL from canvas
    const dataUrl = canvas.toDataURL('image/png');

    // Download if requested
    if (download) {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `${prefix}-${timestamp}.png`;
      downloadScreenshot(dataUrl, filename);
    }

    // Execute callback if provided
    if (onCapture) {
      onCapture(canvas, dataUrl);
    }

    return { canvas, dataUrl };
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    throw error;
  }
}

/**
 * Downloads a screenshot as a PNG file
 * 
 * @param dataUrl The data URL of the screenshot
 * @param filename The filename to use for the download
 */
function downloadScreenshot(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Stores a screenshot in localStorage for later comparison
 * 
 * @param key A unique key to identify the screenshot
 * @param dataUrl The data URL of the screenshot
 */
export function storeScreenshot(key: string, dataUrl: string): void {
  try {
    localStorage.setItem(`screenshot_${key}`, dataUrl);
  } catch (error) {
    console.error('Error storing screenshot:', error);
    throw error;
  }
}

/**
 * Retrieves a stored screenshot from localStorage
 * 
 * @param key The unique key of the screenshot
 * @returns The data URL of the screenshot or null if not found
 */
export function getStoredScreenshot(key: string): string | null {
  return localStorage.getItem(`screenshot_${key}`);
}

/**
 * Options for comparing screenshots
 */
export interface CompareOptions {
  /** Threshold for pixel differences (0-1, default: 0.1) */
  threshold?: number;
  /** Whether to highlight differences in the output (default: true) */
  highlightDifferences?: boolean;
  /** Color to use for highlighting differences (default: 'rgba(255,0,0,0.5)') */
  highlightColor?: string;
}

/**
 * Result of comparing two screenshots
 */
export interface ComparisonResult {
  /** Whether the comparison passed (differences below threshold) */
  passed: boolean;
  /** Percentage of pixels that differ (0-100) */
  diffPercentage: number;
  /** Canvas containing the diff image */
  diffCanvas?: HTMLCanvasElement;
  /** Data URL of the diff image */
  diffDataUrl?: string;
  /** Number of pixels that differ */
  diffPixelCount: number;
  /** Total number of pixels compared */
  totalPixelCount: number;
}

/**
 * Compares two screenshots for visual differences
 * 
 * @param screenshot1 The first screenshot (data URL or canvas)
 * @param screenshot2 The second screenshot (data URL or canvas)
 * @param options Options for the comparison
 * @returns Promise that resolves with the comparison result
 */
export async function compareScreenshots(
  screenshot1: string | HTMLCanvasElement,
  screenshot2: string | HTMLCanvasElement,
  options: CompareOptions = {}
): Promise<ComparisonResult> {
  const {
    threshold = 0.1,
    highlightDifferences = true,
    highlightColor = 'rgba(255,0,0,0.5)'
  } = options;

  // Function to create an image from a data URL or canvas
  const createImage = async (src: string | HTMLCanvasElement): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      
      if (typeof src === 'string') {
        img.src = src;
      } else {
        img.src = src.toDataURL('image/png');
      }
    });
  };

  try {
    // Create images from screenshots
    const [img1, img2] = await Promise.all([
      createImage(screenshot1),
      createImage(screenshot2)
    ]);

    // Create canvases for comparison
    const canvas1 = document.createElement('canvas');
    const ctx1 = canvas1.getContext('2d');
    const canvas2 = document.createElement('canvas');
    const ctx2 = canvas2.getContext('2d');
    const diffCanvas = document.createElement('canvas');
    const diffCtx = diffCanvas.getContext('2d');

    if (!ctx1 || !ctx2 || !diffCtx) {
      throw new Error('Failed to get canvas context');
    }

    // Set canvas dimensions to image dimensions
    const width = Math.max(img1.width, img2.width);
    const height = Math.max(img1.height, img2.height);
    canvas1.width = canvas2.width = diffCanvas.width = width;
    canvas1.height = canvas2.height = diffCanvas.height = height;

    // Draw images to canvases
    ctx1.drawImage(img1, 0, 0);
    ctx2.drawImage(img2, 0, 0);

    // Get image data
    const data1 = ctx1.getImageData(0, 0, width, height);
    const data2 = ctx2.getImageData(0, 0, width, height);
    const diff = diffCtx.createImageData(width, height);

    // Compare pixels
    let diffPixelCount = 0;
    const totalPixelCount = width * height;

    for (let i = 0; i < data1.data.length; i += 4) {
      // Get pixel components
      const r1 = data1.data[i];
      const g1 = data1.data[i + 1];
      const b1 = data1.data[i + 2];
      const a1 = data1.data[i + 3];

      const r2 = data2.data[i];
      const g2 = data2.data[i + 1];
      const b2 = data2.data[i + 2];
      const a2 = data2.data[i + 3];

      // Calculate difference
      const rDiff = Math.abs(r1 - r2);
      const gDiff = Math.abs(g1 - g2);
      const bDiff = Math.abs(b1 - b2);
      const aDiff = Math.abs(a1 - a2);

      // Calculate pixel difference percentage (0-1)
      const pixelDiff = (rDiff + gDiff + bDiff + aDiff) / (4 * 255);

      // If the difference is above the threshold, count it as a diff
      if (pixelDiff > threshold) {
        diffPixelCount++;

        if (highlightDifferences) {
          // Set the diff pixel to red for highlighting
          diff.data[i] = 255;
          diff.data[i + 1] = 0;
          diff.data[i + 2] = 0;
          diff.data[i + 3] = 128;
        } else {
          // Copy the pixel from the second image
          diff.data[i] = r2;
          diff.data[i + 1] = g2;
          diff.data[i + 2] = b2;
          diff.data[i + 3] = a2;
        }
      } else {
        // Copy the pixel from the second image
        diff.data[i] = r2;
        diff.data[i + 1] = g2;
        diff.data[i + 2] = b2;
        diff.data[i + 3] = a2;
      }
    }

    // Draw the diff
    diffCtx.putImageData(diff, 0, 0);

    // Calculate diff percentage
    const diffPercentage = (diffPixelCount / totalPixelCount) * 100;

    // Create result
    const result: ComparisonResult = {
      passed: diffPercentage <= (threshold * 100),
      diffPercentage,
      diffCanvas,
      diffDataUrl: diffCanvas.toDataURL('image/png'),
      diffPixelCount,
      totalPixelCount
    };

    return result;
  } catch (error) {
    console.error('Error comparing screenshots:', error);
    throw error;
  }
}

/**
 * React hook to capture screenshots of components
 * 
 * @param ref Ref to the component to capture
 * @param key Unique key for storing the screenshot
 */
export function useCaptureScreenshot(ref: React.RefObject<HTMLElement>, key: string) {
  const captureSnapshot = async (options: CaptureOptions = {}) => {
    if (!ref.current) return null;
    
    const { dataUrl } = await captureElement(ref.current, options);
    storeScreenshot(key, dataUrl);
    return dataUrl;
  };

  const compareWithStored = async (options: CompareOptions = {}) => {
    if (!ref.current) return null;
    
    const storedDataUrl = getStoredScreenshot(key);
    if (!storedDataUrl) return null;
    
    const { dataUrl } = await captureElement(ref.current);
    return compareScreenshots(storedDataUrl, dataUrl, options);
  };

  return {
    captureSnapshot,
    compareWithStored
  };
} 