import { useState } from 'react';
import {
  formatBytes,
  formatDuration,
  IFileWithMeta,
  isErrorStatus,
  ResolveFn,
  StatusValue,
} from '../utils';
import ProgressBar from './ProgressBar.tsx';
import { TrashIcon } from '@heroicons/react/20/solid';
import PreviewTopBar from './PreviewTopBar.tsx';
import { useDropzone } from '../hooks/useDropzone.ts';

type Props = {
  fileWithMeta: IFileWithMeta;
  canCancel: boolean | ResolveFn<boolean>;
  canRemove: boolean | ResolveFn<boolean>;
  canRestart: boolean | ResolveFn<boolean>;
  onSelected?: (file: IFileWithMeta) => void;
  disabled: boolean;
};

const Preview = ({ fileWithMeta, canCancel, canRemove, canRestart }: Props) => {
  const [showTopBar, setShowTopBar] = useState(false);
  const {
    previewUrl,
    cancel,
    remove,
    restart,
    name,
    percent = 0,
    status,
  } = fileWithMeta;

  const { size = 0, duration, type, width, height } = fileWithMeta.meta;

  const { toggleSelectFile } = useDropzone();

  const isImage = type.startsWith('image/');
  const isVideo = type.startsWith('video/');

  let title = `${name || '?'}, ${formatBytes(size)}`;
  if (duration) title = `${title}, ${formatDuration(duration)}`;

  if (isErrorStatus(status)) {
    return null;
  }

  if (status === StatusValue.Aborted) title = `${title} (cancelled)`;

  return (
    <div
      className="relative h-56 w-64"
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
      {isImage && (
        <img
          className="h-full w-full rounded-lg object-cover"
          src={previewUrl}
          alt={title}
          title={title}
          width={width}
          height={height}
        />
      )}
      {isVideo && (
        <video
          src={previewUrl}
          width={width}
          height={height}
          controls
          className="h-full w-full rounded-lg object-cover"
        >
          <source src={previewUrl} type={type} />
        </video>
      )}
      {!previewUrl && !isVideo && (
        <span className="text-sm text-gray-600">{title}</span>
      )}
      <ProgressBar
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
