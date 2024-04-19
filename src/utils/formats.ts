const SIZE_UNITS = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

export const formatBytes = (bytes: number) => {
  let index = 0;
  let size = bytes;

  while (size >= 1024) {
    size /= 1024;
    index++;
  }
  const precision = size >= 10 || index < 1 ? 0 : 1;

  return `${size.toFixed(precision)}${SIZE_UNITS[index]}`;
};

export const formatDuration = (seconds: number) => {
  const date = new Date(0);
  date.setSeconds(seconds);
  const dateString = date.toISOString().slice(11, 19);
  if (seconds < 3600) return dateString.slice(3);
  return dateString;
};
