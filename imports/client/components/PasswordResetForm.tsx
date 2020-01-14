import React from 'react';
import AccountForm, { AccountFormFormat } from './AccountForm';

interface PasswordResetFormProps {
  params: {token: string};
}

class PasswordResetForm extends React.Component<PasswordResetFormProps> {
  render() {
    return <AccountForm format={AccountFormFormat.RESET_PWD} token={this.props.params.token} />;
  }
}

export default PasswordResetForm;
