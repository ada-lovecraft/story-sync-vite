import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { ToolsView } from './ToolsView';

// Mock fetch function
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        })
    };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock ReadableStream and TextDecoder
class MockReadableStream {
    constructor(private data: string) { }

    getReader() {
        let hasBeenRead = false;
        return {
            read: async () => {
                if (hasBeenRead) {
                    return { done: true };
                }
                hasBeenRead = true;
                return {
                    value: new TextEncoder().encode(this.data),
                    done: false
                };
            },
            releaseLock: () => { }
        };
    }
}

// Mock AbortController
global.AbortController = vi.fn().mockImplementation(() => ({
    signal: {},
    abort: vi.fn()
}));

// Mock TextDecoder
global.TextDecoder = vi.fn().mockImplementation(() => ({
    decode: (value: Uint8Array) => new TextDecoder().decode(value)
}));

describe('ToolsView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();

        // Default mock implementation for fetch
        mockFetch.mockResolvedValue({
            ok: true,
            body: new MockReadableStream('Mock response text'),
        });

        // Reset timers
        vi.useFakeTimers();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('renders the component with proper structure', () => {
        render(<ToolsView />);

        // Check for main elements
        expect(screen.getByText('Tools')).toBeDefined();
        expect(screen.getByLabelText('Prompt')).toBeDefined();
        expect(screen.getByText('Submit')).toBeDefined();
        expect(screen.getByText('Response')).toBeDefined();
    });

    it('loads prompt from localStorage on mount', () => {
        // Set up localStorage with saved prompt
        localStorageMock.setItem('toolPrompt', 'Saved prompt');

        render(<ToolsView />);

        // Check that the prompt was loaded from localStorage
        const textArea = screen.getByLabelText('Prompt');
        expect(textArea).toHaveValue('Saved prompt');
    });

    it('saves prompt to localStorage when changed (debounced)', async () => {
        render(<ToolsView />);

        const textArea = screen.getByLabelText('Prompt');

        // Change the prompt
        fireEvent.change(textArea, { target: { value: 'New prompt' } });

        // Verify localStorage is not called immediately
        expect(localStorageMock.setItem).not.toHaveBeenCalled();

        // Fast forward timers to trigger debounce
        act(() => {
            vi.advanceTimersByTime(600);
        });

        // Now localStorage should be called
        expect(localStorageMock.setItem).toHaveBeenCalledWith('toolPrompt', 'New prompt');
    });

    it('handles prompt changes', () => {
        render(<ToolsView />);

        const textArea = screen.getByLabelText('Prompt');
        fireEvent.change(textArea, { target: { value: 'Test prompt' } });

        expect(textArea).toHaveValue('Test prompt');
    });

    it('disables the submit button when prompt is empty', () => {
        render(<ToolsView />);

        const submitButton = screen.getByText('Submit');
        expect(submitButton).toBeDisabled();

        const textArea = screen.getByLabelText('Prompt');
        fireEvent.change(textArea, { target: { value: 'Test prompt' } });

        expect(submitButton).not.toBeDisabled();
    });

    it('sends a POST request on submit with the correct data', async () => {
        render(<ToolsView />);

        // Type in the prompt
        const textArea = screen.getByLabelText('Prompt');
        fireEvent.change(textArea, { target: { value: 'Test prompt' } });

        // Click submit
        const submitButton = screen.getByText('Submit');
        fireEvent.click(submitButton);

        // Check that fetch was called with the right params
        expect(mockFetch).toHaveBeenCalledWith(
            'http://localhost:4000/generate',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: 'Test prompt' }),
            })
        );
    });

    it('displays the streaming response', async () => {
        // Mock a more complex response
        mockFetch.mockResolvedValue({
            ok: true,
            body: new MockReadableStream('This is a streamed response'),
        });

        render(<ToolsView />);

        // Submit a prompt
        const textArea = screen.getByLabelText('Prompt');
        fireEvent.change(textArea, { target: { value: 'Test prompt' } });

        const submitButton = screen.getByText('Submit');
        fireEvent.click(submitButton);

        // We should see the loading state first
        expect(screen.getByText('Waiting for response...')).toBeDefined();

        // Wait for the response to be displayed
        // In a real test, you would use waitFor or findByText for async updates
        await vi.waitFor(() => {
            expect(screen.getByText('This is a streamed response')).toBeDefined();
        });
    });
}); 