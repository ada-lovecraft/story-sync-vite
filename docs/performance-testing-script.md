# Performance Testing Script

This document outlines test cases for measuring and verifying the performance improvements to the streaming architecture.

## Performance Measurement Methods

### 1. Objective Metrics

We'll use the following objective metrics to measure performance:

- **Frame Rate**: Using browser devtools Performance panel to measure FPS during streaming
- **Main Thread Utilization**: Measuring JavaScript execution time on the main thread
- **Memory Usage**: Tracking memory consumption during extended streaming sessions
- **Event Count**: Measuring the number of events dispatched during streaming
- **Re-render Frequency**: Using the React DevTools Profiler to measure component render frequency
- **Time to First Token**: Measuring the delay between request start and first token display

### 2. Subjective Metrics

We'll also collect subjective measurements:

- **Perceived Smoothness**: Rating the UI smoothness during streaming on a scale of 1-5
- **Input Responsiveness**: Testing if the UI responds promptly to user interactions during streaming
- **Visual Stability**: Checking for any layout shifts or visual glitches during streaming

## Test Cases

### Test Case 1: Single Round Summary Generation

**Objective**: Measure the performance of generating a single round summary.

**Steps**:
1. Open browser devtools and enable performance monitoring
2. Navigate to the ChapterTable view
3. Click "Summarize" on a single round that hasn't been summarized
4. Measure frame rate during streaming
5. Observe memory usage during the process
6. Interact with other UI elements during streaming to test responsiveness
7. Verify summary appears correctly when complete

**Success Criteria**:
- Frame rate remains above 30 FPS during streaming
- Main thread is not blocked for more than 50ms at a time
- UI remains responsive to interactions during streaming
- Summary is correctly displayed when complete

### Test Case 2: Batch Round Summary Generation

**Objective**: Measure performance when processing multiple rounds in sequence.

**Steps**:
1. Open browser devtools and enable performance monitoring
2. Navigate to the ChapterTable view
3. Click "Summarize All Rounds" for a chapter with at least 5 rounds
4. Measure frame rate during streaming of multiple summaries
5. Observe memory usage as multiple rounds are processed
6. Interact with other UI elements during streaming
7. Verify all summaries appear correctly when complete

**Success Criteria**:
- Frame rate remains above 30 FPS during streaming
- Memory usage remains stable or increases linearly (no memory leaks)
- UI remains responsive to interactions during streaming
- All summaries are correctly displayed when complete

### Test Case 3: Large Document Processing

**Objective**: Test performance with a very large document with many rounds.

**Steps**:
1. Load a document with at least 20 rounds
2. Click "Summarize All Rounds" across all chapters
3. Measure frame rate and memory usage during extended processing
4. Monitor for any degradation in performance over time
5. Verify all summaries are correctly displayed when complete

**Success Criteria**:
- Performance remains consistent even after processing many rounds
- Memory usage stabilizes after processing (no continuous growth)
- Application remains responsive throughout the entire process
- All summaries are correctly displayed

### Test Case 4: Rapid Reroll Testing

**Objective**: Test performance when rapidly rerolling summaries.

**Steps**:
1. Generate summaries for several rounds
2. Rapidly click "Reroll" on multiple summaries in succession
3. Measure UI responsiveness during rapid rerolls
4. Monitor queue processing efficiency
5. Verify summaries are regenerated correctly

**Success Criteria**:
- UI remains responsive during rapid reroll requests
- Queue properly prioritizes and processes reroll requests
- No queue stalling or processing errors occur
- Summaries are regenerated correctly

### Test Case 5: Concurrent Component Monitoring

**Objective**: Verify that components not involved in streaming remain fully functional.

**Steps**:
1. Start a batch summarization process
2. While processing, interact with various UI components:
   - Open and close the RoundDetailsDrawer
   - Expand and collapse chapters
   - Navigate between different views
   - Use the QueuePanel to monitor progress
3. Measure responsiveness of these interactions

**Success Criteria**:
- All UI components respond normally during streaming
- No visible lag when interacting with components
- Components display correct data during and after streaming
- No unexpected UI behavior or glitches occur

## Visual Regression Testing

### Test Case 6: Visual Consistency Verification

**Objective**: Verify that the visual appearance remains unchanged after optimizations.

**Steps**:
1. Take screenshots of key components before and after optimizations:
   - ChapterTable with streaming summaries
   - RoundDetailsDrawer showing a summary
   - QueuePanel with items in various states
   - StreamingSummary component in different states (loading, streaming, complete)
2. Compare screenshots for visual differences

**Success Criteria**:
- No unexpected visual differences between before and after screenshots
- Component layouts and spacing remain identical
- Loading states and animations appear consistent with original design
- Text formatting and styling matches original appearance

## Edge Case Testing

### Test Case 7: Error Handling Verification

**Objective**: Verify robust error handling during streaming.

**Steps**:
1. Simulate network failures during streaming (disconnect network briefly)
2. Test with malformed API responses (may require mocking)
3. Verify error states are displayed appropriately
4. Test retry functionality for failed requests
5. Monitor error logging and reporting

**Success Criteria**:
- Appropriate error messages are displayed to the user
- Failed streams are properly marked in the UI
- Retry functionality works correctly
- Application doesn't crash or become unresponsive during errors

### Test Case 8: Browser Compatibility Testing

**Objective**: Verify performance across different browsers.

**Steps**:
1. Run Test Cases 1-3 on different browsers:
   - Chrome
   - Firefox
   - Safari
   - Edge
2. Note any browser-specific performance issues

**Success Criteria**:
- Consistent performance across all tested browsers
- Fallback mechanisms work correctly on browsers without Web Worker support
- No browser-specific crashes or visual glitches

## User Testing Script

For manual verification by testers, please follow these steps:

1. **Basic Functionality Verification**:
   - Generate summaries for individual rounds
   - Reroll existing summaries
   - Process entire chapters at once
   - Verify all summaries display correctly

2. **Performance Verification**:
   - Note any UI lag or freezing during streaming
   - Attempt to interact with the UI during streaming
   - Process a large batch of rounds and monitor performance
   - Rate the overall smoothness of the experience

3. **Error Handling Verification**:
   - Disconnect internet during streaming to force errors
   - Try to reroll failed summaries
   - Check if error messages are clear and helpful

4. **Subjective Assessment**:
   - Rate overall UI responsiveness during streaming (1-5)
   - Note any visual glitches or layout issues
   - Provide feedback on the streaming animation smoothness
   - Compare your experience to the old implementation

## Reporting

Please document your findings using the following template:

```
Test Case #: [Number]
Browser: [Browser and Version]
System: [OS and Specifications]
Results:
- Frame Rate: [Average FPS]
- Memory Usage: [Starting MB → Ending MB]
- UI Responsiveness Rating: [1-5]
- Issues Observed: [Description of any issues]
- Additional Notes: [Any other observations]
```

## Troubleshooting Common Issues

If you encounter performance issues during testing, try these troubleshooting steps:

1. Check browser extensions - some may interfere with performance measurement
2. Ensure hardware acceleration is enabled in the browser
3. Close other memory-intensive applications
4. Try testing in an incognito/private window to eliminate extension interference
5. Clear browser cache and reload the application 