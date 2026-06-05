// Every source normalizes to this shape in two stages: DocumentSource.load()
// produces a source-specific RawDocument, then normalize() splits it into the
// shared sentence/word NormalizedDoc that all downstream code operates on.

// Block boundaries are preserved so segmentation never runs across unrelated
// passages and the reader can render paragraphs.
export interface RawDocument {
  title: string;
  blocks: string[];
  /** Declared language tag if the source knows it (e.g. <html lang>). */
  lang?: string | undefined;
}

export interface WordToken {
  text: string;
  /** Inclusive start offset within the parent sentence's `text`. */
  charStart: number;
  /** Exclusive end offset within the parent sentence's `text`. */
  charEnd: number;
}

// The unit of TTS playback. `words` offsets let both engines map their timing
// signal back to a highlight index (onboundary charIndex / alignment time).
export interface Sentence {
  /** Stable index across the whole document (== highlight/seek target). */
  id: number;
  text: string;
  words: WordToken[];
  paragraph: number;
}

export interface NormalizedDoc {
  title: string;
  blocks: Sentence[];
  lang: string;
}

export interface DocumentSource {
  readonly kind: string;
  load(): Promise<RawDocument>;
}
