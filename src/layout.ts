export interface ViewportSize {
  width: number;
  height: number;
}

export function viewportSizeFromRect(rect: { width: number; height: number }): ViewportSize | null {
  const width = Math.floor(rect.width);
  const height = Math.floor(rect.height);
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

export function didViewportSizeChange(previous: ViewportSize | null, next: ViewportSize | null): boolean {
  if (!next) return false;
  return !previous || previous.width !== next.width || previous.height !== next.height;
}
