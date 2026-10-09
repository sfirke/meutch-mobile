/** A photo on the item form: one already on the server, or one picked locally. */
export type PhotoDraft =
  | { kind: 'existing'; id: string; url: string | null }
  | { kind: 'new'; key: string; uri: string };

/** The backend rejects more than this many images per item. */
export const MAX_ITEM_PHOTOS = 8;
