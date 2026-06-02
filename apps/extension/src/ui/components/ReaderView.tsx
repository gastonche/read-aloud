import { useEffect, useMemo, useRef } from 'react';
import type { NormalizedDoc, Sentence } from '@/core/document/types';

export interface ReaderViewProps {
  doc: NormalizedDoc;
  /** Sentence currently being spoken (-1 = none). Drives sentence highlight. */
  activeSentence?: number;
  /** Word index within the active sentence (-1 = none). Drives word highlight. */
  activeWord?: number;
  /** Click a sentence to seek playback there. */
  onSeek?: (sentenceId: number) => void;
}

/**
 * Renders the normalized document as selectable, highlightable text.
 *
 * Each word is its own <span> carrying data-sentence/data-word so the engines
 * can drive highlighting by index without re-rendering prose. The gaps between
 * words (spaces, punctuation) are emitted verbatim from the sentence text, so
 * what's shown matches exactly what's spoken. Highlights live only here, in the
 * panel — the source page DOM is never touched.
 */
export function ReaderView({
  doc,
  activeSentence = -1,
  activeWord = -1,
  onSeek,
}: ReaderViewProps) {
  // Group sentences into their source paragraphs for readable layout.
  const paragraphs = useMemo(() => groupByParagraph(doc.blocks), [doc.blocks]);

  // Keep the spoken sentence in view as playback advances.
  const rootRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (activeSentence < 0 || !rootRef.current) return;
    const el = rootRef.current.querySelector(
      `[data-sentence-id="${activeSentence}"]`,
    );
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeSentence]);

  return (
    <article ref={rootRef} className="reader mx-auto max-w-prose">
      <h1 className="mb-4 font-reader text-2xl font-semibold leading-tight">
        {doc.title}
      </h1>
      {paragraphs.map((para) => (
        <p
          key={para[0]?.id ?? Math.random()}
          className="mb-4 font-reader text-[17px] leading-8 text-ink"
        >
          {para.map((sentence) => (
            <SentenceSpan
              key={sentence.id}
              sentence={sentence}
              isActiveSentence={sentence.id === activeSentence}
              activeWord={sentence.id === activeSentence ? activeWord : -1}
              onSeek={onSeek}
            />
          ))}
        </p>
      ))}
    </article>
  );
}

function SentenceSpan({
  sentence,
  isActiveSentence,
  activeWord,
  onSeek,
}: {
  sentence: Sentence;
  isActiveSentence: boolean;
  activeWord: number;
  onSeek?: ((sentenceId: number) => void) | undefined;
}) {
  const segments = useMemo(() => toSegments(sentence), [sentence]);
  return (
    <span
      data-sentence-id={sentence.id}
      onClick={onSeek ? () => onSeek(sentence.id) : undefined}
      className={[
        'rounded transition-colors',
        onSeek ? 'cursor-pointer' : '',
        isActiveSentence ? 'bg-accent-soft' : '',
      ].join(' ')}
    >
      {segments.map((seg, i) =>
        seg.kind === 'gap' ? (
          <span key={i}>{seg.text}</span>
        ) : (
          <span
            key={i}
            data-word-index={seg.wordIndex}
            className={
              isActiveSentence && seg.wordIndex === activeWord
                ? 'rounded bg-accent text-paper'
                : ''
            }
          >
            {seg.text}
          </span>
        ),
      )}{' '}
    </span>
  );
}

type Segment =
  | { kind: 'gap'; text: string }
  | { kind: 'word'; text: string; wordIndex: number };

/** Split a sentence into alternating gap/word segments preserving exact text. */
function toSegments(sentence: Sentence): Segment[] {
  const { text, words } = sentence;
  const segments: Segment[] = [];
  let cursor = 0;
  words.forEach((w, wordIndex) => {
    if (w.charStart > cursor) {
      segments.push({ kind: 'gap', text: text.slice(cursor, w.charStart) });
    }
    segments.push({
      kind: 'word',
      text: text.slice(w.charStart, w.charEnd),
      wordIndex,
    });
    cursor = w.charEnd;
  });
  if (cursor < text.length) {
    segments.push({ kind: 'gap', text: text.slice(cursor) });
  }
  return segments;
}

function groupByParagraph(sentences: Sentence[]): Sentence[][] {
  const groups: Sentence[][] = [];
  let current = -1;
  for (const s of sentences) {
    if (s.paragraph !== current) {
      groups.push([]);
      current = s.paragraph;
    }
    groups[groups.length - 1]!.push(s);
  }
  return groups;
}
