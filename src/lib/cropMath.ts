// Pure geometry for the photo editor. Each helper is a worklet, so the editor's
// gestures can call them on the UI thread.

export type Size = { width: number; height: number };

export type Rect = { x: number; y: number; width: number; height: number };

/** The image's zoom and offset from its fitted position. */
export type CropView = {
  scale: number;
  translateX: number;
  translateY: number;
};

export type Corner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export type PixelCrop = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export const MAX_ZOOM = 4;
export const MIN_CROP_SIZE = 56;
export const INITIAL_VIEW: CropView = {
  scale: 1,
  translateX: 0,
  translateY: 0,
};

const FULL_FRAME_TOLERANCE = 0.002;

function clamp(value: number, min: number, max: number): number {
  'worklet';
  if (min > max) return (min + max) / 2;
  return value < min ? min : value > max ? max : value;
}

/** Quarter turns clockwise, normalized to 0-3. */
export function normalizeTurns(quarterTurns: number): number {
  'worklet';
  return ((quarterTurns % 4) + 4) % 4;
}

export function rotatedSize(size: Size, quarterTurns: number): Size {
  'worklet';
  return normalizeTurns(quarterTurns) % 2 === 1
    ? { width: size.height, height: size.width }
    : { width: size.width, height: size.height };
}

/** The largest rect with `content`'s aspect ratio centred inside `frame`. */
export function fitRect(content: Size, frame: Rect): Rect {
  'worklet';
  if (content.width <= 0 || content.height <= 0) return { ...frame };
  const scale = Math.min(
    frame.width / content.width,
    frame.height / content.height,
  );
  const width = content.width * scale;
  const height = content.height * scale;
  return {
    x: frame.x + (frame.width - width) / 2,
    y: frame.y + (frame.height - height) / 2,
    width,
    height,
  };
}

export function insetRect(rect: Rect, inset: number): Rect {
  'worklet';
  return {
    x: rect.x + inset,
    y: rect.y + inset,
    width: Math.max(0, rect.width - inset * 2),
    height: Math.max(0, rect.height - inset * 2),
  };
}

export function intersectRect(a: Rect, b: Rect): Rect {
  'worklet';
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x),
    height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y),
  };
}

/** Where the image sits once `view` is applied to its fitted rect `base`. */
export function imageRect(base: Rect, view: CropView): Rect {
  'worklet';
  const width = base.width * view.scale;
  const height = base.height * view.scale;
  return {
    x: base.x + base.width / 2 + view.translateX - width / 2,
    y: base.y + base.height / 2 + view.translateY - height / 2,
    width,
    height,
  };
}

/** Keeps the zoom in range and the image covering the crop box. */
export function clampView(base: Rect, view: CropView, crop: Rect): CropView {
  'worklet';
  const minScale = Math.max(
    1,
    crop.width / base.width,
    crop.height / base.height,
  );
  const scale = clamp(view.scale, minScale, Math.max(minScale, MAX_ZOOM));
  const width = base.width * scale;
  const height = base.height * scale;
  const centreX = base.x + base.width / 2;
  const centreY = base.y + base.height / 2;
  return {
    scale,
    translateX: clamp(
      view.translateX,
      crop.x + crop.width - centreX - width / 2,
      crop.x - centreX + width / 2,
    ),
    translateY: clamp(
      view.translateY,
      crop.y + crop.height - centreY - height / 2,
      crop.y - centreY + height / 2,
    ),
  };
}

/** Zooms to `scale`, keeping the point under the crop box's centre in place. */
export function zoomView(
  base: Rect,
  view: CropView,
  crop: Rect,
  scale: number,
): CropView {
  'worklet';
  const clamped = clampView(base, { ...view, scale }, crop).scale;
  const ratio = clamped / view.scale;
  const anchorX = crop.x + crop.width / 2 - (base.x + base.width / 2);
  const anchorY = crop.y + crop.height / 2 - (base.y + base.height / 2);
  return clampView(
    base,
    {
      scale: clamped,
      translateX: anchorX + (view.translateX - anchorX) * ratio,
      translateY: anchorY + (view.translateY - anchorY) * ratio,
    },
    crop,
  );
}

/** Drags one corner of `start` by (dx, dy), staying inside `bounds`. */
export function resizeCrop(
  start: Rect,
  corner: Corner,
  dx: number,
  dy: number,
  bounds: Rect,
): Rect {
  'worklet';
  const minWidth = Math.min(MIN_CROP_SIZE, start.width);
  const minHeight = Math.min(MIN_CROP_SIZE, start.height);
  let left = start.x;
  let top = start.y;
  let right = start.x + start.width;
  let bottom = start.y + start.height;

  if (corner === 'topLeft' || corner === 'bottomLeft') {
    left = clamp(left + dx, Math.min(bounds.x, left), right - minWidth);
  } else {
    right = clamp(
      right + dx,
      left + minWidth,
      Math.max(bounds.x + bounds.width, right),
    );
  }

  if (corner === 'topLeft' || corner === 'topRight') {
    top = clamp(top + dy, Math.min(bounds.y, top), bottom - minHeight);
  } else {
    bottom = clamp(
      bottom + dy,
      top + minHeight,
      Math.max(bounds.y + bounds.height, bottom),
    );
  }

  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** The crop box as fractions (0-1) of the displayed image. */
export function cropFraction(crop: Rect, image: Rect): Rect {
  'worklet';
  if (image.width <= 0 || image.height <= 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }
  const x = clamp((crop.x - image.x) / image.width, 0, 1);
  const y = clamp((crop.y - image.y) / image.height, 0, 1);
  return {
    x,
    y,
    width: clamp(crop.width / image.width, 0, 1 - x),
    height: clamp(crop.height / image.height, 0, 1 - y),
  };
}

export function isFullFrame(fraction: Rect): boolean {
  'worklet';
  return (
    fraction.x <= FULL_FRAME_TOLERANCE &&
    fraction.y <= FULL_FRAME_TOLERANCE &&
    fraction.width >= 1 - FULL_FRAME_TOLERANCE * 2 &&
    fraction.height >= 1 - FULL_FRAME_TOLERANCE * 2
  );
}

/** A fractional crop in whole pixels, always inside the image. */
export function toPixelCrop(fraction: Rect, pixels: Size): PixelCrop {
  'worklet';
  const originX = clamp(
    Math.round(fraction.x * pixels.width),
    0,
    Math.max(0, pixels.width - 1),
  );
  const originY = clamp(
    Math.round(fraction.y * pixels.height),
    0,
    Math.max(0, pixels.height - 1),
  );
  return {
    originX,
    originY,
    width: clamp(
      Math.round(fraction.width * pixels.width),
      1,
      Math.max(1, pixels.width - originX),
    ),
    height: clamp(
      Math.round(fraction.height * pixels.height),
      1,
      Math.max(1, pixels.height - originY),
    ),
  };
}
