import Dropzone, { IDropzoneProps } from './components/Dropzone';

function App() {
  const getUploadParams: IDropzoneProps['getUploadParams'] = () => {
    return { url: 'https://httpbin.org/post' };
  };

  const handleChangeStatus: IDropzoneProps['onChangeStatus'] = (
    { meta },
    status,
  ) => {
    console.log(status, meta);
  };

  const handleSubmit: IDropzoneProps['onSubmit'] = (files, allFiles) => {
    console.log(files.map(f => f.meta));
    allFiles.forEach(f => f.remove());
  };

  return (
    <Dropzone
      maxFiles={Number.MAX_SAFE_INTEGER}
      getUploadParams={getUploadParams}
      onChangeStatus={handleChangeStatus}
      onSubmit={handleSubmit}
    />
  );
}

export default App;
