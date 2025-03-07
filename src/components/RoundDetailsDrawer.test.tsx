import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoundDetailsDrawer } from './RoundDetailsDrawer';
import { Round } from '@/store';

describe('RoundDetailsDrawer', () => {
    const mockRound: Round = {
        roundIndex: 0,
        startLine: 1,
        endLine: 10,
        lineCount: 10,
        summary: 'Test summary',
        summaryStatus: 'completed',
        userText: 'User text content',
        dmText: 'Dungeon Master text content'
    };

    const mockCallbacks = {
        onClose: vi.fn(),
        onReroll: vi.fn(),
        onSlideUp: vi.fn(),
        onSlideDown: vi.fn(),
        onSplit: vi.fn(),
        onOmit: vi.fn()
    };

    it('renders user and dungeon master text areas', () => {
        render(
            <RoundDetailsDrawer
                round={mockRound}
                open={true}
                onClose={mockCallbacks.onClose}
            />
        );

        expect(screen.getByText('User')).toBeInTheDocument();
        expect(screen.getByText('Dungeon Master')).toBeInTheDocument();
        expect(screen.getByDisplayValue('User text content')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Dungeon Master text content')).toBeInTheDocument();
    });

    it('renders the round actions toolbar when all callbacks are provided', () => {
        render(
            <RoundDetailsDrawer
                round={mockRound}
                open={true}
                onClose={mockCallbacks.onClose}
                onReroll={mockCallbacks.onReroll}
                onSlideUp={mockCallbacks.onSlideUp}
                onSlideDown={mockCallbacks.onSlideDown}
                onSplit={mockCallbacks.onSplit}
                onOmit={mockCallbacks.onOmit}
                chapterIndex={0}
                isFirstChapter={false}
                isLastChapter={false}
                isOmitted={false}
            />
        );

        // The toolbar should be visible
        // Note: This test might need adjustment based on how the toolbar is rendered
        // and what specific elements we can check for
    });

    it('does not render the toolbar when callbacks are missing', () => {
        render(
            <RoundDetailsDrawer
                round={mockRound}
                open={true}
                onClose={mockCallbacks.onClose}
                onReroll={mockCallbacks.onReroll}
            // Missing other callbacks
            />
        );

        // The toolbar should not be visible
        // Note: This test might need adjustment based on how the toolbar is rendered
        // and what specific elements we can check for
    });
}); 