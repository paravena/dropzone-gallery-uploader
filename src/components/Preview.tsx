import { useState } from 'react';
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
import { TrashIcon } from '@heroicons/react/20/solid';
import PreviewTopBar from './PreviewTopBar.tsx';
import { useDropzone } from '../hooks/useDropzone.ts';

type Props = {
  extra: IExtra;
  meta: IMeta;
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
  fileWithMeta,
  canCancel,
  canRemove,
  canRestart,
  isUpload,
}: Props) => {
  const [showTopBar, setShowTopBar] = useState(false);
  const { cancel, remove, restart } = fileWithMeta;
  const { toggleSelectFile } = useDropzone();
  let title = `${name || '?'}, ${formatBytes(size)}`;
  if (duration) title = `${title}, ${formatDuration(duration)}`;
  if (
    status === StatusValue.ErrorFileSize ||
    status === StatusValue.ErrorValidation
  ) {
    return (
      <div>
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
    <div
      className="relative"
      onMouseEnter={() => setShowTopBar(true)}
      onMouseLeave={() => setShowTopBar(false)}
    >
      <PreviewTopBar show={showTopBar}>
        <input
          name="selectItem"
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
          onClick={() => toggleSelectFile(fileWithMeta)}
        />
        <button
          type="button"
          className="inline-flex rounded-md bg-white text-gray-300 hover:text-indigo-600 focus:outline-none"
          onClick={remove}
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </PreviewTopBar>
      {previewUrl && (
        <img
          className="h-auto max-w-full rounded-lg"
          src={previewUrl}
          alt={title}
          title={title}
        />
      )}
      {videoUrl && (
        <video
          src={videoUrl}
          width={videoWidth}
          height={videoHeight}
          controls
          className="rounded-lg"
        >
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
