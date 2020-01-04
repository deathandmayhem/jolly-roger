import PropTypes from 'prop-types';
import React from 'react';
import AccountForm, { AccountFormFormat } from './AccountForm';

interface PasswordResetFormProps {
  params: {token: string};
}

class PasswordResetForm extends React.Component<PasswordResetFormProps> {
  static propTypes = {
    params: PropTypes.shape({
      token: PropTypes.string.isRequired,
    }).isRequired,
  };

  render() {
    return <AccountForm format={AccountFormFormat.RESET_PWD} token={this.props.params.token} />;
  }
}

export default PasswordResetForm;
