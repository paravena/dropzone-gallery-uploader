import { createContext, ReactNode, useState } from 'react';
import { IMediaFile } from '../utils';

type IDropzoneContext = {
  selectedFiles: IMediaFile[];
  toggleSelectFile: (file: IMediaFile) => void;
};

export const DropzoneContext = createContext<IDropzoneContext>({
  selectedFiles: [],
  toggleSelectFile: () => {},
});

type Props = {
  children: ReactNode;
};

const DropzoneProvider = ({ children }: Props) => {
  const [selectedFiles, setSelectedFiles] = useState<IMediaFile[]>([]);
  const toggleSelectFile = (file: IMediaFile) => {
    setSelectedFiles([...selectedFiles, file]);
  };
  return (
    <DropzoneContext.Provider value={{ toggleSelectFile, selectedFiles }}>
      {children}
    </DropzoneContext.Provider>
  );
};

export default DropzoneProvider;
