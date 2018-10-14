import { Meteor } from 'meteor/meteor';
import React from 'react';
import BS from 'react-bootstrap';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import { navAggregatorType } from '/imports/client/components/NavAggregator.jsx';

/* eslint-disable max-len */

const SetupPage = React.createClass({
  contextTypes: {
    navAggregator: navAggregatorType,
  },

  mixins: [ReactMeteorData],

  getInitialState() {
    return {
      state: 'idle',
    };
  },

  getMeteorData() {
    const config = ServiceConfiguration.configurations.findOne({ service: 'google' });
    const canSetupGDrive = Roles.userHasPermission(Meteor.userId(), 'gdrive.credential');
    return { config, canSetupGDrive };
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
    if (!this.data.canSetupGDrive) {
      return <div>This page is for administering the Jolly Roger web app</div>;
    }

    if (!this.data.config) {
      return (
        <div>
          Can't finish setup until Google configuration is in place. Go to the Meteor shell, and call

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
        {this.state.state === 'submitting' ? <BS.Alert bsStyle="info">Saving...</BS.Alert> : null}
        {this.state.state === 'success' ? <BS.Alert bsStyle="success" dismissAfter={5000} onDismiss={this.dismissAlert}>Saved changes.</BS.Alert> : null}
        {this.state.state === 'error' ? <BS.Alert bsStyle="danger" onDismiss={this.dismissAlert}>Saving failed: {this.state.error.message}</BS.Alert> : null}
        <BS.Button bsStyle="primary" onClick={this.showPopup}>Link a Google account</BS.Button> for Google Drive management. (This will replace any previously configured account)
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

export default SetupPage;
