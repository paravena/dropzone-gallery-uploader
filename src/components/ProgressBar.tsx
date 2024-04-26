import { ResolveFn, StatusValue } from '../utils';

import { Transition } from '@headlessui/react';
import { Fragment, useEffect, useState } from 'react';
import { XMarkIcon, PlayIcon, PauseIcon } from '@heroicons/react/20/solid';

type Props = {
  isUpload: boolean;
  percent: number;
  canCancel: boolean | ResolveFn<boolean>;
  status: StatusValue;
  canRemove: boolean | ResolveFn<boolean>;
  canRestart: boolean | ResolveFn<boolean>;
  cancel: ResolveFn<void>;
  remove: ResolveFn<void>;
  restart: ResolveFn<void>;
};

const ProgressBar = ({
  isUpload,
  cancel,
  remove,
  restart,
  canRestart,
  canRemove,
  canCancel,
  status,
  percent,
}: Props) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (percent === 100) {
      setShow(false);
    }
  }, [percent]);

  return (
    <Transition
      show={show}
      as={Fragment}
      enter="transform ease-out duration-300 transition"
      enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enterTo="translate-y-0 opacity-100 sm:translate-x-0"
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 transform items-center rounded-lg bg-white p-2 shadow-lg ring-1 ring-white ring-opacity-5">
        {isUpload && (
          <progress
            max={100}
            value={
              status === StatusValue.Done ||
              status === StatusValue.HeadersReceived
                ? 100
                : percent
            }
            className="progress-unfilled:bg-gray-200 progress-filled:bg-gray-400 progress-unfilled:rounded-full progress-filled:rounded-full h-2"
          />
        )}

        {status === StatusValue.Uploading && canCancel && (
          <button
            type="button"
            className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={cancel}
          >
            <PauseIcon className="h-4 w-4" />
          </button>
        )}
        {status !== StatusValue.Preparing &&
          status !== StatusValue.GettingUploadParams &&
          status !== StatusValue.Uploading &&
          canRemove && (
            <button
              type="button"
              className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={remove}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        {[
          StatusValue.ErrorUploadParams,
          StatusValue.ExceptionUpload,
          StatusValue.ErrorUpload,
          StatusValue.Aborted,
          StatusValue.Ready,
        ].includes(status) &&
          canRestart && (
            <button
              type="button"
              className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={restart}
            >
              <PlayIcon className="h-4 w-4" />
            </button>
          )}
      </div>
    </Transition>
  );
};

export default ProgressBar;
