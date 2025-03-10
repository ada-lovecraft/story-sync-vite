import { renderHook, act } from '@testing-library/react';
import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';
import { useTokenStream } from './useTokenStream';
import * as tokenEvents from '@/utils/tokenEvents';

// Mock the tokenEvents module
vi.mock('@/utils/tokenEvents', () => ({
  subscribeToTokenEvents: vi.fn(),
}));

describe('useTokenStream', () => {
  // Setup mocks
  let mockSubscribe: ReturnType<typeof vi.fn>;
  let mockUnsubscribe: ReturnType<typeof vi.fn>;
  let eventCallback: ((event: any) => void) | null = null;
  
  beforeEach(() => {
    // Create mock function for unsubscribing
    mockUnsubscribe = vi.fn();
    
    // Create mock function for subscribing
    mockSubscribe = vi.fn((roundIndex, callback) => {
      // Save callback so we can simulate events
      eventCallback = callback;
      return mockUnsubscribe;
    });
    
    // Apply mock implementation
    (tokenEvents.subscribeToTokenEvents as any).mockImplementation(mockSubscribe);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
    eventCallback = null;
  });
  
  it('should initialize with empty text', () => {
    const { result } = renderHook(() => useTokenStream(1));
    
    expect(result.current.text).toBe('');
    expect(result.current.isComplete).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.errorMessage).toBe('');
    expect(result.current.isStreaming).toBe(true);
  });
  
  it('should initialize with initialText if provided', () => {
    const initialText = 'Initial text';
    const { result } = renderHook(() => useTokenStream(1, { initialText }));
    
    expect(result.current.text).toBe(initialText);
  });
  
  it('should subscribe to token events for the specified round', () => {
    renderHook(() => useTokenStream(42));
    
    expect(mockSubscribe).toHaveBeenCalledWith(42, expect.any(Function));
  });
  
  it('should not subscribe if roundIndex is null', () => {
    renderHook(() => useTokenStream(null));
    
    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(eventCallback).toBeNull();
  });
  
  it('should update text when token events are received', () => {
    const { result } = renderHook(() => useTokenStream(1));
    
    // Ensure callback was saved
    expect(eventCallback).not.toBeNull();
    
    // Simulate token events
    act(() => {
      eventCallback!({ token: 'Hello ', roundIndex: 1 });
    });
    
    expect(result.current.text).toBe('Hello ');
    
    act(() => {
      eventCallback!({ token: 'world', roundIndex: 1 });
    });
    
    expect(result.current.text).toBe('Hello world');
  });
  
  it('should handle completion event', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useTokenStream(1, { onComplete }));
    
    // Simulate some tokens, then completion
    act(() => {
      eventCallback!({ token: 'Hello world', roundIndex: 1 });
      eventCallback!({ token: '', roundIndex: 1, isComplete: true });
    });
    
    expect(result.current.isComplete).toBe(true);
    expect(result.current.isStreaming).toBe(false);
    expect(onComplete).toHaveBeenCalledWith('Hello world');
  });
  
  it('should handle error event', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useTokenStream(1, { onError }));
    
    // Simulate an error
    act(() => {
      eventCallback!({ 
        token: '', 
        roundIndex: 1, 
        isError: true, 
        errorMessage: 'Test error' 
      });
    });
    
    expect(result.current.isError).toBe(true);
    expect(result.current.errorMessage).toBe('Test error');
    expect(result.current.isStreaming).toBe(false);
    expect(onError).toHaveBeenCalledWith('Test error');
  });
  
  it('should clean up subscription when unmounting', () => {
    const { unmount } = renderHook(() => useTokenStream(1));
    
    unmount();
    
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
  
  it('should resubscribe when roundIndex changes', () => {
    const { rerender } = renderHook(
      (props) => useTokenStream(props.roundIndex), 
      { initialProps: { roundIndex: 1 } }
    );
    
    expect(mockSubscribe).toHaveBeenCalledWith(1, expect.any(Function));
    
    // Change roundIndex
    rerender({ roundIndex: 2 });
    
    // Should unsubscribe from old and subscribe to new
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalledWith(2, expect.any(Function));
  });
  
  it('should reset state when roundIndex changes', () => {
    const { result, rerender } = renderHook(
      (props) => useTokenStream(props.roundIndex), 
      { initialProps: { roundIndex: 1 } }
    );
    
    // Simulate some state
    act(() => {
      eventCallback!({ token: 'Hello', roundIndex: 1 });
    });
    
    expect(result.current.text).toBe('Hello');
    
    // Change roundIndex
    rerender({ roundIndex: 2 });
    
    // State should be reset
    expect(result.current.text).toBe('');
    expect(result.current.isComplete).toBe(false);
    expect(result.current.isError).toBe(false);
  });
}); 