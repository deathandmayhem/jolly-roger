import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import React from 'react';

const DeepLink = React.createClass({
  propTypes: {
    children: React.PropTypes.node.isRequired,
    nativeUrl: React.PropTypes.string.isRequired,
    browserUrl: React.PropTypes.string.isRequired,
  },

  getInitialState() {
    return { state: 'idle' };
  },

  onAttemptingNativeTimeout() {
    this.setState({ state: 'idle' });
    if (new Date() - this.state.startNativeLoad < 10000) {
      this.browserOpen();
    }
  },

  onClick() {
    // window.orientation is a good proxy for mobile device
    if (window.orientation) {
      this.setState({ state: 'attemptingNative', startNativeLoad: new Date() });
      Meteor.setTimeout(this.onAttemptingNativeTimeout, 25);
    } else {
      this.browserOpen();
    }
  },

  browserOpen() {
    window.open(this.props.browserUrl, '_blank');
  },

  nativeIframe() {
    return (
      <iframe width="1px" height="1px" src={this.props.nativeUrl} />
    );
  },

  render() {
    const rest = _.omit(this.props, 'children', 'nativeUrl', 'browserUrl');
    return (
      <div onClick={this.onClick} {...rest}>
        {this.state.state === 'attemptingNative' && this.nativeIframe()}
        {this.props.children}
      </div>
    );
  },
});

export default DeepLink;
