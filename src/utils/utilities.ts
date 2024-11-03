import { StatusValue } from './types.ts';

export type ResolveFn<T> = (...args: unknown[]) => T;

export const resolveValue = <T = unknown>(
  value: ResolveFn<T> | T,
  ...args: unknown[]
) => {
  if (typeof value === 'function') return (value as ResolveFn<T>)(...args);
  return value;
};

export const logError = (message: string, error: unknown) =>
  console.error(message, error);

export const filterNonNull = <T>(value: T | null): value is T => {
  return value !== null;
};

export const isErrorStatus = (status: StatusValue) => {
  return [
    StatusValue.ErrorFileSize,
    StatusValue.ErrorValidation,
    StatusValue.ErrorUploadParams,
    StatusValue.ErrorUpload,
    StatusValue.ExceptionUpload,
    StatusValue.RejectedFileType,
    StatusValue.RejectedMaxFiles,
  ].includes(status);
};
