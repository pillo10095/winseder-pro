export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;

export const DATE_FORMATS = {
  human: 'MMM dd, yyyy',
  iso: 'yyyy-MM-ddTHH:mm:ss.SSSxxx'
} as const;

export const MILLISECONDS = {
  second: 1_000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000
} as const;
