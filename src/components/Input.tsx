import { ArrowUpTrayIcon } from '@heroicons/react/20/solid';

import React from 'react';

type Props = {
  title?: string;
  visible: boolean;
};

const Input: React.FC<Props> = ({ title, visible }) => {
  if (!visible) return null;
  return (
    <label>
      <input type="file" className="hidden" />
      <div className="flex flex-col items-center">
        <ArrowUpTrayIcon className="h-10 w-10" />
        <h2>{title}</h2>
      </div>
    </label>
  );
};

Input.defaultProps = {
  title: 'Drop files here to upload',
};

export default Input;
