import React from 'react';
import AccountForm, { AccountFormFormat } from './AccountForm';

interface EnrollFormProps {
  params: {token: string};
}

class EnrollForm extends React.Component<EnrollFormProps> {
  render() {
    return <AccountForm format={AccountFormFormat.ENROLL} token={this.props.params.token} />;
  }
}

export default EnrollForm;
