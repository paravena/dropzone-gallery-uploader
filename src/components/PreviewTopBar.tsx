import { Fragment, ReactNode } from 'react';
import { Transition } from '@headlessui/react';

type Props = {
  children: ReactNode;
  show: boolean;
};

const PreviewTopBar = ({ children, show }: Props) => {
  console.log('one');
  setTimeout(() => {
    console.log('two');
  }, 1000);
  console.log('three');
  return (
    <Transition
      show={show}
      as={Fragment}
      enter="transform ease-out duration-300 transition"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="absolute top-0 z-10 flex w-full items-center justify-end gap-1 rounded-t-lg bg-white p-2 px-2 py-1 opacity-70 shadow-lg ring-1 ring-white ring-opacity-5">
        {children}
      </div>
    </Transition>
  );
};

export default PreviewTopBar;
