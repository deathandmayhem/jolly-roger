import React from 'react';
import AccountForm from './AccountForm.jsx';

const LoginForm = React.createClass({
  getInitialState() {
    return {
      format: 'login',
    };
  },

  changeFormat() {
    this.setState((prevState) => {
      const newFormat = (prevState.format === 'login') ? 'requestPwReset' : 'login';
      return { format: newFormat };
    });
  },

  render() {
    return <AccountForm format={this.state.format} onFormatChange={this.changeFormat} />;
  },
});

export default LoginForm;
