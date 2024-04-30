import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from './Layout.tsx';
import {
  accepts,
  FileInputItem,
  FilesMap,
  filterNonNull,
  generatePreview,
  HttpMethod,
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
  timeout = 100000,
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

  const updateFileStatus = (
    fileWithMeta: IFileWithMeta,
    value: StatusValue,
  ) => {
    fileWithMeta.meta.status = value;
    updateFilesMapEntry(fileWithMeta.id, fileWithMeta);
  };

  const uploadFile = async (
    fileWithMeta: IFileWithMeta,
    params: IUploadParams,
  ) => {
    const {
      url,
      method = HttpMethod.POST,
      body,
      fields = {},
      headers = {},
      meta: extraMeta = {},
    } = params;

    if (!url) {
      updateFileStatus(fileWithMeta, StatusValue.ErrorUploadParams);
      handleChangeStatus(fileWithMeta);
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);

    const formData = new FormData();
    for (const [fieldName, fieldValue] of Object.entries(fields)) {
      formData.append(fieldName, fieldValue);
    }
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    for (const [headerName, headerValue] of Object.entries(headers)) {
      xhr.setRequestHeader(headerName, headerValue);
    }

    delete extraMeta.status;
    fileWithMeta.meta = { ...fileWithMeta.meta, ...extraMeta };

    // update progress (can be used to show progress indicator)
    xhr.upload.addEventListener('progress', e => {
      console.log('progress status', fileWithMeta.meta.status);
      fileWithMeta.meta.percent = (e.loaded * 100.0) / e.total || 100;
      updateFilesMapEntry(fileWithMeta.id, fileWithMeta);
    });

    xhr.addEventListener('readystatechange', () => {
      const { readyState, status } = xhr;
      const { ExceptionUpload, HeadersReceived, Done, ErrorUpload } =
        StatusValue;
      const isIntermediateState = readyState === 2 || readyState === 4;
      const isStatusError = status >= 400;

      // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/readyState
      if (!isIntermediateState) return;

      if (
        xhr.status === 0 &&
        fileWithMeta.meta.status !== StatusValue.Aborted
      ) {
        updateFileStatus(fileWithMeta, ExceptionUpload);
        handleChangeStatus(fileWithMeta);
      }

      if (xhr.status > 0 && xhr.status < 400) {
        fileWithMeta.meta.percent = 100;
        const status = readyState === 2 ? HeadersReceived : Done;
        updateFileStatus(fileWithMeta, status);
        handleChangeStatus(fileWithMeta);
      } else if (isStatusError && fileWithMeta.meta.status !== ErrorUpload) {
        updateFileStatus(fileWithMeta, ErrorUpload);
        handleChangeStatus(fileWithMeta);
      }
    });

    formData.append('file', fileWithMeta.file);
    if (timeout) xhr.timeout = timeout;
    xhr.send(body || formData);
    fileWithMeta.xhr = xhr;
    updateFileStatus(fileWithMeta, StatusValue.Uploading);
    handleChangeStatus(fileWithMeta);
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

  const handleCancel = (fileWithMeta: IFileWithMeta) => {
    if (fileWithMeta.meta.status !== StatusValue.Uploading) return;
    updateFileStatus(fileWithMeta, StatusValue.Aborted);
    if (fileWithMeta.xhr) fileWithMeta.xhr.abort();
    handleChangeStatus(fileWithMeta);
  };

  const handleRemove = (fileWithMeta: IFileWithMeta) => {
    if (filesMap[fileWithMeta.id] !== undefined) {
      URL.revokeObjectURL(fileWithMeta.meta.previewUrl || '');
      updateFileStatus(fileWithMeta, StatusValue.Removed);
      handleChangeStatus(fileWithMeta);
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
    setFilesMap(prev => ({ ...prev, ...map }));
  };

  const handleFile = async (fileWithMeta: IFileWithMeta) => {
    // firefox versions prior to 53 return a bogus mime type for file drag events,
    // so files with that mime type are always accepted
    if (
      fileWithMeta.file.type !== 'application/x-moz-file' &&
      !accepts(fileWithMeta.file, accept)
    ) {
      updateFileStatus(fileWithMeta, StatusValue.RejectedFileType);
      handleChangeStatus(fileWithMeta);
      return;
    }
    // TODO this is in a wrong place
    if (Object.values(filesMap).length >= maxFiles) {
      updateFileStatus(fileWithMeta, StatusValue.RejectedMaxFiles);
      handleChangeStatus(fileWithMeta);
      return;
    }

    fileWithMeta.cancel = () => handleCancel(fileWithMeta);
    fileWithMeta.remove = () => handleRemove(fileWithMeta);
    fileWithMeta.restart = () => handleRestart(fileWithMeta);

    updateFileStatus(fileWithMeta, StatusValue.Preparing);
    handleChangeStatus(fileWithMeta);

    if (
      fileWithMeta.file.size < minSizeBytes ||
      fileWithMeta.file.size > maxSizeBytes
    ) {
      updateFileStatus(fileWithMeta, StatusValue.ErrorFileSize);
      handleChangeStatus(fileWithMeta);
      return;
    }
    await generatePreview(fileWithMeta);

    if (validate) {
      const error = validate(fileWithMeta);
      if (error) {
        console.error('ERROR', error);
        updateFileStatus(fileWithMeta, StatusValue.ErrorValidation);
        fileWithMeta.meta.validationError = error; // usually a string, but doesn't have to be
        handleChangeStatus(fileWithMeta);
        return;
      }
    }

    const params = await getUploadParamsCallback(fileWithMeta);

    if (params) {
      if (autoUpload) {
        uploadFile(fileWithMeta, params);
      } else {
        updateFileStatus(fileWithMeta, StatusValue.Ready);
      }
    } else {
      updateFileStatus(fileWithMeta, StatusValue.Done);
    }
    handleChangeStatus(fileWithMeta);
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
  );
};

export default Dropzone;
