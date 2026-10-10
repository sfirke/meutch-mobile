// Pure helpers for the drag-to-reorder photo grid. Safe to call from worklets.

export type GridLayout = {
  columns: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
};

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const result: T[] = [];
  for (let i = 0; i < list.length; i++) result.push(list[i]);
  const n = list.length;
  if (from < 0 || from >= n || from === to) return result;
  const target = to < 0 ? 0 : to >= n ? n - 1 : to;
  if (target === from) return result;
  const moved = result.splice(from, 1)[0];
  result.splice(target, 0, moved);
  return result;
}

export function slotForPosition(
  layout: GridLayout,
  x: number,
  y: number,
  count: number,
): number {
  if (count <= 0) return 0;
  let col = Math.floor(x / (layout.cellWidth + layout.gap));
  let row = Math.floor(y / (layout.cellHeight + layout.gap));
  if (col < 0) col = 0;
  if (col > layout.columns - 1) col = layout.columns - 1;
  if (row < 0) row = 0;
  let index = row * layout.columns + col;
  if (index > count - 1) index = count - 1;
  return index;
}

export function positionForSlot(
  layout: GridLayout,
  index: number,
): { x: number; y: number } {
  const col = index % layout.columns;
  const row = Math.floor(index / layout.columns);
  return {
    x: col * (layout.cellWidth + layout.gap),
    y: row * (layout.cellHeight + layout.gap),
  };
}

export function slotCentre(
  layout: GridLayout,
  index: number,
): { x: number; y: number } {
  const p = positionForSlot(layout, index);
  return { x: p.x + layout.cellWidth / 2, y: p.y + layout.cellHeight / 2 };
}
