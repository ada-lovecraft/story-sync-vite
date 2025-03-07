/**
 * Transforms raw conversation text into a structured format for story processing.
 * Applies various text replacements and formatting rules as per project requirements.
 */

/**
 * Transforms the content according to the specified rules:
 * - Replace first occurrence of "You said:" with "<user>"
 * - Replace subsequent occurrences of "You said:" with "</dungeon_master>\n<user>"
 * - Replace all "chatGPT said:" with "</user>\n<dungeon_master>"
 * - Ensure file starts with "<user>" and ends with "</dungeon_master>"
 * - Remove date lines matching /\d+\/\d+/ with no other content
 * - Replace multiple newlines with a single double newline
 */
export function transformContent(content: string): string {
  // Make content case-insensitive for all pattern matching operations
  const lowerContent = content.toLowerCase();
  let result = content;

  // Check if the content starts with "You said:" pattern
  const youSaidPattern = /^you said:/i;
  const firstYouSaidIndex = lowerContent.search(youSaidPattern);

  if (firstYouSaidIndex === 0) {
    // Replace the first occurrence with "<user>"
    result = result.replace(youSaidPattern, "<user>");
  } else {
    // If it doesn't start with "You said:", prepend "<user>"
    result = "<user>" + result;
  }

  // Replace subsequent occurrences of "You said:" with "</dungeon_master>\n<user>"
  // Use a regex that doesn't match at the start of the string
  const subsequentYouSaidPattern = /(?<!^)you said:/gi;
  result = result.replace(subsequentYouSaidPattern, "</dungeon_master>\n<user>");

  // Replace all instances of "chatGPT said:" with "</user>\n<dungeon_master>"
  const chatGPTPattern = /chatGPT said:/gi;
  result = result.replace(chatGPTPattern, "</user>\n<dungeon_master>");

  // Remove lines matching /\d+\/\d+/ with no other content
  const dateLinePattern = /^\s*\d+\/\d+\s*$/gm;
  result = result.replace(dateLinePattern, "");

  // Replace multiple newlines with a single double newline
  const multipleNewlinesPattern = /\n{3,}/g;
  result = result.replace(multipleNewlinesPattern, "\n\n");

  // Ensure the content ends with "</dungeon_master>"
  if (!result.trim().endsWith("</dungeon_master>")) {
    result = result.trim() + "\n</dungeon_master>";
  }

  return result;
}

/**
 * Parses the processed content into rounds.
 * Each round consists of a pair of <user> and <dungeon_master> nodes.
 */
export function parseContentIntoRounds(content: string) {
  // Split the content by lines for analysis
  const lines = content.split('\n');
  const rounds = [];

  let currentRound = null;
  let userTagFound = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Start of a user section
    if (line.includes("<user>")) {
      // If we already found a user tag and now found another one,
      // it means we're starting a new round
      if (userTagFound && currentRound) {
        rounds.push(currentRound);
        currentRound = null;
      }

      userTagFound = true;
      currentRound = {
        roundIndex: rounds.length,
        startLine: i,
        endLine: -1,
        lineCount: 0
      };
    }

    // End of a dungeon master section, which completes a round
    if (line.includes("</dungeon_master>") && currentRound) {
      currentRound.endLine = i;
      currentRound.lineCount = currentRound.endLine - currentRound.startLine + 1;
    }
  }

  // Push the last round if it exists
  if (currentRound && currentRound.endLine !== -1) {
    rounds.push(currentRound);
  }

  return rounds;
}

// Define the Round interface to fix the type error
interface Round {
  roundIndex: number;
  startLine: number;
  endLine: number;
  lineCount: number;
}

/**
 * Groups rounds into chapters based on line count threshold.
 */
export function groupRoundsIntoChapters(rounds: Round[]) {
  const chapters = [];
  let currentChapter = {
    roundsRange: [0, 0] as [number, number],
    omit: [] as number[],
    lineCount: 0
  };

  let chapterStartIndex = 0;

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];

    // If adding this round exceeds the threshold and we already have at least one round
    if (currentChapter.lineCount + round.lineCount >= 2500 && i > chapterStartIndex) {
      // Finish the current chapter
      currentChapter.roundsRange = [chapterStartIndex, i - 1];
      chapters.push({
        roundsRange: currentChapter.roundsRange,
        omit: []
      });

      // Start a new chapter
      chapterStartIndex = i;
      currentChapter = {
        roundsRange: [i, 0] as [number, number],
        omit: [] as number[],
        lineCount: 0
      };
    }

    // Add the current round's line count
    currentChapter.lineCount += round.lineCount;
  }

  // Add the last chapter if it has rounds
  if (chapterStartIndex < rounds.length) {
    currentChapter.roundsRange = [chapterStartIndex, rounds.length - 1];
    chapters.push({
      roundsRange: currentChapter.roundsRange,
      omit: []
    });
  }

  return chapters;
}

/**
 * Extracts user and dungeon master content from a given text.
 * Captures text between <user>...</user> and <dungeon_master>...</dungeon_master> tags.
 * 
 * @param content The content to extract blocks from
 * @returns An object containing userContent and dmContent strings
 */
export function extractBlocks(content: string): { userContent: string; dmContent: string } {
  console.log('extractBlocks', { content });
  const userRegex = /<user>([\s\S]*?)<\/user>/i;
  const dmRegex = /<dungeon_master>([\s\S]*?)<\/dungeon_master>/i;

  // Extract user content
  const userMatch = content.match(userRegex);
  const userContent = userMatch ? userMatch[1].trim() : '';

  // Extract dungeon master content
  const dmMatch = content.match(dmRegex);
  const dmContent = dmMatch ? dmMatch[1].trim() : '';

  return { userContent, dmContent };
} 