export enum StatusValue {
  RejectedFileType = 'rejected_file_type',
  RejectedMaxFiles = 'rejected_max_files',
  Preparing = 'preparing',
  ErrorFileSize = 'error_file_size',
  ErrorValidation = 'error_validation',
  Ready = 'ready',
  Started = 'started',
  GettingUploadParams = 'getting_upload_params',
  ErrorUploadParams = 'error_upload_params',
  Uploading = 'uploading',
  ExceptionUpload = 'exception_upload',
  Aborted = 'aborted',
  Restarted = 'restarted',
  Removed = 'removed',
  ErrorUpload = 'error_upload',
  HeadersReceived = 'headers_received',
  Done = 'done',
}

export interface IMeta {
  id: string;
  status: StatusValue;
  type: string; // MIME type, example: `image/*`
  name: string;
  uploadedDate: string; // ISO string
  percent: number;
  size: number; // bytes
  lastModifiedDate: string; // ISO string
  previewUrl?: string; // from URL.createObjectURL
  duration?: number; // seconds
  width?: number;
  height?: number;
  videoWidth?: number;
  videoHeight?: number;
  validationError?: unknown;
  videoUrl?: string;
}

export interface IFileWithMeta {
  file: File;
  meta: IMeta;
  cancel: () => void;
  restart: () => void;
  remove: () => void;
  xhr?: XMLHttpRequest;
  id: string;
}

export enum HttpMethod {
  DELETE = 'DELETE',
  GET = 'GET',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
  PATCH = 'PATCH',
  POST = 'POST',
  PUT = 'PUT',
}

export interface IUploadParams {
  url: string;
  method?: HttpMethod;
  body?: string | FormData | ArrayBuffer | Blob | File | URLSearchParams;
  fields?: { [name: string]: string | Blob };
  headers?: { [name: string]: string };
  meta?: { [name: string]: unknown };
  timeout?: number;
}

export interface IExtra {
  active: boolean;
  reject: boolean;
  dragged: DataTransferItem[];
  accept: string;
  multiple: boolean;
  minSizeBytes: number;
  maxSizeBytes: number;
  maxFiles: number;
}

export type FilesMap = Record<string, IFileWithMeta>;
