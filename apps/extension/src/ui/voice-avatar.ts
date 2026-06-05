// Deterministic, offline illustration avatars for voices (DiceBear "personas"),
// generated locally as SVG data URIs — no network, no bundled photos.

import { createAvatar } from '@dicebear/core';
import { personas } from '@dicebear/collection';

const cache = new Map<string, string>();

export function voiceAvatar(seed: string): string {
  let uri = cache.get(seed);
  if (!uri) {
    const svg = createAvatar(personas, {
      seed,
      radius: 50,
      backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'],
    }).toString();
    uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    cache.set(seed, uri);
  }
  return uri;
}
