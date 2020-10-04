import React from 'react';
import { RouteComponentProps } from 'react-router';
import AccountForm, { AccountFormFormat } from './AccountForm';

interface EnrollFormParams {
  token: string;
}

interface EnrollFormProps extends RouteComponentProps<EnrollFormParams> {
}

class EnrollForm extends React.Component<EnrollFormProps> {
  render() {
    return (
      <AccountForm format={AccountFormFormat.ENROLL} token={this.props.match.params.token} />
    );
  }
}

export default EnrollForm;
