/** Drop a trailing file extension for use as a fallback document title. */
export function stripExtension(filename: string): string {
  const base = filename.replace(/^.*[\\/]/, '');
  return base.replace(/\.[^.]+$/, '') || base;
}
