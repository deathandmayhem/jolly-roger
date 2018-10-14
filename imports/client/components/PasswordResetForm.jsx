import React from 'react';
import { AccountForm } from '/imports/client/components/AccountForm.jsx';

const PasswordResetForm = React.createClass({
  propTypes: {
    params: React.PropTypes.shape({
      token: React.PropTypes.string.isRequired,
    }).isRequired,
  },

  render() {
    return <AccountForm format="resetPwd" token={this.props.params.token} />;
  },
});

export default PasswordResetForm;
