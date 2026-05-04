// Shared error class for the video pipeline. Every typed code lines up with an
// i18n key under `videoErrors.*` in the locale bundles, so callers can render a
// localized message via `t('videoErrors.' + err.code, err.params)`.
//
// The pipeline must surface enough context for the user to recover: when a
// duration limit is hit, the rejection message should include the workspace's
// configured limit. Pass that context via the `params` constructor argument.

export type VideoPipelineErrorCode =
  | 'PERMISSION_DENIED'
  | 'FILE_NOT_FOUND'
  | 'DURATION_TOO_LONG'
  | 'FILE_TOO_LARGE'
  | 'ASPECT_RATIO_INVALID'
  | 'UNREADABLE'
  | 'CANCELLED'
  // FULL-mode upload boundary errors. These map to the same i18n surface as
  // the validation codes so banners and toasts can render them without
  // special casing.
  | 'SIGN_FAILED'
  | 'UPLOAD_FAILED'
  | 'UPLOAD_REJECTED'
  | 'NETWORK'
  | 'GENERIC';

export type VideoPipelineErrorParams = Readonly<Record<string, string | number>>;

export class VideoPipelineError extends Error {
  public readonly code: VideoPipelineErrorCode;
  public readonly params: VideoPipelineErrorParams;

  constructor(code: VideoPipelineErrorCode, params: VideoPipelineErrorParams = {}) {
    super(code);
    this.name = 'VideoPipelineError';
    this.code = code;
    this.params = params;
    Object.setPrototypeOf(this, VideoPipelineError.prototype);
  }
}

export function isVideoPipelineError(err: unknown): err is VideoPipelineError {
  return err instanceof VideoPipelineError;
}

// Maps a thrown error to the canonical i18n key for callers.
export function videoErrorI18nKey(err: unknown): string {
  if (isVideoPipelineError(err)) {
    return `videoErrors.${err.code}`;
  }
  return 'videoErrors.GENERIC';
}
