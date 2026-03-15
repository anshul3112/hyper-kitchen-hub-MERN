export const MAX_TEXT_LENGTH = 100;

export function trimToMaxLength(value: string, maxLength = MAX_TEXT_LENGTH): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

export function isAtTextLimit(value: string, maxLength = MAX_TEXT_LENGTH): boolean {
  return value.length >= maxLength;
}
