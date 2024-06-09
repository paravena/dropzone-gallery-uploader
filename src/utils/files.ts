import React from 'react';
import {
  HttpMethod,
  IFileWithMeta,
  IUploadParams,
  StatusValue,
} from './types.ts';
import { v4 as uuid } from 'uuid';

export type FileInputEvent =
  | React.DragEvent<HTMLElement>
  | React.ChangeEvent<HTMLInputElement>;

export type FileInputItem = DataTransferItem | File;

const getFilesFromDragEvent = (dt: DataTransfer) => {
  let items = null;
  if ('files' in dt && dt.files.length) {
    items = dt.files;
  } else if (dt.items && dt.items.length) {
    items = dt.items;
  }
  return castDataToFilesArray(items);
};

const getFilesFromChangeEvent = (target: HTMLInputElement) =>
  target && target.files ? castDataToFilesArray(target.files) : [];

const castDataToFilesArray = (
  items: DataTransferItemList | FileList | null,
) => {
  if (items instanceof DataTransferItemList) {
    return Array.from(items) as DataTransferItem[];
  } else if (items instanceof FileList) {
    return Array.from(items) as File[];
  }
  return [];
};

export const getFilesFromEvent = (event: FileInputEvent): FileInputItem[] => {
  let items = [] as FileInputItem[];
  if ('dataTransfer' in event) {
    items = getFilesFromDragEvent(event.dataTransfer);
  } else if (event.target && event.target.files) {
    items = getFilesFromChangeEvent(event.target);
  }
  return items;
};

// adapted from: https://github.com/okonet/attr-accept/blob/master/src/index.js
// returns true if file.name is empty and accept string is something like ".csv",
// because file comes from dataTransferItem for drag events, and
// dataTransferItem.name is always empty
export const accepts = (file: File, accept: string) => {
  if (!accept || accept === '*') return true;

  const mimeType = file.type || '';
  const baseMimeType = mimeType.replace(/\/.*$/, '');

  return accept
    .split(',')
    .map(t => t.trim())
    .some(type => {
      if (type.charAt(0) === '.') {
        return (
          file.name === undefined ||
          file.name.toLowerCase().endsWith(type.toLowerCase())
        );
      } else if (type.endsWith('/*')) {
        // this is something like an image/* mime type
        return baseMimeType === type.replace(/\/.*$/, '');
      }
      return mimeType === type;
    });
};

export const getFile = (item: FileInputItem) => {
  return item instanceof DataTransferItem ? item.getAsFile() : (item as File);
};

export const mapFileToFileWithMeta = (file: File) => {
  const { name, size, type, lastModified } = file;
  const uploadedDate = new Date().toISOString();
  const lastModifiedDate = lastModified && new Date(lastModified).toISOString();
  const id = `item-${uuid()}`;
  return {
    file,
    id,
    meta: {
      name,
      size,
      type,
      lastModifiedDate,
      uploadedDate,
      percent: 0,
      status: StatusValue.Ready,
      id,
    },
  } as IFileWithMeta;
};

export const mapFileInputItemToFile = (item: FileInputItem) => {
  return getFile(item);
};

export const generatePreview = async (fileWithMeta: IFileWithMeta) => {
  const {
    meta: { type },
    file,
  } = fileWithMeta;
  const isImage = type.startsWith('image/');
  const isAudio = type.startsWith('audio/');
  const isVideo = type.startsWith('video/');

  if (!isImage && !isAudio && !isVideo) return;

  const objectUrl = URL.createObjectURL(file);

  const fileCallbackToPromise = (
    fileObj: HTMLImageElement | HTMLAudioElement | HTMLVideoElement,
  ) => {
    return Promise.race([
      new Promise(resolve => {
        if (fileObj instanceof HTMLImageElement) {
          fileObj.onload = resolve;
        } else {
          fileObj.onloadedmetadata = resolve;
        }
      }),
      new Promise((_, reject) => {
        setTimeout(reject, 100000);
      }),
    ]);
  };

  try {
    if (isImage) {
      const img = new Image();
      img.src = objectUrl;
      fileWithMeta.meta.previewUrl = objectUrl;
      await fileCallbackToPromise(img);
      fileWithMeta.meta.width = img.width;
      fileWithMeta.meta.height = img.height;
    }

    if (isAudio) {
      const audio = new Audio();
      audio.src = objectUrl;
      await fileCallbackToPromise(audio);
      fileWithMeta.meta.duration = audio.duration;
    }

    if (isVideo) {
      const video = document.createElement('video');
      video.src = objectUrl;
      fileWithMeta.meta.videoUrl = objectUrl;
      await fileCallbackToPromise(video);
      fileWithMeta.meta.duration = video.duration;
      fileWithMeta.meta.videoWidth = video.videoWidth;
      fileWithMeta.meta.videoHeight = video.videoHeight;
    }
  } catch (e) {
    URL.revokeObjectURL(objectUrl);
  } finally {
    if (!(isVideo || isImage)) {
      URL.revokeObjectURL(objectUrl);
    }
  }
};

export class FileUploader {
  constructor(private params: IUploadParams) {}
  upload(fileWithMeta: IFileWithMeta, fileUpload: IFileUpload) {
    const {
      url,
      body,
      fields = {},
      headers = {},
      meta: extraMeta = {},
      method = HttpMethod.POST,
      timeout = 100000,
    } = this.params;

    if (!url) {
      fileUpload.onError(StatusValue.ErrorUploadParams);
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);

    const formData = new FormData();
    for (const [fieldName, fieldValue] of Object.entries(fields)) {
      formData.append(fieldName, fieldValue);
    }

    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    for (const [headerName, headerValue] of Object.entries(headers)) {
      xhr.setRequestHeader(headerName, headerValue);
    }

    delete extraMeta.status;
    fileWithMeta.meta = { ...fileWithMeta.meta, ...extraMeta };

    xhr.upload.addEventListener('progress', event => {
      fileUpload.onProgress(event);
    });

    xhr.addEventListener('readystatechange', () => {
      const { readyState, status } = xhr;
      const { ExceptionUpload, HeadersReceived, Done, ErrorUpload } =
        StatusValue;
      const isIntermediateState = readyState === 2 || readyState === 4;
      const isStatusError = status >= 400;
      // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/readyState
      if (!isIntermediateState) return;
      if (
        xhr.status === 0 &&
        fileWithMeta.meta.status !== StatusValue.Aborted
      ) {
        fileUpload.onError(ExceptionUpload);
      }
      if (xhr.status > 0 && xhr.status < 400) {
        const status = readyState === 2 ? HeadersReceived : Done;
        fileUpload.onChangeStatus(status);
      } else if (isStatusError && fileWithMeta.meta.status !== ErrorUpload) {
        fileUpload.onChangeStatus(ErrorUpload);
      }
    });
    formData.append('file', fileWithMeta.file);
    if (timeout) xhr.timeout = timeout;
    xhr.send(body || formData);
    fileWithMeta.xhr = xhr;
    fileUpload.onChangeStatus(StatusValue.Uploading);
  }
}

export interface IFileUpload {
  onChangeStatus(status: StatusValue): void;
  onProgress(event: ProgressEvent): void;
  onError(status: StatusValue): void;
}
