import Dropzone, { IDropzoneProps } from './components/Dropzone';

function App() {
  const getUploadParams: IDropzoneProps['getUploadParams'] = () => {
    return { url: 'https://httpbin.org/post' };
  };

  const handleChangeStatus: IDropzoneProps['onChangeStatus'] = (
    status,
    { meta },
  ) => {
    console.log(status, meta);
  };

  return (
    <section className="flex h-dvh w-full items-center justify-center overflow-hidden p-8">
      <Dropzone
        files={[]}
        maxFiles={Number.MAX_SAFE_INTEGER}
        getUploadParams={getUploadParams}
        onChangeStatus={handleChangeStatus}
        onUploadedFiles={() => {}}
        onSelectedFiles={() => {}}
      />
    </section>
  );
}

export default App;
