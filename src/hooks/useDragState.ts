import { accepts, FileInputItem, getFilesFromEvent } from '../utils';
import React, { useMemo, useRef, useState } from 'react';

const useDragState = (accept: string) => {
  const [active, setActive] = useState<boolean>(false);
  const [dragged, setDragged] = useState<FileInputItem[]>([]);
  const dragTimeoutLeaveId = useRef<NodeJS.Timeout>();

  const reject = useMemo(
    () =>
      dragged.some(
        file =>
          file.type !== 'application/x-moz-file' &&
          !accepts(file as File, accept),
      ),
    [dragged, accept],
  );

  const handleDragEvent =
    (clearTimeoutCallback?: () => void) =>
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (clearTimeoutCallback) {
        clearTimeoutCallback();
      }
      const dragged = getFilesFromEvent(event);
      setActive(true);
      setDragged(dragged);
    };

  const handleDragEnter = handleDragEvent();

  const handleDragOver = handleDragEvent(() =>
    clearTimeout(dragTimeoutLeaveId.current),
  );

  const handleDragLeave = (event: React.DragEvent<HTMLElement>) => {
    event.stopPropagation();
    event.preventDefault();
    dragTimeoutLeaveId.current = setTimeout(() => {
      setActive(false);
      setDragged([]);
    }, 150);
  };

  return {
    active,
    dragged,
    reject,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
  };
};

export default useDragState;
