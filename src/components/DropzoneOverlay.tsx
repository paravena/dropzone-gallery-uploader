import React from 'react';
import { Transition } from '@headlessui/react';
import { ArrowUpTrayIcon } from '@heroicons/react/20/solid';

type DropzoneOverlayProps = {
  show: boolean;
};

const DropzoneOverlay: React.FC<DropzoneOverlayProps> = ({ show }) => {
  return (
    <Transition
      show={show}
      as={React.Fragment}
      enter="transform ease-out duration-300 transition"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 transform flex-col items-center justify-center rounded-md border-2 border-solid border-blue-400 bg-gray-300 px-10 py-8 text-sm">
        <ArrowUpTrayIcon className="h-8 w-8" />
        <p>Drop files to upload</p>
        <p>JPEG, PNG, HEIF, WEBP, AVIF, or SVG files</p>
      </div>
    </Transition>
  );
};

export default DropzoneOverlay;
