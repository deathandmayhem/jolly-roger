import PropTypes from 'prop-types';
import React from 'react';
import AccountForm from './AccountForm.jsx';

class PasswordResetForm extends React.Component {
  static propTypes = {
    params: PropTypes.shape({
      token: PropTypes.string.isRequired,
    }).isRequired,
  };

  render() {
    return <AccountForm format="resetPwd" token={this.props.params.token} />;
  }
}

export default PasswordResetForm;
