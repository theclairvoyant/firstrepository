// Public barrel for the video pipeline. Importers should always go through
// this entry rather than reaching into individual files.

export { VideoPipelineError, isVideoPipelineError, videoErrorI18nKey } from './errors';
export type { VideoPipelineErrorCode, VideoPipelineErrorParams } from './errors';

export { pickVideoFromGallery } from './pickFromGallery';
export type { PickedAsset, PickOptions } from './pickFromGallery';

export {
  requestCameraPermission,
  requestMicrophonePermission,
  finalizeCameraResult,
} from './recordWithCamera';
export type { CameraRecordingResult } from './recordWithCamera';

export { validateMedia } from './validateMedia';
export type { ValidatedAsset } from './validateMedia';

export { uploadVideo } from './uploader';
export type {
  UploaderProgress,
  UploadResult,
  UploadOptions,
} from './uploader';

export { runUpload, enqueueWaitingWifi, resumeUpload } from './uploadDriver';
export type {
  RunUploadInput,
  RunUploadHandle,
  EnqueueWaitingWifiInput,
} from './uploadDriver';
