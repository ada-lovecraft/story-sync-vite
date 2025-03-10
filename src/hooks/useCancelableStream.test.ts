import { renderHook } from '@testing-library/react';
import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';
import { useCancelableStream } from './useCancelableStream';
import * as tokenEvents from '@/utils/tokenEvents';

// Mock the tokenEvents module
vi.mock('@/utils/tokenEvents', () => ({
  dispatchTokenEvent: vi.fn(),
}));

describe('useCancelableStream', () => {
  // Setup mocks
  const mockDispatchEvent = vi.fn();
  
  beforeEach(() => {
    // Apply mock implementation
    (tokenEvents.dispatchTokenEvent as any).mockImplementation(mockDispatchEvent);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('should not dispatch any events when initialized with null roundIndex', () => {
    renderHook(() => useCancelableStream(null));
    
    expect(mockDispatchEvent).not.toHaveBeenCalled();
  });
  
  it('should provide hasActiveStream status', () => {
    const { result } = renderHook(() => useCancelableStream(1));
    expect(result.current.hasActiveStream).toBe(true);
    
    const { result: nullResult } = renderHook(() => useCancelableStream(null));
    expect(nullResult.current.hasActiveStream).toBe(false);
  });
  
  it('should cancel stream when unmounting', () => {
    const { unmount } = renderHook(() => useCancelableStream(42));
    
    // No events should be dispatched during initialization
    expect(mockDispatchEvent).not.toHaveBeenCalled();
    
    // Unmount the hook
    unmount();
    
    // Should dispatch a completion event
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      42, 
      '', 
      expect.objectContaining({ 
        isComplete: true,
        isError: false 
      })
    );
  });
  
  it('should cancel previous stream when roundIndex changes', () => {
    const { rerender } = renderHook(
      (props) => useCancelableStream(props.roundIndex), 
      { initialProps: { roundIndex: 1 } }
    );
    
    // No events should be dispatched yet
    expect(mockDispatchEvent).not.toHaveBeenCalled();
    
    // Change roundIndex
    rerender({ roundIndex: 2 });
    
    // Should dispatch an event to cancel stream for the old roundIndex
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      1, 
      '', 
      expect.objectContaining({ 
        isComplete: true,
        isError: false
      })
    );
    
    // Clear the mock to test the next change
    mockDispatchEvent.mockClear();
    
    // Change to null (no active stream)
    rerender({ roundIndex: null });
    
    // Should dispatch an event to cancel stream for the previous roundIndex
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      2, 
      '', 
      expect.objectContaining({ 
        isComplete: true,
        isError: false
      })
    );
  });
  
  it('should not cancel previous stream if it was null', () => {
    const { rerender } = renderHook(
      (props) => useCancelableStream(props.roundIndex), 
      { initialProps: { roundIndex: null } }
    );
    
    // Change from null to a valid index
    rerender({ roundIndex: 3 });
    
    // Should not dispatch any events yet
    expect(mockDispatchEvent).not.toHaveBeenCalled();
  });
  
  it('should provide a cancel method', () => {
    const { result } = renderHook(() => useCancelableStream(5));
    
    // Call the cancel method
    result.current.cancel();
    
    // Should dispatch a completion event
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      5, 
      '', 
      expect.objectContaining({ 
        isComplete: true,
        isError: false 
      })
    );
  });
  
  it('should do nothing when calling cancel with null roundIndex', () => {
    const { result } = renderHook(() => useCancelableStream(null));
    
    // Call the cancel method
    result.current.cancel();
    
    // Should not dispatch any events
    expect(mockDispatchEvent).not.toHaveBeenCalled();
  });
}); 