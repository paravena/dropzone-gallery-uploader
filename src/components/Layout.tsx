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
  onSelectedFile: (file: IFileWithMeta) => void;
  disabledSelection: boolean;
};

const LayoutComponent: ForwardRefRenderFunction<HTMLDivElement, Props> = (
  {
    active,
    canCancel,
    canRestart,
    canRemove,
    dropzoneProps,
    files,
    onChange,
    onSelectedFile,
    disabledSelection,
  },
  ref,
) => {
  const classNames = clsx('flex w-full', {
    'flex-wrap gap-4 flex-grow flex-shrink items-start': files.length > 0,
    'justify-center items-center h-full': files.length === 0,
  });

  return (
    <div
      className={clsx(
        'relative h-full w-full overflow-hidden bg-gray-200 p-3',
        {
          'rounded-md border-2 border-solid border-blue-400': active,
        },
      )}
      {...dropzoneProps}
    >
      <div ref={ref} className={classNames}>
        <Input visible={files.length === 0} onChange={onChange} />
        {files.map(f => {
          return (
            <Preview
              key={f.id}
              fileWithMeta={f}
              canCancel={canCancel}
              canRemove={canRemove}
              canRestart={canRestart}
              onSelected={mediaFile => {
                onSelectedFile(mediaFile);
              }}
              disabled={disabledSelection}
            />
          );
        })}
        <Transition
          show={files.length > 0 && active}
          as={Fragment}
          enter="transform ease-out duration-300 transition"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="absolute left-2/4 top-2/4 z-10 flex -translate-x-1/2 -translate-y-1/2 transform flex-col items-center justify-center rounded-md border-2 border-solid border-blue-400 bg-gray-300 px-10 py-8 text-sm">
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
