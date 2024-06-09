import { useContext } from 'react';
import { DropzoneContext } from '../components/DropzoneProvider.tsx';

export const useDropzone = () => {
  return useContext(DropzoneContext);
};
