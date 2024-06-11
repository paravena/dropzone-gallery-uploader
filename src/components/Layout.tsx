import React, { forwardRef, ForwardRefRenderFunction, Fragment } from 'react';
import clsx from 'clsx';
import { FileInputItem, IExtra, IFileWithMeta, ResolveFn } from '../utils';
import Preview from './Preview';
import Input from './Input';
import { Transition } from '@headlessui/react';
import { ArrowUpTrayIcon } from '@heroicons/react/20/solid';

type Props = {
  active: boolean;
  extra: IExtra;
  files: IFileWithMeta[];
  canCancel: boolean | ResolveFn<boolean>;
  canRemove: boolean | ResolveFn<boolean>;
  canRestart: boolean | ResolveFn<boolean>;
  dropzoneProps: {
    onDragEnter(event: React.DragEvent<HTMLElement>): void;
    onDragOver(event: React.DragEvent<HTMLElement>): void;
    onDragLeave(event: React.DragEvent<HTMLElement>): void;
    onDrop(event: React.DragEvent<HTMLElement>): void;
  };
  onChange: (files: FileInputItem[]) => void;
};

const LayoutComponent: ForwardRefRenderFunction<HTMLDivElement, Props> = (
  {
    active,
    canCancel,
    canRestart,
    canRemove,
    dropzoneProps,
    extra,
    files,
    onChange,
  },
  ref,
) => {
  const classNames = clsx('h-full w-full', {
    'flex flex-wrap gap-4': files.length > 0,
    'flex justify-center items-center': files.length === 0,
    'border-2 border-solid border-blue-400 rounded-md': active,
  });

  return (
    <div className="relative h-dvh bg-gray-400 p-3">
      <div ref={ref} className={classNames} {...dropzoneProps}>
        <Input visible={files.length === 0} onChange={onChange} />
        {files.map(f => {
          return (
            <Preview
              key={f.meta.id}
              fileWithMeta={f}
              meta={{ ...f.meta }}
              isUpload={true}
              canCancel={canCancel}
              canRemove={canRemove}
              canRestart={canRestart}
              extra={extra}
            />
          );
        })}
        <Transition
          show={files.length > 0 && active}
          as={Fragment}
          enter="transform ease-out duration-300 transition"
          enterFrom="translate-y-2 opacity-0 sm:translate-y-0"
          enterTo="translate-y-0 opacity-100 sm:translate-y-0"
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="absolute left-2/4 top-2/4 z-10 flex -translate-x-2/4 -translate-y-2/4 transform flex-col items-center justify-center rounded-md border-2 border-solid border-blue-400 bg-gray-300 px-10 py-8 text-sm">
            <ArrowUpTrayIcon className="h-8 w-8" />
            <p>Drop files to upload</p>
            <p>JPEG, PNG, HEIF, WEBP, AVIF, or SVG files</p>
          </div>
        </Transition>
      </div>
    </div>
  );
};

const Layout = forwardRef(LayoutComponent);
export default Layout;
