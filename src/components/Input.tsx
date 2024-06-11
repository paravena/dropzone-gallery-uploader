import { ArrowUpTrayIcon } from '@heroicons/react/20/solid';

import React, { ChangeEvent } from 'react';
import { FileInputItem, getFilesFromEvent } from '../utils';

type Props = {
  multiple?: boolean;
  onChange: (files: FileInputItem[]) => void;
  title?: string;
  visible: boolean;
};

const Input: React.FC<Props> = ({
  title = 'Drop files to upload',
  visible,
  onChange,
  multiple = true,
}) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const chosenFiles = getFilesFromEvent(event);
    onChange(chosenFiles);
    event.target.value = '';
  };

  if (!visible) return null;

  return (
    <label>
      <input
        type="file"
        className="hidden"
        onChange={handleChange}
        multiple={multiple}
      />
      <div className="flex flex-col items-center">
        <ArrowUpTrayIcon className="h-10 w-10" />
        <h2>{title}</h2>
      </div>
    </label>
  );
};

export default Input;
