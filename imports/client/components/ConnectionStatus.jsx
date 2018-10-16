import { Meteor } from 'meteor/meteor';
import React from 'react';
import Alert from 'react-bootstrap/lib/Alert';
import Button from 'react-bootstrap/lib/Button';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import Ansible from '../../ansible.js';

const ConnectionStatus = React.createClass({
  mixins: [ReactMeteorData],

  componentWillMount() {
    this.forceUpdateBound = this.forceUpdate.bind(this);
  },

  getMeteorData() {
    const data = { meteorStatus: Meteor.status() };
    return data;
  },

  render() {
    switch (this.data.meteorStatus.status) {
      case 'connecting':
        return (
          <Alert bsStyle="warning">
            Trying to reconnect to Jolly Roger...
          </Alert>
        );
      case 'failed':
        return (
          <Alert bsStyle="danger">
            <strong>Oh no!</strong>
            {' '}
            Unable to connect to Jolly Roger:
            {this.data.meteorStatus.reason}
          </Alert>
        );
      case 'waiting': {
        const now = Date.now();
        const timeToRetry = Math.ceil((this.data.meteorStatus.retryTime - now) / 1000);

        // Trigger a refresh in a second.  TODO: debounce this?
        window.setTimeout(this.forceUpdateBound, 1000);
        return (
          <Alert bsStyle="warning">
            We can&apos;t connect to Jolly Roger right now. We&apos;ll try again in
            {' '}
            {timeToRetry}
            s. Your pending changes will be pushed to the server when we reconnect.
            {' '}
            <Button bsStyle="link" onClick={Meteor.reconnect}>retry now</Button>
          </Alert>
        );
      }
      case 'offline':
        return (
          <Alert bsStyle="warning">
            <strong>Warning!</strong>
            {' '}
            Currently not connected to Jolly Roger server. Changes will be synced when you
            reconnect.
            <Button bsStyle="link" onClick={Meteor.reconnect}>reconnect now</Button>
          </Alert>
        );
      case 'connected':
        return null;
      default:
        Ansible.warn('Unknown connection status', { state: this.data.meteorStatus.status });
        return null;
    }
  },
});

export default ConnectionStatus;
