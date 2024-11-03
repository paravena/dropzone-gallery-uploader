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
  if (dt.files && dt.files.length > 0) {
    items = dt.files;
  } else if (dt.items && dt.items.length > 0) {
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
  const { name, size, type } = file;
  const id = `item-${uuid()}`;
  return {
    file,
    id,
    name,
    status: StatusValue.Ready,
    percent: 0,
    meta: {
      size,
      type,
    },
  } as IFileWithMeta;
};

export const mapFileInputItemToFile = (item: FileInputItem) => {
  return getFile(item);
};

export const generatePreview = async (
  fileWithMeta: Required<IFileWithMeta>,
) => {
  const {
    meta: { type },
    file,
  } = fileWithMeta;

  const isImage = type.startsWith('image/');
  const isAudio = type.startsWith('audio/');
  const isVideo = type.startsWith('video/');
  const isHeicImage = isHeicFile(fileWithMeta);

  if (!isImage && !isAudio && !isVideo) return;

  let objectUrl = URL.createObjectURL(file);

  if (isHeicImage && window !== undefined) {
    // HACK for supporting HEIC format
    const { default: heic2any } = await import('heic2any');
    const blobRes = await fetch(objectUrl);
    const blob = await blobRes.blob();
    const conversionResult = await heic2any({ blob });
    objectUrl = URL.createObjectURL(conversionResult as Blob);
  }

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
      await fileCallbackToPromise(img);
      fileWithMeta.previewUrl = objectUrl;
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
      await fileCallbackToPromise(video);
      fileWithMeta.previewUrl = objectUrl;
      fileWithMeta.meta.duration = video.duration;
      fileWithMeta.meta.width = video.videoWidth;
      fileWithMeta.meta.height = video.videoHeight;
    }
  } catch (e) {
    URL.revokeObjectURL(objectUrl);
  } finally {
    if (!(isVideo || isImage)) {
      URL.revokeObjectURL(objectUrl);
    }
  }
};

export interface IFileUpload {
  onChangeStatus(status: StatusValue): void;
  onProgress(event: ProgressEvent): void;
  onError(status: StatusValue): void;
}

export class FileUploader<T> {
  constructor(private params: IUploadParams) {}

  upload(fileWithMeta: Required<IFileWithMeta>, fileUpload: IFileUpload) {
    const {
      url,
      fields = {},
      headers = {},
      meta: extraMeta = {},
      method = HttpMethod.POST,
      timeout = 100000,
    } = this.params;

    return new Promise<T>((resolve, reject) => {
      if (!url) {
        fileUpload.onError(StatusValue.ErrorUploadParams);
        reject(new Error('URL not provided'));
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
        const { readyState, status, responseText } = xhr;
        const { ExceptionUpload, HeadersReceived, Done, ErrorUpload } =
          StatusValue;
        const isIntermediateState = readyState === 2 || readyState === 4;
        const isStatusError = status >= 400;
        // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/readyState
        if (!isIntermediateState) return;
        if (xhr.status === 0 && fileWithMeta.status !== StatusValue.Aborted) {
          fileUpload.onError(ExceptionUpload);
        }
        if (xhr.status > 0 && xhr.status < 400) {
          const status = readyState === 2 ? HeadersReceived : Done;
          fileUpload.onChangeStatus(status);
          if (xhr.status === 200) {
            if (responseText && responseText.trim() !== '') {
              try {
                resolve(JSON.parse(responseText));
              } catch (e) {
                reject(new Error('Failed to parse JSON'));
              }
            }
          }
        } else if (isStatusError && fileWithMeta.status !== ErrorUpload) {
          fileUpload.onChangeStatus(ErrorUpload);
          reject(new Error('Upload failed'));
        }
      });
      // formData.append('data', fileWithMeta.file);
      if (timeout) xhr.timeout = timeout;
      xhr.send(new Blob([fileWithMeta.file], { type: fileWithMeta.file.type }));
      fileWithMeta.xhr = xhr;
      fileUpload.onChangeStatus(StatusValue.Uploading);
    });
  }
}

const isHeicFile = ({ name }: { name: string }) => {
  return (
    name.endsWith('.heic') ||
    name.endsWith('.heif') ||
    name.endsWith('.HEIC') ||
    name.endsWith('.HEIF')
  );
};
