export const WEB_SITE = 'meutch.com';

/** Standard note for an action that only exists on the website. */
export function webOnlyNote(action: string): string {
  return `${action} on ${WEB_SITE}.`;
}
