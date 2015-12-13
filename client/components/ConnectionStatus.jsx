const BS = ReactBootstrap;

ConnectionStatus = React.createClass({
  mixins: [ReactMeteorData],

  getMeteorData() {
    data = {meteorStatus: Meteor.status()};
    if (data.meteorStatus.status == 'waiting') {
      data.timeToRetry = Math.ceil((data.meteorStatus.retryTime - Date.now()) / 1000);
    }

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
        return (
          <BS.Alert bsStyle="warning">
            We can't connect to Jolly Roger right now. We'll try again
            in {this.data.timeToRetry}s. Your pending
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
