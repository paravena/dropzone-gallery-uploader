import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from './Layout.tsx';
import {
  accepts,
  FileInputItem,
  FilesMap,
  FileUploader,
  filterNonNull,
  generatePreview,
  IExtra,
  IFileWithMeta,
  IUploadParams,
  logError,
  mapFileInputItemToFile,
  mapFileToFileWithMeta,
  ResolveFn,
  resolveValue,
  StatusValue,
} from '../utils';
import useDragState from '../hooks/useDragState.ts';
import DropzoneProvider from './DropzoneProvider.tsx';

export type IDropzoneProps = {
  accept?: string;
  autoUpload?: boolean;
  canCancel?: boolean | ResolveFn<boolean>;
  canRemove?: boolean | ResolveFn<boolean>;
  canRestart?: boolean | ResolveFn<boolean>;
  disabled?: boolean;
  getUploadParams?: (
    file: IFileWithMeta,
  ) => IUploadParams | Promise<IUploadParams>;
  maxFiles: number;
  maxSizeBytes?: number;
  minSizeBytes?: number;
  multiple?: boolean;
  onChangeStatus: (
    file: IFileWithMeta,
    status: StatusValue,
    allFiles: FilesMap,
  ) => { meta: { [name: string]: unknown } } | void;
  onSubmit?: (successFiles: IFileWithMeta[], allFiles: IFileWithMeta[]) => void;
  timeout?: number;
  validate?: (file: IFileWithMeta) => unknown;
};

const Dropzone = ({
  accept = '*',
  autoUpload = true,
  canCancel = true,
  canRemove = true,
  canRestart = true,
  // disabled = false,
  getUploadParams,
  maxFiles,
  maxSizeBytes = Number.MAX_SAFE_INTEGER,
  minSizeBytes = 0,
  multiple = true,
  onChangeStatus,
  validate,
}: IDropzoneProps) => {
  const dropzoneRef = useRef<HTMLDivElement | null>(null);
  const {
    active,
    dragged,
    reject,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
  } = useDragState(accept);

  const [filesMap, setFilesMap] = useState<FilesMap>({});
  const updateFilesMapEntry = (id: string, value: IFileWithMeta) => {
    setFilesMap(prev => ({ ...prev, [id]: value }));
  };

  const getUploadParamsCallback = useCallback(
    async (fileWithMeta: IFileWithMeta) => {
      let params = null;
      try {
        params = getUploadParams ? await getUploadParams(fileWithMeta) : null;
      } catch (e) {
        logError('Error Upload Params', e);
      }
      return params;
    },
    [getUploadParams],
  );

  const extra = {
    active,
    reject,
    dragged,
    accept,
    multiple,
    minSizeBytes,
    maxSizeBytes,
    maxFiles,
  } as IExtra;

  //const dropzoneDisabled = resolveValue(disabled, files, extra);

  const handleFileStatus = (
    fileWithMeta: IFileWithMeta,
    status: StatusValue,
    validationError?: string,
  ) => {
    updateFileStatus(fileWithMeta, status);
    if (validationError) {
      fileWithMeta.meta.validationError = validationError;
    }
    handleChangeStatus(fileWithMeta);
  };

  const updateFileStatus = (
    fileWithMeta: IFileWithMeta,
    value: StatusValue,
  ) => {
    fileWithMeta.meta.status = value;
    updateFilesMapEntry(fileWithMeta.id, fileWithMeta);
  };

  const handleChangeStatus = (fileWithMeta: IFileWithMeta) => {
    if (!onChangeStatus) return;
    const { meta = {} } =
      onChangeStatus(fileWithMeta, fileWithMeta.meta.status, filesMap) || {};
    if (meta) {
      delete meta.status;
      fileWithMeta.meta = { ...fileWithMeta.meta, ...meta };
    }
  };

  const uploadFile = async (
    fileWithMeta: IFileWithMeta,
    params: IUploadParams,
  ) => {
    const fileUploader = new FileUploader(params);
    fileUploader.upload(fileWithMeta, {
      onChangeStatus(status: StatusValue) {
        handleFileStatus(fileWithMeta, status);
      },
      onError(status: StatusValue) {
        handleFileStatus(fileWithMeta, status);
      },
      onProgress(event: ProgressEvent) {
        fileWithMeta.meta.percent = (event.loaded * 100.0) / event.total || 100;
        updateFilesMapEntry(fileWithMeta.id, fileWithMeta);
      },
    });
  };

  const handleCancel = (fileWithMeta: IFileWithMeta) => {
    if (fileWithMeta.meta.status !== StatusValue.Uploading) return;
    handleFileStatus(fileWithMeta, StatusValue.Aborted);
    if (fileWithMeta.xhr) fileWithMeta.xhr.abort();
  };

  const handleRemove = (fileWithMeta: IFileWithMeta) => {
    if (filesMap[fileWithMeta.id] !== undefined) {
      URL.revokeObjectURL(fileWithMeta.meta.previewUrl || '');
      handleFileStatus(fileWithMeta, StatusValue.Removed);
      setFilesMap(prev => {
        delete prev[fileWithMeta.id];
        return { ...prev };
      });
    }
  };

  const handleRestart = async (fileWithMeta: IFileWithMeta) => {
    if (!getUploadParams) return;

    if (fileWithMeta.meta.status === StatusValue.Ready) {
      updateFileStatus(fileWithMeta, StatusValue.Started);
    } else {
      updateFileStatus(fileWithMeta, StatusValue.Restarted);
    }
    handleChangeStatus(fileWithMeta);
    const params = await getUploadParams(fileWithMeta);
    if (params) {
      uploadFile(fileWithMeta, params);
      fileWithMeta.meta.percent = 0;
      updateFilesMapEntry(fileWithMeta.id, fileWithMeta);
    } else {
      updateFileStatus(fileWithMeta, StatusValue.Done);
    }
    handleChangeStatus(fileWithMeta);
  };

  const handleFiles = (items: FileInputItem[]) => {
    const map = items
      .map(mapFileInputItemToFile)
      .filter(filterNonNull)
      .map(mapFileToFileWithMeta)
      .reduce((acc, item) => {
        return { ...acc, [item.id]: item };
      }, {});
    setFilesMap(prev => ({ ...map, ...prev }));
  };

  const handleFile = async (fileWithMeta: IFileWithMeta) => {
    // firefox versions prior to 53 return a bogus mime type for file drag events,
    // so files with that mime type are always accepted
    if (
      fileWithMeta.file.type !== 'application/x-moz-file' &&
      !accepts(fileWithMeta.file, accept)
    ) {
      handleFileStatus(fileWithMeta, StatusValue.RejectedFileType);
      return;
    }

    if (
      fileWithMeta.file.size < minSizeBytes ||
      fileWithMeta.file.size > maxSizeBytes
    ) {
      handleFileStatus(fileWithMeta, StatusValue.ErrorFileSize);
      return;
    }

    if (Object.values(filesMap).length >= maxFiles) {
      handleFileStatus(fileWithMeta, StatusValue.RejectedMaxFiles);
      return;
    }

    if (validate) {
      const error = validate(fileWithMeta);
      if (error) {
        console.error('ERROR', error);
        handleFileStatus(
          fileWithMeta,
          StatusValue.ErrorValidation,
          error as string,
        );
        return;
      }
    }

    fileWithMeta.cancel = () => handleCancel(fileWithMeta);
    fileWithMeta.remove = () => handleRemove(fileWithMeta);
    fileWithMeta.restart = () => handleRestart(fileWithMeta);

    handleFileStatus(fileWithMeta, StatusValue.Preparing);

    await generatePreview(fileWithMeta);

    const params = await getUploadParamsCallback(fileWithMeta);
    if (params) {
      if (autoUpload) {
        uploadFile(fileWithMeta, params);
      } else {
        handleFileStatus(fileWithMeta, StatusValue.Ready);
      }
    } else {
      handleFileStatus(fileWithMeta, StatusValue.Done);
    }
  };

  useEffect(() => {
    const readyFiles = Object.values(filesMap).filter(
      f => f.meta.status === StatusValue.Ready,
    );
    readyFiles.forEach(handleFile);
    const { current } = dropzoneRef;
    let scrollTimeoutId: NodeJS.Timeout;
    if (current) {
      scrollTimeoutId = setTimeout(
        () => current.scroll({ top: current.scrollHeight, behavior: 'smooth' }),
        150,
      );
    }
    return () => clearTimeout(scrollTimeoutId);
  }, [filesMap, handleFile]);

  return (
    <DropzoneProvider>
      <Layout
        active={active}
        canCancel={resolveValue(canCancel, filesMap, extra)}
        canRemove={resolveValue(canRemove, filesMap, extra)}
        canRestart={resolveValue(canRestart, filesMap, extra)}
        extra={extra}
        files={Object.values(filesMap)}
        onChange={handleFiles}
        dropzoneProps={{
          onDragEnter: handleDragEnter,
          onDragOver: handleDragOver,
          onDragLeave: handleDragLeave,
          onDrop: handleDrop(handleFiles),
        }}
        ref={dropzoneRef}
      />
    </DropzoneProvider>
  );
};

export default Dropzone;
