import { Meteor } from 'meteor/meteor';
import React from 'react';

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

class DeepLink extends React.Component<DeepLinkProps, DeepLinkState> {
  constructor(props: DeepLinkProps) {
    super(props);
    this.state = { state: DeepLinkLoadState.IDLE };
  }

  onAttemptingNativeTimeout = () => {
    if (this.state.state === DeepLinkLoadState.IDLE) {
      return;
    }

    this.setState({ state: DeepLinkLoadState.IDLE });
    if (new Date().getTime() - this.state.startNativeLoad.getTime() < 10000) {
      this.browserOpen();
    }
  };

  onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // window.orientation is a good proxy for mobile device
    if (window.orientation) {
      this.setState({ state: DeepLinkLoadState.ATTEMPTING_NATIVE, startNativeLoad: new Date() });
      Meteor.setTimeout(this.onAttemptingNativeTimeout, 25);
    } else {
      this.browserOpen();
    }
  };

  browserOpen = () => {
    window.open(this.props.browserUrl, '_blank');
  };

  nativeIframe = () => {
    return (
      <iframe title="Open document" width="1px" height="1px" src={this.props.nativeUrl} />
    );
  };

  render() {
    const {
      children, nativeUrl, browserUrl, ...rest
    } = this.props;
    return (
      <div onClick={this.onClick} {...rest}>
        {this.state.state === 'attemptingNative' && this.nativeIframe()}
        {children}
      </div>
    );
  }
}

export default DeepLink;
