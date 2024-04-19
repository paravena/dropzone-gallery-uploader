import React from 'react';
import { IFileWithMeta, StatusValue } from './types.ts';
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
    fileObj: HTMLImageElement | HTMLAudioElement,
  ) => {
    return Promise.race([
      new Promise(resolve => {
        if (fileObj instanceof HTMLImageElement) fileObj.onload = resolve;
        else fileObj.onloadedmetadata = resolve;
      }),
      new Promise((_, reject) => {
        setTimeout(reject, 1000);
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
      await fileCallbackToPromise(video);
      fileWithMeta.meta.duration = video.duration;
      fileWithMeta.meta.videoWidth = video.videoWidth;
      fileWithMeta.meta.videoHeight = video.videoHeight;
    }
    if (!isImage) URL.revokeObjectURL(objectUrl);
  } catch (e) {
    URL.revokeObjectURL(objectUrl);
  }
};
