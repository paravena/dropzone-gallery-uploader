import React, { forwardRef, ForwardRefRenderFunction } from 'react';
import clsx from 'clsx';
import { FileInputItem, IExtra, IMediaFile, ResolveFn } from '../utils';
import Preview from './preview/Preview.tsx';
import Input from './Input';
import DropzoneOverlay from './DropzoneOverlay.tsx';

type Props = {
  active: boolean;
  extra: IExtra;
  files: IMediaFile[];
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
  onSelectedFile: (file: IMediaFile) => void;
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
    <section
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
              mediaFile={f}
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
        <DropzoneOverlay show={files.length > 0 && active} />
      </div>
    </section>
  );
};

const Layout = forwardRef(LayoutComponent);
export default Layout;
