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
  const classNames = clsx('', {
    'grid h-full w-full grid-cols-2 grid-flow-row gap-4 md:grid-cols-3':
      files.length > 0,
    'flex justify-center items-center': files.length === 0,
    'border-2 border-dashed border-amber-400': active,
  });

  return (
    <div className="relative bg-amber-200 p-3">
      <div ref={ref} className={classNames} {...dropzoneProps}>
        <Input visible={files.length === 0} onChange={onChange} />
        {files.map(f => {
          return (
            <Preview
              className={''}
              imageClassName={''}
              style={{}}
              imageStyle={{}}
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
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center bg-gray-300 p-2 text-sm">
            Drop files here to upload&nbsp;
            <ArrowUpTrayIcon className="h-4 w-4" />
          </div>
        </Transition>
      </div>
    </div>
  );
};

const Layout = forwardRef(LayoutComponent);
export default Layout;
