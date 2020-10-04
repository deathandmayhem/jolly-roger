import React from 'react';
import { RouteComponentProps } from 'react-router';
import AccountForm, { AccountFormFormat } from './AccountForm';

interface PasswordResetFormParams {
  token: string;
}

interface PasswordResetFormProps extends RouteComponentProps<PasswordResetFormParams> {
}

class PasswordResetForm extends React.Component<PasswordResetFormProps> {
  render() {
    return (
      <AccountForm format={AccountFormFormat.RESET_PWD} token={this.props.match.params.token} />
    );
  }
}

export default PasswordResetForm;
