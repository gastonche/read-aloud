import { describe, it, expect } from 'vitest';
import { normalize, wordCount } from './normalize';

describe('normalize', () => {
  it('splits blocks into sentences and sentences into words', () => {
    const doc = normalize({
      title: 'Test',
      blocks: ['Hello world. This is ReadAloud!'],
    });
    expect(doc.blocks.map((s) => s.text)).toEqual([
      'Hello world.',
      'This is ReadAloud!',
    ]);
    expect(doc.blocks[0]!.words.map((w) => w.text)).toEqual(['Hello', 'world']);
    expect(doc.blocks[1]!.words.map((w) => w.text)).toEqual([
      'This',
      'is',
      'ReadAloud',
    ]);
  });

  it('records word char offsets that index back into the sentence text', () => {
    const doc = normalize({ title: 'T', blocks: ['Alpha beta.'] });
    const s = doc.blocks[0]!;
    for (const w of s.words) {
      expect(s.text.slice(w.charStart, w.charEnd)).toBe(w.text);
    }
  });

  it('assigns globally increasing sentence ids and tracks paragraphs', () => {
    const doc = normalize({
      title: 'T',
      blocks: ['One. Two.', 'Three.'],
    });
    expect(doc.blocks.map((s) => s.id)).toEqual([0, 1, 2]);
    expect(doc.blocks.map((s) => s.paragraph)).toEqual([0, 0, 1]);
  });

  it('drops sentences with no word-like tokens', () => {
    const doc = normalize({ title: 'T', blocks: ['Real text.', '...', '   '] });
    expect(doc.blocks).toHaveLength(1);
    expect(doc.blocks[0]!.text).toBe('Real text.');
  });

  it('falls back to "Untitled" for an empty title', () => {
    expect(normalize({ title: '   ', blocks: ['Hi there.'] }).title).toBe(
      'Untitled',
    );
  });

  it('counts words across the whole document', () => {
    const doc = normalize({ title: 'T', blocks: ['a b c.', 'd e.'] });
    expect(wordCount(doc)).toBe(5);
  });

  it('segments CJK without spaces into words', () => {
    // Intl.Segmenter handles scripts a regex \b can't (no spaces in Japanese).
    const doc = normalize({ title: 'T', blocks: ['東京は日本の首都です。'] });
    expect(doc.blocks).toHaveLength(1);
    expect(doc.blocks[0]!.words.length).toBeGreaterThan(1);
  });

  it('KNOWN LIMITATION: ICU has no abbreviation dictionary, so "Dr." breaks', () => {
    // Documented in the README — ICU sentence rules split after "Dr.". A future
    // pass could merge segments ending in a known abbreviation.
    const doc = normalize({
      title: 'T',
      blocks: ['Dr. Smith went home. He slept.'],
    });
    expect(doc.blocks).toHaveLength(3);
  });
});
