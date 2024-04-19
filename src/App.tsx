import Dropzone, { IDropzoneProps } from './components/Dropzone';

function App() {
  const getUploadParams: IDropzoneProps['getUploadParams'] = () => {
    return { url: 'https://httpbin.org/post' };
  };

  const handleChangeStatus: IDropzoneProps['onChangeStatus'] = (
    { meta },
    status,
  ) => {
    // console.log(status, meta);
  };

  const handleSubmit: IDropzoneProps['onSubmit'] = (files, allFiles) => {
    console.log(files.map(f => f.meta));
    allFiles.forEach(f => f.remove());
  };

  return (
    <Dropzone
      onSubmit={handleSubmit}
      onChangeStatus={handleChangeStatus}
      getUploadParams={getUploadParams}
      accept="*"
      autoUpload={true}
      timeout={100000}
      maxFiles={Number.MAX_SAFE_INTEGER}
      maxSizeBytes={Number.MAX_SAFE_INTEGER}
      canCancel={true}
      canRemove={true}
      canRestart={true}
      multiple={true}
      minSizeBytes={0}
      disabled={false}
    />
  );
}

export default App;
