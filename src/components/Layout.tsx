import React, { forwardRef, ForwardRefRenderFunction } from 'react';
import { IExtra, IFileWithMeta, ResolveFn } from '../utils';
import Preview from './Preview.tsx';

type Props = {
  dropzoneProps: {
    onDragEnter(event: React.DragEvent<HTMLElement>): void;
    onDragOver(event: React.DragEvent<HTMLElement>): void;
    onDragLeave(event: React.DragEvent<HTMLElement>): void;
    onDrop(event: React.DragEvent<HTMLElement>): void;
  };
  files: IFileWithMeta[];
  canCancel: boolean | ResolveFn<boolean>;
  canRemove: boolean | ResolveFn<boolean>;
  canRestart: boolean | ResolveFn<boolean>;
  extra: IExtra;
};

const LayoutComponent: ForwardRefRenderFunction<HTMLDivElement, Props> = (
  { dropzoneProps, files, canCancel, canRestart, canRemove, extra },
  ref,
) => {
  return (
    <div
      ref={ref}
      className="grid h-full w-full grid-cols-2 gap-4 bg-amber-200 p-6 md:grid-cols-3"
      {...dropzoneProps}
    >
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
    </div>
  );
};

const Layout = forwardRef(LayoutComponent);
export default Layout;
