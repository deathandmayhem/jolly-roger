import { Meteor } from 'meteor/meteor';
import React from 'react';
import PropTypes from 'prop-types';
import { withTracker } from 'meteor/react-meteor-data';
import Alert from 'react-bootstrap/lib/Alert';
import Button from 'react-bootstrap/lib/Button';
import navAggregatorType from './navAggregatorType.jsx';

/* eslint-disable max-len */

const SetupPage = React.createClass({
  propTypes: {
    config: PropTypes.object,
    canSetupGDrive: PropTypes.bool.isRequired,
  },

  contextTypes: {
    navAggregator: navAggregatorType,
  },

  getInitialState() {
    return {
      state: 'idle',
    };
  },

  dismissAlert() {
    this.setState({ state: 'idle' });
  },

  requestComplete(token) {
    const secret = OAuth._retrieveCredentialSecret(token);
    this.setState({ state: 'submitting' });
    Meteor.call('setupGdriveCreds', token, secret, (error) => {
      if (error) {
        this.setState({ state: 'error', error });
      } else {
        this.setState({ state: 'success' });
      }
    });
  },

  showPopup() {
    Google.requestCredential({
      requestPermissions: ['email', 'https://www.googleapis.com/auth/drive'],
      requestOfflineToken: true,
    }, this.requestComplete);
    return false;
  },

  renderBody() {
    if (!this.props.canSetupGDrive) {
      return <div>This page is for administering the Jolly Roger web app</div>;
    }

    if (!this.props.config) {
      return (
        <div>
          Can&apos;t finish setup until Google configuration is in place. Go to the Meteor shell, and call

          <pre>
            {'ServiceConfiguration.configurations.upsert(\n' +
             '  {service: \'google\'},\n' +
             '  {\n' +
             '    clientId: \'client id\',\n' +
             '    secret: \'secret\',\n' +
             '    loginStyle: \'popup\',\n' +
             '  }\n' +
             ')'}
          </pre>
        </div>
      );
    }

    return (
      <div>
        {this.state.state === 'submitting' ? <Alert bsStyle="info">Saving...</Alert> : null}
        {this.state.state === 'success' ? <Alert bsStyle="success" dismissAfter={5000} onDismiss={this.dismissAlert}>Saved changes.</Alert> : null}
        {this.state.state === 'error' ? (
          <Alert bsStyle="danger" onDismiss={this.dismissAlert}>
            Saving failed:
            {' '}
            {this.state.error.message}
          </Alert>
        ) : null}
        <Button bsStyle="primary" onClick={this.showPopup}>Link a Google account</Button>
        for Google Drive management. (This will replace any previously configured account)
      </div>
    );
  },

  render() {
    return (
      <this.context.navAggregator.NavItem
        itemKey="setup"
        to="/setup"
        label="Server setup"
      >
        {this.renderBody()}
      </this.context.navAggregator.NavItem>
    );
  },
});

export default withTracker(() => {
  const config = ServiceConfiguration.configurations.findOne({ service: 'google' });
  const canSetupGDrive = Roles.userHasPermission(Meteor.userId(), 'gdrive.credential');
  return { config, canSetupGDrive };
})(SetupPage);
