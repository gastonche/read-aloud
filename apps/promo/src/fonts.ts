// Load the two brand families once; components reference FONT.display / FONT.body.
import { loadFont as loadFraunces } from '@remotion/google-fonts/Fraunces';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';

export const fraunces = loadFraunces('normal', {
  weights: ['400', '500', '600', '700', '900'],
});
export const inter = loadInter('normal', {
  weights: ['400', '500', '600', '700', '800'],
});

export const fontsReady = Promise.all([
  fraunces.waitUntilDone(),
  inter.waitUntilDone(),
]);
