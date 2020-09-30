import { DDP } from 'meteor/ddp';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Ansible from '../../ansible';

interface ConnectionStatusProps {
  meteorStatus: DDP.DDPStatus;
}

class ConnectionStatus extends React.Component<ConnectionStatusProps> {
  timeoutId?: number;

  refresh() {
    // Mark this timeout as completed
    if (this.timeoutId) {
      this.timeoutId = undefined;
    }
    this.forceUpdate();
  }

  render() {
    switch (this.props.meteorStatus.status) {
      case 'connecting':
        return (
          <Alert variant="warning">
            Trying to reconnect to Jolly Roger...
          </Alert>
        );
      case 'failed':
        return (
          <Alert variant="danger">
            <strong>Oh no!</strong>
            {' '}
            Unable to connect to Jolly Roger:
            {this.props.meteorStatus.reason}
          </Alert>
        );
      case 'waiting': {
        const now = Date.now();
        const retryTime = this.props.meteorStatus.retryTime || now;
        const timeToRetry = Math.ceil((retryTime - now) / 1000);

        // If we have no refresh scheduled yet, trigger a refresh in a second.
        if (this.timeoutId === undefined) {
          this.timeoutId = window.setTimeout(() => this.refresh(), 1000);
        }
        return (
          <Alert variant="warning">
            We can&apos;t connect to Jolly Roger right now. We&apos;ll try again in
            {' '}
            {timeToRetry}
            s. Your pending changes will be pushed to the server when we reconnect.
            {' '}
            <Button variant="link" onClick={Meteor.reconnect}>retry now</Button>
          </Alert>
        );
      }
      case 'offline':
        return (
          <Alert variant="warning">
            <strong>Warning!</strong>
            {' '}
            Currently not connected to Jolly Roger server. Changes will be synced when you
            reconnect.
            <Button variant="link" onClick={Meteor.reconnect}>reconnect now</Button>
          </Alert>
        );
      case 'connected':
        return null;
      default:
        Ansible.warn('Unknown connection status', { state: this.props.meteorStatus.status });
        return null;
    }
  }
}

const ConnectionStatusContainer = withTracker((_props: {}) => {
  return { meteorStatus: Meteor.status() };
})(ConnectionStatus);

export default ConnectionStatusContainer;
