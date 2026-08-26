export type PageDirection = "prev" | "next";

export function navigationDirection(key: string): PageDirection | null {
  if (key === "ArrowLeft" || key === "ArrowUp") return "prev";
  if (key === "ArrowRight" || key === "ArrowDown") return "next";
  return null;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;
  const element = target as Element & { nodeType?: number };
  if (element.nodeType !== 1 || typeof element.closest !== "function") return false;
  return Boolean(element.closest("button, input, textarea, select, [contenteditable='true']"));
}

export function createNavigationRunner(
  navigate: (direction: PageDirection) => Promise<void>,
  onError?: (error: unknown) => void
): (direction: PageDirection) => Promise<void> {
  let active = false;
  return async (direction: PageDirection): Promise<void> => {
    if (active) return;
    active = true;
    try {
      await navigate(direction);
    } catch (error) {
      onError?.(error);
    } finally {
      active = false;
    }
  };
}
