/**
 * The single internal document shape that ALL sources (page / pdf / txt / epub /
 * docx) normalize to. Everything downstream — the reader view, both TTS engines,
 * highlighting — operates only on this, so it is completely source-agnostic.
 *
 * The pipeline is deliberately two-staged:
 *
 *   DocumentSource.load()  →  RawDocument   (source-specific: get the text out)
 *   normalize(RawDocument) →  NormalizedDoc (shared: split to sentences + words)
 *
 * This keeps every source trivial (it only has to produce title + text blocks)
 * and keeps the hard part (sentence/word segmentation with offsets) in one
 * tested place.
 */

/**
 * Source-agnostic raw text: a title plus already-separated text blocks
 * (paragraphs, PDF page chunks, etc). Block boundaries are preserved so the
 * reader can render paragraphs and so segmentation never runs across unrelated
 * passages.
 */
export interface RawDocument {
  title: string;
  blocks: string[];
}

/** A single word within a sentence, with offsets INTO that sentence's text. */
export interface WordToken {
  text: string;
  /** Inclusive start offset within the parent sentence's `text`. */
  charStart: number;
  /** Exclusive end offset within the parent sentence's `text`. */
  charEnd: number;
}

/**
 * One sentence — the unit of TTS playback. We synthesize/utter a sentence at a
 * time so long documents start fast, and `words` (with char offsets) lets both
 * engines map their timing signal back to a highlight index:
 *   - Web Speech: onboundary charIndex → word via [charStart, charEnd)
 *   - ElevenLabs: alignment time → word index (same word list)
 */
export interface Sentence {
  /** Stable index across the whole document (== highlight/seek target). */
  id: number;
  /** The exact text spoken for this sentence. */
  text: string;
  words: WordToken[];
  /** Which source block (paragraph) this sentence came from, for rendering. */
  paragraph: number;
}

/** The normalized document. `blocks` is the ordered list of sentences. */
export interface NormalizedDoc {
  title: string;
  blocks: Sentence[];
}

/**
 * A source of a document. Implemented per input type (page, pdf, txt, …); each
 * only needs to produce a {@link RawDocument}. `normalize()` does the rest.
 */
export interface DocumentSource {
  /** Human label for the source kind, used in errors/telemetry. */
  readonly kind: string;
  load(): Promise<RawDocument>;
}
