export function stripExtension(filename: string): string {
  const base = filename.replace(/^.*[\\/]/, '');
  return base.replace(/\.[^.]+$/, '') || base;
}
