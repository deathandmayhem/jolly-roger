import { Meteor } from 'meteor/meteor';
import React, { useCallback, useState } from 'react';

interface DeepLinkProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  nativeUrl: string;
  browserUrl: string;
}

enum DeepLinkLoadState {
  IDLE = 'idle',
  ATTEMPTING_NATIVE = 'attemptingNative',
}

type DeepLinkState = {
  state: DeepLinkLoadState.IDLE;
} | {
  state: DeepLinkLoadState.ATTEMPTING_NATIVE;
  startNativeLoad: Date;
};

const DeepLinkHook = (props: DeepLinkProps) => {
  const [state, setState] = useState<DeepLinkState>({
    state: DeepLinkLoadState.IDLE,
  });

  const browserOpen = useCallback(() => {
    window.open(props.browserUrl, '_blank');
  }, [props.browserUrl]);

  const onAttemptingNativeTimeout = useCallback(() => {
    if (state.state === DeepLinkLoadState.IDLE) {
      return;
    }

    setState({ state: DeepLinkLoadState.IDLE });
    if (new Date().getTime() - state.startNativeLoad.getTime() < 10000) {
      browserOpen();
    }
  }, [state, browserOpen]);

  const onClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // window.orientation is a good proxy for mobile device
    if (window.orientation) {
      setState({ state: DeepLinkLoadState.ATTEMPTING_NATIVE, startNativeLoad: new Date() });
      Meteor.setTimeout(onAttemptingNativeTimeout, 25);
    } else {
      browserOpen();
    }
  }, [browserOpen, onAttemptingNativeTimeout]);

  const nativeIframe = () => {
    return (
      <iframe title="Open document" width="1px" height="1px" src={props.nativeUrl} />
    );
  };

  const {
    children, nativeUrl, browserUrl, ...rest
  } = props;
  return (
    <div onClick={onClick} {...rest}>
      {state.state === 'attemptingNative' && nativeIframe()}
      {children}
    </div>
  );
};

export default DeepLinkHook;
