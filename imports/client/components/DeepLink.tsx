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

const DeepLink = ({
  children, nativeUrl, browserUrl, ...rest
}: DeepLinkProps) => {
  const [state, setState] = useState<DeepLinkState>({
    state: DeepLinkLoadState.IDLE,
  });

  const browserOpen = useCallback(() => {
    window.open(browserUrl, '_blank');
  }, [browserUrl]);

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
      <iframe title="Open document" width="1px" height="1px" src={nativeUrl} />
    );
  };

  return (
    <div onClick={onClick} {...rest}>
      {state.state === 'attemptingNative' && nativeIframe()}
      {children}
    </div>
  );
};

export default DeepLink;
