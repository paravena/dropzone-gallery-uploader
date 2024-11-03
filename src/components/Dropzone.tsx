import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Layout from './Layout.tsx';
import {
  accepts,
  FileInputItem,
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

// TODO change this to something more generic
const DEFAULT_PARAMS: IUploadParams = {
  url: 'https://httpbin.org/post',
  // url: `${process.env.NEXT_PUBLIC_FILESTACK_API_URL}/store/S3?key=${process.env.NEXT_PUBLIC_FILESTACK_API_KEY}`,
};

// TODO change this to something more generic
type IFileStackResponse = {
  url: string;
  size: number;
  type: string;
  filename: string;
  key: string;
};

export type IDropzoneProps = {
  files?: IFileWithMeta[];
  accept?: string;
  canCancel?: boolean | ResolveFn<boolean>;
  canRemove?: boolean | ResolveFn<boolean>;
  canRestart?: boolean | ResolveFn<boolean>;
  disabled?: boolean;
  maxFiles: number;
  maxSizeBytes?: number;
  minSizeBytes?: number;
  maxSelectedFiles?: number;
  multiple?: boolean;
  onChangeStatus: (
    status: StatusValue,
    fileWithMeta: IFileWithMeta,
    allFiles: IFileWithMeta[],
  ) => { meta: { [name: string]: unknown } } | void;
  onError?: (status: StatusValue, fileWithMeta?: IFileWithMeta) => void;
  onSelectedFiles: (selectedMediaFiles: IFileWithMeta[]) => void;
  onUploadedFiles: (uploadedMediaFiles: IFileWithMeta[]) => void;
  getUploadParams?: (
    file: IFileWithMeta,
  ) => IUploadParams | Promise<IUploadParams>;
  timeout?: number;
  validate?: (file: IFileWithMeta) => unknown;
};

const Dropzone = ({
  files = [],
  accept = '*',
  canCancel = true,
  canRemove = true,
  canRestart = true,
  maxFiles,
  maxSizeBytes = Number.MAX_SAFE_INTEGER,
  maxSelectedFiles = Number.MAX_SAFE_INTEGER,
  minSizeBytes = 0,
  getUploadParams,
  validate,
  onChangeStatus,
  onUploadedFiles,
  onSelectedFiles,
  onError,
}: IDropzoneProps) => {
  const dropzoneRef = useRef<HTMLDivElement | null>(null);
  const {
    active,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
  } = useDragState(accept);

  const [filesMap, setFilesMap] = useState<IFileWithMeta[]>([]);

  const updateFilesMapEntry = (id: string, fileWithMeta: IFileWithMeta) => {
    setFilesMap(prevMediaFiles =>
      prevMediaFiles.map(mf => (mf.id === id ? { ...fileWithMeta } : mf)),
    );
  };

  // TODO not ideal
  const getUploadParamsCallback = useCallback(
    async (fileWithMeta: IFileWithMeta) => {
      return getUploadParams
        ? await getUploadParams(fileWithMeta)
        : DEFAULT_PARAMS;
    },
    [getUploadParams],
  );

  const extra = {
    active,
    accept,
    minSizeBytes,
    maxSizeBytes,
    maxFiles,
  } as IExtra;

  //const dropzoneDisabled = resolveValue(disabled, files, extra);

  const handleFileStatus = (
    fileWithMeta: IFileWithMeta,
    status: StatusValue,
    validationError?: unknown,
  ) => {
    updateFileStatus(fileWithMeta, status);
    if (validationError) {
      fileWithMeta.meta.validationError = validationError;
    }
    notifyChangeStatusEvent(fileWithMeta);
  };

  const updateFileStatus = (
    fileWithMeta: IFileWithMeta,
    value: StatusValue,
  ) => {
    fileWithMeta.status = value;
    updateFilesMapEntry(fileWithMeta.id, fileWithMeta);
  };

  const notifyChangeStatusEvent = (fileWithMeta: IFileWithMeta) => {
    if (!onChangeStatus) return;
    onChangeStatus(fileWithMeta.status, fileWithMeta, filesMap);
  };

  const uploadFile = async (
    fileWithMeta: IFileWithMeta,
    params: IUploadParams,
  ) => {
    const fileUploader = new FileUploader<IFileStackResponse>(params);
    try {
      const result = await fileUploader.upload(
        fileWithMeta as Required<IFileWithMeta>,
        {
          onChangeStatus(status: StatusValue) {
            handleFileStatus(fileWithMeta, status);
          },
          onError(status: StatusValue) {
            handleFileStatus(fileWithMeta, status);
          },
          onProgress(event: ProgressEvent) {
            fileWithMeta.percent = (event.loaded * 100.0) / event.total || 100;
            updateFilesMapEntry(fileWithMeta.id, fileWithMeta);
          },
        },
      );
      updateFileStatus(fileWithMeta, StatusValue.Done);
      return result;
    } catch (e) {
      handleFileStatus(fileWithMeta, StatusValue.ErrorUpload, e);
    }
  };

  const handleCancel = (fileWithMeta: IFileWithMeta) => {
    if (fileWithMeta.status !== StatusValue.Uploading) return;
    handleFileStatus(fileWithMeta, StatusValue.Aborted);
    if (fileWithMeta.xhr) fileWithMeta.xhr.abort();
  };

  const handleRemove = (fileWithMeta: IFileWithMeta) => {
    const index = filesMap.findIndex(mf => mf.id === fileWithMeta.id);
    if (index > -1) {
      URL.revokeObjectURL(fileWithMeta.previewUrl || '');
      handleFileStatus(fileWithMeta, StatusValue.Removed);
      setFilesMap(prev => prev.filter(mf => mf.id === fileWithMeta.id));
    }
  };

  const handleRestart = async (fileWithMeta: IFileWithMeta) => {
    if (!getUploadParams) return;
    if (fileWithMeta.status === StatusValue.Ready) {
      updateFileStatus(fileWithMeta, StatusValue.Started);
    } else {
      updateFileStatus(fileWithMeta, StatusValue.Restarted);
    }
    notifyChangeStatusEvent(fileWithMeta);
    const params = await getUploadParamsCallback(fileWithMeta);
    const result = (await uploadFile(
      fileWithMeta,
      params,
    )) as IFileStackResponse;
    fileWithMeta.percent = 0;
    fileWithMeta.uploadedUrl = result?.url ?? '';
    updateFilesMapEntry(fileWithMeta.id, fileWithMeta);
    notifyChangeStatusEvent(fileWithMeta);
  };

  const handleFiles = (items: FileInputItem[]) => {
    const readyMediaFiles = items
      .map(mapFileInputItemToFile)
      .filter(filterNonNull)
      .map(mapFileToFileWithMeta);

    setFilesMap(prevMediaFiles => [...readyMediaFiles, ...prevMediaFiles]);
  };

  const handleFile = async (fileWithMeta: IFileWithMeta) => {
    fileWithMeta.cancel = () => handleCancel(fileWithMeta);
    fileWithMeta.remove = () => handleRemove(fileWithMeta);
    fileWithMeta.restart = () => handleRestart(fileWithMeta);
    const params = await getUploadParamsCallback(fileWithMeta);
    handleFileStatus(fileWithMeta, StatusValue.Preparing);
    await generatePreview(fileWithMeta as Required<IFileWithMeta>);
    const result = await uploadFile(fileWithMeta, params);
    return {
      ...fileWithMeta,
      uploadedUrl: result?.url ?? '',
    };
  };

  const validateAllFiles = (readyFiles: IFileWithMeta[]) => {
    const uploadedFiles = filesMap.filter(mf => mf.status === StatusValue.Done);
    if (
      readyFiles.length > 0 &&
      readyFiles.length + uploadedFiles.length > maxFiles
    ) {
      handleFileStatus(readyFiles[0], StatusValue.RejectedMaxFiles);
      return [{ valid: false, status: StatusValue.RejectedMaxFiles }];
    }
    return readyFiles.map(validateFile);
  };

  const validateFile = (
    mediaFile: IFileWithMeta,
  ): { valid: boolean; status?: StatusValue; mediaFile?: IFileWithMeta } => {
    // firefox versions prior to 53 return a bogus mime type for file drag events,
    // so files with that mime type are always accepted
    if (mediaFile.file === undefined) {
      return { valid: false };
    }

    if (
      mediaFile.file.type !== 'application/x-moz-file' &&
      !accepts(mediaFile.file, accept)
    ) {
      handleFileStatus(mediaFile, StatusValue.RejectedFileType);
      return { valid: false, status: StatusValue.RejectedFileType, mediaFile };
    }

    if (
      mediaFile.file.size < minSizeBytes ||
      mediaFile.file.size > maxSizeBytes
    ) {
      handleFileStatus(mediaFile, StatusValue.ErrorFileSize);
      return { valid: false, status: StatusValue.ErrorFileSize, mediaFile };
    }

    if (validate) {
      const error = validate(mediaFile);
      if (error) {
        logError('ERROR', error);
        handleFileStatus(mediaFile, StatusValue.ErrorValidation);
        return { valid: false, status: StatusValue.ErrorValidation, mediaFile };
      }
    }
    return { valid: true };
  };

  const onSelectedFile = (fileWithMeta: IFileWithMeta) => {
    updateFilesMapEntry(fileWithMeta.id, fileWithMeta);
    onSelectedFiles(filesMap.filter(f => f.selected));
  };

  const disabledSelection = useMemo(() => {
    console.log('FILES MAP', filesMap);
    return filesMap.filter(f => f.selected).length === maxSelectedFiles;
  }, [filesMap, maxSelectedFiles]);

  useEffect(() => {
    let scrollTimeoutId: NodeJS.Timeout;
    const { current } = dropzoneRef;
    // TODO There is room for optimization here
    const readyFiles = filesMap.filter(f => f.status === StatusValue.Ready);
    const validationResult = validateAllFiles(readyFiles);
    if (validationResult.every(result => result.valid)) {
      Promise.all(readyFiles.map(handleFile)).then(uploadedFiles => {
        if (uploadedFiles.length > 0) {
          onUploadedFiles(uploadedFiles);
        }
        if (current) {
          scrollTimeoutId = setTimeout(
            () =>
              current.scroll({ top: current.scrollHeight, behavior: 'smooth' }),
            150,
          );
        }
      });
    } else {
      const first = validationResult.find(result => !result.valid);
      if (first && first.status && onError) {
        const mediaFile = first.mediaFile;
        onError(first.status, mediaFile);
      }
    }
    return () => clearTimeout(scrollTimeoutId);
  }, [filesMap, handleFile]);

  useEffect(() => {
    setFilesMap(files);
  }, [files]);

  return (
    <DropzoneProvider>
      <Layout
        active={active}
        canCancel={resolveValue(canCancel, filesMap, extra)}
        canRemove={resolveValue(canRemove, filesMap, extra)}
        canRestart={resolveValue(canRestart, filesMap, extra)}
        extra={extra}
        files={filesMap}
        onChange={handleFiles}
        dropzoneProps={{
          onDragEnter: handleDragEnter,
          onDragOver: handleDragOver,
          onDragLeave: handleDragLeave,
          onDrop: handleDrop(handleFiles),
        }}
        onSelectedFile={onSelectedFile}
        disabledSelection={disabledSelection}
        ref={dropzoneRef}
      />
    </DropzoneProvider>
  );
};

export default Dropzone;
