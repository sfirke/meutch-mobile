import {
  GridLayout,
  moveItem,
  positionForSlot,
  slotCentre,
  slotForPosition,
} from '../reorder';

describe('moveItem', () => {
  const list = ['a', 'b', 'c', 'd'];

  it('moves forward', () => {
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves backward', () => {
    expect(moveItem(list, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('returns an unchanged copy for the same index', () => {
    const result = moveItem(list, 2, 2);
    expect(result).toEqual(list);
    expect(result).not.toBe(list);
  });

  it('returns an unchanged copy when from is out of range', () => {
    expect(moveItem(list, -1, 1)).toEqual(list);
    expect(moveItem(list, 4, 1)).toEqual(list);
  });

  it('clamps to into range', () => {
    expect(moveItem(list, 0, 99)).toEqual(['b', 'c', 'd', 'a']);
    expect(moveItem(list, 3, -5)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('handles an empty list', () => {
    expect(moveItem([], 0, 1)).toEqual([]);
  });

  it('does not mutate the input', () => {
    const input = Object.freeze(['a', 'b', 'c']);
    expect(moveItem(input, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(input).toEqual(['a', 'b', 'c']);
  });
});

describe('grid slots', () => {
  const layout: GridLayout = {
    columns: 3,
    cellWidth: 100,
    cellHeight: 80,
    gap: 10,
  };

  it('maps every cell centre to its own slot', () => {
    for (let i = 0; i < 9; i++) {
      const c = slotCentre(layout, i);
      expect(slotForPosition(layout, c.x, c.y, 9)).toBe(i);
    }
  });

  it('round-trips positionForSlot', () => {
    for (let i = 0; i < 9; i++) {
      const p = positionForSlot(layout, i);
      expect(slotForPosition(layout, p.x, p.y, 9)).toBe(i);
    }
    expect(positionForSlot(layout, 0)).toEqual({ x: 0, y: 0 });
    expect(positionForSlot(layout, 4)).toEqual({ x: 110, y: 90 });
  });

  it('computes centres', () => {
    expect(slotCentre(layout, 4)).toEqual({ x: 160, y: 130 });
  });

  it('assigns points in gaps to the preceding cell', () => {
    expect(slotForPosition(layout, 105, 10, 9)).toBe(0);
    expect(slotForPosition(layout, 10, 85, 9)).toBe(0);
    expect(slotForPosition(layout, 215, 95, 9)).toBe(4);
  });

  it('clamps beyond the last row and column', () => {
    expect(slotForPosition(layout, 50, 5000, 9)).toBe(8);
    expect(slotForPosition(layout, 5000, 0, 9)).toBe(2);
  });

  it('clamps negative coordinates to 0', () => {
    expect(slotForPosition(layout, -20, -20, 9)).toBe(0);
    expect(slotForPosition(layout, -1, 100, 9)).toBe(3);
    expect(slotForPosition(layout, 100, -1, 9)).toBe(0);
  });

  it('clamps to count when the grid is not full', () => {
    expect(slotForPosition(layout, 250, 100, 5)).toBe(4);
    expect(slotForPosition(layout, 250, 0, 2)).toBe(1);
    expect(slotForPosition(layout, 0, 0, 0)).toBe(0);
  });
});
