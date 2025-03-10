import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface StreamErrorBoundaryProps {
  children: ReactNode;
  roundIndex: number;
  onRetry?: (roundIndex: number) => void;
  fallback?: ReactNode;
}

interface StreamErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component for handling stream-related errors
 * 
 * This component catches errors that occur during streaming and displays
 * a user-friendly error message with a retry option.
 */
export class StreamErrorBoundary extends Component<StreamErrorBoundaryProps, StreamErrorBoundaryState> {
  constructor(props: StreamErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }
  
  static getDerivedStateFromError(error: Error): StreamErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('Stream error caught by error boundary:', error, errorInfo);
  }
  
  handleRetry = (): void => {
    // Reset the error state
    this.setState({
      hasError: false,
      error: null
    });
    
    // Call the onRetry callback if provided
    if (this.props.onRetry) {
      this.props.onRetry(this.props.roundIndex);
    }
  };
  
  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Otherwise, use the default error UI
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error processing stream</AlertTitle>
          <AlertDescription>
            <div className="mt-2 mb-4">
              {this.state.error?.message || 'An error occurred while processing the stream.'}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={this.handleRetry}
              className="mt-2"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    
    // If there's no error, render the children
    return this.props.children;
  }
} 