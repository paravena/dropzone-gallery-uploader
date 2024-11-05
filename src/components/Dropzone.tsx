import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Layout from './Layout.tsx';
import {
  accepts,
  FileInputItem,
  FileUploader,
  filterNonNull,
  generatePreview,
  IExtra,
  IMediaFile,
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
  files?: IMediaFile[];
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
    mediaFile: IMediaFile,
    allFiles: IMediaFile[],
  ) => { meta: { [name: string]: unknown } } | void;
  onError?: (status: StatusValue, mediaFile?: IMediaFile) => void;
  onSelectedFiles: (selectedMediaFiles: IMediaFile[]) => void;
  onUploadedFiles: (uploadedMediaFiles: IMediaFile[]) => void;
  getUploadParams?: (
    file: IMediaFile,
  ) => IUploadParams | Promise<IUploadParams>;
  timeout?: number;
  validate?: (file: IMediaFile) => unknown;
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

  const [filesMap, setFilesMap] = useState<IMediaFile[]>([]);

  const updateFilesMapEntry = (id: string, mediaFile: IMediaFile) => {
    setFilesMap(prevMediaFiles =>
      prevMediaFiles.map(mf => (mf.id === id ? { ...mediaFile } : mf)),
    );
  };

  // TODO not ideal
  const getUploadParamsCallback = useCallback(
    async (mediaFile: IMediaFile) => {
      return getUploadParams
        ? await getUploadParams(mediaFile)
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
    mediaFile: IMediaFile,
    status: StatusValue,
    validationError?: unknown,
  ) => {
    updateFileStatus(mediaFile, status);
    if (validationError) {
      mediaFile.meta.validationError = validationError;
    }
    notifyChangeStatusEvent(mediaFile);
  };

  const updateFileStatus = (mediaFile: IMediaFile, value: StatusValue) => {
    mediaFile.status = value;
    updateFilesMapEntry(mediaFile.id, mediaFile);
  };

  const notifyChangeStatusEvent = (mediaFile: IMediaFile) => {
    if (!onChangeStatus) return;
    onChangeStatus(mediaFile.status, mediaFile, filesMap);
  };

  const uploadFile = async (mediaFile: IMediaFile, params: IUploadParams) => {
    const fileUploader = new FileUploader<IFileStackResponse>(params);
    try {
      const result = await fileUploader.upload(
        mediaFile as Required<IMediaFile>,
        {
          onChangeStatus(status: StatusValue) {
            handleFileStatus(mediaFile, status);
          },
          onError(status: StatusValue) {
            handleFileStatus(mediaFile, status);
          },
          onProgress(event: ProgressEvent) {
            mediaFile.percent = (event.loaded * 100.0) / event.total || 100;
            updateFilesMapEntry(mediaFile.id, mediaFile);
          },
        },
      );
      updateFileStatus(mediaFile, StatusValue.Done);
      return result;
    } catch (e) {
      handleFileStatus(mediaFile, StatusValue.ErrorUpload, e);
    }
  };

  const handleCancel = (mediaFile: IMediaFile) => {
    if (mediaFile.status !== StatusValue.Uploading) return;
    handleFileStatus(mediaFile, StatusValue.Aborted);
    if (mediaFile.xhr) mediaFile.xhr.abort();
  };

  const handleRemove = (mediaFile: IMediaFile) => {
    const index = filesMap.findIndex(mf => mf.id === mediaFile.id);
    if (index > -1) {
      URL.revokeObjectURL(mediaFile.previewUrl || '');
      handleFileStatus(mediaFile, StatusValue.Removed);
      setFilesMap(prev => prev.filter(mf => mf.id === mediaFile.id));
    }
  };

  const handleRestart = async (mediaFile: IMediaFile) => {
    if (!getUploadParams) return;
    if (mediaFile.status === StatusValue.Ready) {
      updateFileStatus(mediaFile, StatusValue.Started);
    } else {
      updateFileStatus(mediaFile, StatusValue.Restarted);
    }
    notifyChangeStatusEvent(mediaFile);
    const params = await getUploadParamsCallback(mediaFile);
    const result = (await uploadFile(mediaFile, params)) as IFileStackResponse;
    mediaFile.percent = 0;
    mediaFile.uploadedUrl = result?.url ?? '';
    updateFilesMapEntry(mediaFile.id, mediaFile);
    notifyChangeStatusEvent(mediaFile);
  };

  const handleFiles = (items: FileInputItem[]) => {
    const readyMediaFiles = items
      .map(mapFileInputItemToFile)
      .filter(filterNonNull)
      .map(mapFileToFileWithMeta);

    setFilesMap(prevMediaFiles => [...readyMediaFiles, ...prevMediaFiles]);
  };

  const handleFile = async (mediaFile: IMediaFile) => {
    mediaFile.cancel = () => handleCancel(mediaFile);
    mediaFile.remove = () => handleRemove(mediaFile);
    mediaFile.restart = () => handleRestart(mediaFile);
    const params = await getUploadParamsCallback(mediaFile);
    handleFileStatus(mediaFile, StatusValue.Preparing);
    await generatePreview(mediaFile as Required<IMediaFile>);
    const result = await uploadFile(mediaFile, params);
    return {
      ...mediaFile,
      uploadedUrl: result?.url ?? '',
    };
  };

  const validateAllFiles = (readyFiles: IMediaFile[]) => {
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
    mediaFile: IMediaFile,
  ): { valid: boolean; status?: StatusValue; mediaFile?: IMediaFile } => {
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

  const onSelectedFile = (mediaFile: IMediaFile) => {
    updateFilesMapEntry(mediaFile.id, mediaFile);
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
