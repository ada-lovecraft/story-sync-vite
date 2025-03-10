import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { 
  dispatchTokenEvent, 
  subscribeToTokenEvents, 
  getTokenEventName,
  TokenStreamEvent
} from './tokenEvents';

// Mock the window object for testing
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
const mockDispatchEvent = vi.fn();

// Create mock for CustomEvent
const CustomEventMock = vi.fn();

// Testing environment setup
describe('Token Events System', () => {
  // Setup before each test
  beforeEach(() => {
    // Set up window mock
    global.window = {
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
      dispatchEvent: mockDispatchEvent,
      CustomEvent: CustomEventMock
    } as any;
    
    // Reset mocks
    mockAddEventListener.mockReset();
    mockRemoveEventListener.mockReset();
    mockDispatchEvent.mockReset();
    CustomEventMock.mockReset();
    
    // Mock CustomEvent implementation
    CustomEventMock.mockImplementation((eventName, options) => ({
      type: eventName,
      detail: options.detail
    }));
  });
  
  // Clean up after each test
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  // Tests for getTokenEventName
  describe('getTokenEventName', () => {
    it('should generate the correct event name for a round index', () => {
      expect(getTokenEventName(1)).toBe('token-stream-1');
      expect(getTokenEventName(42)).toBe('token-stream-42');
    });
  });
  
  // Tests for dispatchTokenEvent
  describe('dispatchTokenEvent', () => {
    it('should create and dispatch a custom event with the token data', () => {
      dispatchTokenEvent(1, 'hello');
      
      // Check CustomEvent was created with correct parameters
      expect(CustomEventMock).toHaveBeenCalledWith(
        'token-stream-1',
        expect.objectContaining({
          detail: expect.objectContaining({
            token: 'hello',
            roundIndex: 1
          })
        })
      );
      
      // Check event was dispatched
      expect(mockDispatchEvent).toHaveBeenCalled();
    });
    
    it('should include metadata in the event detail', () => {
      const metadata = { 
        isComplete: true, 
        isError: false 
      };
      
      dispatchTokenEvent(2, 'world', metadata);
      
      expect(CustomEventMock).toHaveBeenCalledWith(
        'token-stream-2',
        expect.objectContaining({
          detail: expect.objectContaining({
            token: 'world',
            roundIndex: 2,
            isComplete: true,
            isError: false
          })
        })
      );
    });
    
    it('should handle error metadata correctly', () => {
      const errorMetadata = { 
        isError: true, 
        errorMessage: 'Test error' 
      };
      
      dispatchTokenEvent(3, '', errorMetadata);
      
      expect(CustomEventMock).toHaveBeenCalledWith(
        'token-stream-3',
        expect.objectContaining({
          detail: expect.objectContaining({
            token: '',
            roundIndex: 3,
            isError: true,
            errorMessage: 'Test error'
          })
        })
      );
    });
    
    it('should not throw if window is undefined', () => {
      // Set window to undefined
      global.window = undefined as any;
      
      // This should not throw
      expect(() => dispatchTokenEvent(1, 'test')).not.toThrow();
    });
  });
  
  // Tests for subscribeToTokenEvents
  describe('subscribeToTokenEvents', () => {
    it('should add an event listener for the specific round', () => {
      const callback = vi.fn();
      subscribeToTokenEvents(4, callback);
      
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'token-stream-4', 
        expect.any(Function)
      );
    });
    
    it('should return an unsubscribe function that removes the event listener', () => {
      const callback = vi.fn();
      const unsubscribe = subscribeToTokenEvents(5, callback);
      
      // Should be a function
      expect(typeof unsubscribe).toBe('function');
      
      // Call unsubscribe
      unsubscribe();
      
      // Should remove the event listener
      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'token-stream-5', 
        expect.any(Function)
      );
    });
    
    it('should not throw if window is undefined', () => {
      // Set window to undefined
      global.window = undefined as any;
      
      // This should not throw
      expect(() => subscribeToTokenEvents(1, () => {})).not.toThrow();
      
      // Unsubscribe should also not throw
      const unsubscribe = subscribeToTokenEvents(1, () => {});
      expect(() => unsubscribe()).not.toThrow();
    });
  });
}); 