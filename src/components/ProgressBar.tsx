import { ResolveFn, StatusValue } from '../utils';

import cancelImg from '../assets/cancel.svg';
import removeImg from '../assets/remove.svg';
import restartImg from '../assets/restart.svg';

const iconByFn = {
  cancel: { backgroundImage: `url(${cancelImg})` },
  remove: { backgroundImage: `url(${removeImg})` },
  restart: { backgroundImage: `url(${restartImg})` },
};

type Props = {
  isUpload: boolean;
  percent: number;
  canCancel: boolean | ResolveFn<boolean>;
  status: StatusValue;
  canRemove: boolean | ResolveFn<boolean>;
  canRestart: boolean | ResolveFn<boolean>;
  cancel: ResolveFn<void>;
  remove: ResolveFn<void>;
  restart: ResolveFn<void>;
};

const ProgressBar = ({
  isUpload,
  cancel,
  remove,
  restart,
  canRestart,
  canRemove,
  canCancel,
  status,
  percent,
}: Props) => {
  return (
    <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 transform items-center p-10">
      {isUpload && (
        <progress
          max={100}
          value={
            status === StatusValue.Done ||
            status === StatusValue.HeadersReceived
              ? 100
              : percent
          }
        />
      )}

      {status === StatusValue.Uploading && canCancel && (
        <span
          className="bg-no-repe at ml-2 h-3 w-3"
          style={iconByFn.cancel}
          onClick={cancel}
        />
      )}
      {status !== StatusValue.Preparing &&
        status !== StatusValue.GettingUploadParams &&
        status !== StatusValue.Uploading &&
        canRemove && (
          <span
            className="ml-2 h-3 w-3 bg-no-repeat"
            style={iconByFn.remove}
            onClick={remove}
          />
        )}
      {[
        StatusValue.ErrorUploadParams,
        StatusValue.ExceptionUpload,
        StatusValue.ErrorUpload,
        StatusValue.Aborted,
        StatusValue.Ready,
      ].includes(status) &&
        canRestart && (
          <span
            className="ml-2 h-3 w-3 bg-no-repeat"
            style={iconByFn.restart}
            onClick={restart}
          />
        )}
    </div>
  );
};

export default ProgressBar;
