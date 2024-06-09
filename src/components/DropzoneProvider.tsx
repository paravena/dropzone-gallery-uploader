import { createContext, ReactNode, useState } from 'react';
import { IFileWithMeta } from '../utils';

type IDropzoneContext = {
  selectedFiles: IFileWithMeta[];
  toggleSelectFile: (file: IFileWithMeta) => void;
};

export const DropzoneContext = createContext<IDropzoneContext>({
  selectedFiles: [],
  toggleSelectFile: () => {},
});

type Props = {
  children: ReactNode;
};

const DropzoneProvider = ({ children }: Props) => {
  const [selectedFiles, setSelectedFiles] = useState<IFileWithMeta[]>([]);
  const toggleSelectFile = (file: IFileWithMeta) => {
    setSelectedFiles([...selectedFiles, file]);
  };
  return (
    <DropzoneContext.Provider value={{ toggleSelectFile, selectedFiles }}>
      {children}
    </DropzoneContext.Provider>
  );
};

export default DropzoneProvider;
