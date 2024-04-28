import React from 'react';
import {
  formatBytes,
  formatDuration,
  IExtra,
  IFileWithMeta,
  IMeta,
  ResolveFn,
  StatusValue,
} from '../utils';
import ProgressBar from './ProgressBar.tsx';
import { XMarkIcon } from '@heroicons/react/20/solid';

type Props = {
  extra: IExtra;
  meta: IMeta;
  className?: string;
  imageClassName?: string;
  style?: React.CSSProperties;
  imageStyle?: React.CSSProperties;
  fileWithMeta: IFileWithMeta;
  isUpload: boolean;
  canCancel: boolean | ResolveFn<boolean>;
  canRemove: boolean | ResolveFn<boolean>;
  canRestart: boolean | ResolveFn<boolean>;
};

const Preview = ({
  extra: { minSizeBytes },
  meta: {
    name = '',
    percent = 0,
    size = 0,
    previewUrl,
    videoUrl,
    status,
    duration,
    validationError,
    videoHeight,
    videoWidth,
    type,
  },
  className,
  style,
  imageStyle,
  fileWithMeta: { cancel, remove, restart },
  canCancel,
  canRemove,
  canRestart,
  isUpload,
}: Props) => {
  let title = `${name || '?'}, ${formatBytes(size)}`;
  if (duration) title = `${title}, ${formatDuration(duration)}`;
  if (
    status === StatusValue.ErrorFileSize ||
    status === StatusValue.ErrorValidation
  ) {
    return (
      <div className={className} style={style}>
        <span className="dzu-previewFileNameError">{title}</span>
        {status === 'error_file_size' && (
          <span>{size < minSizeBytes ? 'File too small' : 'File too big'}</span>
        )}
        {status === 'error_validation' && (
          <span>{String(validationError)}</span>
        )}
        {/*{canRemove && (*/}
        {/*  <span*/}
        {/*    className="dzu-previewButton"*/}
        {/*    style={iconByFn.remove}*/}
        {/*    onClick={remove}*/}
        {/*  />*/}
        {/*)}*/}
      </div>
    );
  }

  if (
    status === StatusValue.ErrorUploadParams ||
    status === StatusValue.ExceptionUpload ||
    status === StatusValue.ErrorUpload
  ) {
    title = `${title} (upload failed)`;
  }
  if (status === StatusValue.Aborted) title = `${title} (cancelled)`;

  return (
    <div className="relative">
      <button
        type="button"
        className="absolute right-3 top-3 z-10 inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        onClick={remove}
      >
        <XMarkIcon className="h-6 w-6" />
      </button>
      {previewUrl && (
        <img
          className="h-auto max-w-full rounded-lg"
          style={imageStyle}
          src={previewUrl}
          alt={title}
          title={title}
        />
      )}
      {videoUrl && (
        <video src={videoUrl} width={videoWidth} height={videoHeight} controls>
          <source src={videoUrl} type={type} />
        </video>
      )}
      {!previewUrl && !videoUrl && (
        <span className="text-sm text-gray-600">{title}</span>
      )}
      <ProgressBar
        isUpload={isUpload}
        percent={percent}
        canCancel={canCancel}
        status={status}
        canRemove={canRemove}
        canRestart={canRestart}
        cancel={cancel}
        remove={remove}
        restart={restart}
      />
    </div>
  );
};

export default Preview;
