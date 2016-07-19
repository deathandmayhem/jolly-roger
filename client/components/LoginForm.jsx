import React from 'react';
import { AccountForm } from '/imports/client/components/AccountForm.jsx';

LoginForm = React.createClass({
  getInitialState() {
    return {
      format: 'login',
    };
  },

  changeFormat() {
    let newFormat = (this.state.format === 'login') ? 'requestPwReset' : 'login';
    this.setState({ format: newFormat });
  },

  render() {
    return <AccountForm format={this.state.format} onFormatChange={this.changeFormat} />;
  },
});
