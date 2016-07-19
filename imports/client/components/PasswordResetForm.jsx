import React from 'react';
import { AccountForm } from '/imports/client/components/AccountForm.jsx';

const PasswordResetForm = React.createClass({
  render() {
    return <AccountForm format="resetPwd" token={this.props.params.token} />;
  },
});

export { PasswordResetForm };
