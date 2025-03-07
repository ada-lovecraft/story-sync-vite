import { extractBlocks } from './content-transformation';

describe('extractBlocks', () => {
    it('should extract user and dungeon master content from valid tags', () => {
        const content = `
      <user>This is user content</user>
      <dungeon_master>This is dungeon master content</dungeon_master>
    `;

        const result = extractBlocks(content);

        expect(result.userContent).toBe('This is user content');
        expect(result.dmContent).toBe('This is dungeon master content');
    });

    it('should handle multiline content', () => {
        const content = `
      <user>
        This is user content
        with multiple lines
      </user>
      <dungeon_master>
        This is dungeon master content
        with multiple lines
      </dungeon_master>
    `;

        const result = extractBlocks(content);

        expect(result.userContent).toBe('This is user content\n        with multiple lines');
        expect(result.dmContent).toBe('This is dungeon master content\n        with multiple lines');
    });

    it('should return empty strings when tags are not found', () => {
        const content = 'This content has no tags';

        const result = extractBlocks(content);

        expect(result.userContent).toBe('');
        expect(result.dmContent).toBe('');
    });

    it('should handle case insensitivity', () => {
        const content = `
      <USER>This is user content</USER>
      <DUNGEON_MASTER>This is dungeon master content</DUNGEON_MASTER>
    `;

        const result = extractBlocks(content);

        expect(result.userContent).toBe('This is user content');
        expect(result.dmContent).toBe('This is dungeon master content');
    });
}); 