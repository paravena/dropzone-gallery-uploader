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
  type: string; // MIME type, example: `image/*`
  size: number; // bytes
  duration?: number; // seconds
  width?: number;
  height?: number;
  validationError?: unknown;
}

export interface IFileWithMeta {
  id: string;
  name: string;
  file?: File;
  status: StatusValue;
  percent: number;
  selected: boolean;
  meta: IMeta;
  xhr?: XMLHttpRequest;
  cancel: () => void;
  restart: () => void;
  remove: () => void;
  previewUrl?: string;
  uploadedUrl?: string;
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
