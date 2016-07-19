import React from 'react';
import BS from 'react-bootstrap';
import Ansible from '/imports/ansible.js';
// TODO: ReactMeteorData

const ConnectionStatus = React.createClass({
  mixins: [ReactMeteorData],

  getMeteorData() {
    data = {meteorStatus: Meteor.status()};
    return data;
  },

  render() {
    switch (this.data.meteorStatus.status) {
      case 'connecting':
        return (
          <BS.Alert bsStyle="warning">
            Trying to reconnect to Jolly Roger...
          </BS.Alert>
        );
      case 'failed':
        return (
          <BS.Alert bsStyle="danger">
            <strong>Oh no!</strong> Unable to connect to Jolly Roger:
            {this.data.meteorStatus.reason}
          </BS.Alert>
        );
      case 'waiting':
        let now = Date.now();
        let timeToRetry = Math.ceil((this.data.meteorStatus.retryTime - now) / 1000);

        // Trigger a refresh in a second.  TODO: debounce this?
        window.setTimeout(this.forceUpdate.bind(this), 1000);
        return (
          <BS.Alert bsStyle="warning">
            We can't connect to Jolly Roger right now. We'll try again
            in {timeToRetry}s. Your pending
            changes will be pushed to the server when we
            reconnect. <a onClick={Meteor.reconnect}>retry now</a>
          </BS.Alert>
        );
      case 'offline':
        return (
          <BS.Alert bsStyle="warning">
            <strong>Warning!</strong> Currently not connected to Jolly
            Roger server. Changes will be synced when you
            reconnect. <a onClick={Meteor.reconnect}>reconnect now</a>
          </BS.Alert>
        );
      case 'connected':
        return null;
      default:
        Ansible.warn('Unknown connection status', {state: this.data.meteorStatus.status});
        return null;
    }
  },
});

export { ConnectionStatus };
