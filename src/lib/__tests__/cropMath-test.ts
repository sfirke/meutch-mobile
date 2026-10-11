import {
  clampView,
  cropFraction,
  fitRect,
  imageRect,
  INITIAL_VIEW,
  insetRect,
  intersectRect,
  isFullFrame,
  MAX_ZOOM,
  MIN_CROP_SIZE,
  normalizeTurns,
  resizeCrop,
  rotatedSize,
  toPixelCrop,
  zoomView,
  type Rect,
} from '../cropMath';

const base: Rect = { x: 20, y: 100, width: 300, height: 200 };

describe('rotation', () => {
  it('normalizes quarter turns to 0-3', () => {
    expect(normalizeTurns(5)).toBe(1);
    expect(normalizeTurns(-1)).toBe(3);
    expect(normalizeTurns(4)).toBe(0);
  });

  it('swaps the sides on an odd number of turns', () => {
    const size = { width: 400, height: 300 };

    expect(rotatedSize(size, 1)).toEqual({ width: 300, height: 400 });
    expect(rotatedSize(size, -1)).toEqual({ width: 300, height: 400 });
    expect(rotatedSize(size, 2)).toEqual(size);
  });
});

describe('fitRect', () => {
  const frame: Rect = { x: 10, y: 10, width: 300, height: 500 };

  it('fits a landscape photo to the width and centres it', () => {
    expect(fitRect({ width: 600, height: 400 }, frame)).toEqual({
      x: 10,
      y: 160,
      width: 300,
      height: 200,
    });
  });

  it('fits a tall photo to the height', () => {
    expect(fitRect({ width: 100, height: 500 }, frame)).toEqual({
      x: 110,
      y: 10,
      width: 100,
      height: 500,
    });
  });

  it('falls back to the frame for an unknown size', () => {
    expect(fitRect({ width: 0, height: 0 }, frame)).toEqual(frame);
  });
});

describe('rect helpers', () => {
  it('insets on every side without going negative', () => {
    expect(insetRect({ x: 0, y: 0, width: 100, height: 30 }, 20)).toEqual({
      x: 20,
      y: 20,
      width: 60,
      height: 0,
    });
  });

  it('intersects two rects', () => {
    expect(
      intersectRect(
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 50, y: -20, width: 100, height: 60 },
      ),
    ).toEqual({ x: 50, y: 0, width: 50, height: 40 });
  });

  it('scales the image about its centre and offsets it', () => {
    expect(
      imageRect(base, { scale: 2, translateX: 10, translateY: -10 }),
    ).toEqual({ x: -120, y: -10, width: 600, height: 400 });
  });
});

describe('clampView', () => {
  it('pins an unzoomed photo under a full crop box', () => {
    expect(
      clampView(base, { scale: 1, translateX: 40, translateY: -40 }, base),
    ).toEqual(INITIAL_VIEW);
  });

  it('lets the photo slide until its edge meets the crop box', () => {
    const crop: Rect = { x: 120, y: 150, width: 100, height: 100 };

    expect(
      clampView(base, { scale: 1, translateX: 500, translateY: -500 }, crop),
    ).toEqual({ scale: 1, translateX: 100, translateY: -50 });
  });

  it('keeps the zoom between fitted and the maximum', () => {
    expect(clampView(base, { ...INITIAL_VIEW, scale: 0.2 }, base).scale).toBe(
      1,
    );
    expect(clampView(base, { ...INITIAL_VIEW, scale: 99 }, base).scale).toBe(
      MAX_ZOOM,
    );
  });

  it('will not zoom out past a crop box larger than the fitted photo', () => {
    const crop: Rect = { x: 20, y: 50, width: 300, height: 300 };

    expect(clampView(base, { ...INITIAL_VIEW, scale: 1 }, crop).scale).toBe(
      1.5,
    );
  });
});

describe('zoomView', () => {
  it('zooms about the centre of the crop box', () => {
    const crop: Rect = { x: 20, y: 100, width: 150, height: 100 };
    const zoomed = zoomView(base, INITIAL_VIEW, crop, 2);
    const before = imageRect(base, INITIAL_VIEW);
    const after = imageRect(base, zoomed);
    const centreX = crop.x + crop.width / 2;

    // The same point of the photo stays under the centre.
    expect((centreX - after.x) / after.width).toBeCloseTo(
      (centreX - before.x) / before.width,
    );
    expect(zoomed.scale).toBe(2);
  });

  it('recentres when zooming back out', () => {
    const zoomed = { scale: 2, translateX: 150, translateY: 100 };

    expect(zoomView(base, zoomed, base, 1)).toEqual(INITIAL_VIEW);
  });
});

describe('resizeCrop', () => {
  it('moves only the dragged corner', () => {
    expect(resizeCrop(base, 'topLeft', 30, 40, base)).toEqual({
      x: 50,
      y: 140,
      width: 270,
      height: 160,
    });
    expect(resizeCrop(base, 'bottomRight', -30, -40, base)).toEqual({
      x: 20,
      y: 100,
      width: 270,
      height: 160,
    });
    expect(resizeCrop(base, 'topRight', -30, 40, base)).toEqual({
      x: 20,
      y: 140,
      width: 270,
      height: 160,
    });
    expect(resizeCrop(base, 'bottomLeft', 30, -40, base)).toEqual({
      x: 50,
      y: 100,
      width: 270,
      height: 160,
    });
  });

  it('stops at the bounds', () => {
    const start: Rect = { x: 100, y: 150, width: 100, height: 100 };

    expect(resizeCrop(start, 'topLeft', -500, -500, base)).toEqual({
      x: 20,
      y: 100,
      width: 180,
      height: 150,
    });
    expect(resizeCrop(start, 'bottomRight', 500, 500, base)).toEqual({
      x: 100,
      y: 150,
      width: 220,
      height: 150,
    });
  });

  it('keeps a minimum size', () => {
    const resized = resizeCrop(base, 'bottomRight', -500, -500, base);

    expect(resized.width).toBe(MIN_CROP_SIZE);
    expect(resized.height).toBe(MIN_CROP_SIZE);
  });

  it('never grows a box that starts below the minimum', () => {
    const thin: Rect = { x: 20, y: 100, width: 300, height: 30 };

    expect(resizeCrop(thin, 'bottomRight', -10, -500, thin).height).toBe(30);
  });
});

describe('cropFraction', () => {
  it('is the whole photo for a full crop box', () => {
    const fraction = cropFraction(base, imageRect(base, INITIAL_VIEW));

    expect(fraction).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    expect(isFullFrame(fraction)).toBe(true);
  });

  it('measures the box against the zoomed photo', () => {
    const fraction = cropFraction(
      base,
      imageRect(base, { scale: 2, translateX: 0, translateY: 0 }),
    );

    expect(fraction).toEqual({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 });
    expect(isFullFrame(fraction)).toBe(false);
  });

  it('stays inside the photo', () => {
    const fraction = cropFraction(
      { x: 0, y: 100, width: 400, height: 200 },
      base,
    );

    expect(fraction.x).toBe(0);
    expect(fraction.width).toBe(1);
  });
});

describe('toPixelCrop', () => {
  it('rounds to whole pixels', () => {
    expect(
      toPixelCrop(
        { x: 0.25, y: 0.1, width: 0.5, height: 0.333 },
        { width: 1601, height: 1200 },
      ),
    ).toEqual({ originX: 400, originY: 120, width: 801, height: 400 });
  });

  it('never leaves the image or collapses to nothing', () => {
    expect(
      toPixelCrop(
        { x: 0.9996, y: 0, width: 0.5, height: 0 },
        { width: 1000, height: 800 },
      ),
    ).toEqual({ originX: 999, originY: 0, width: 1, height: 1 });
  });
});
