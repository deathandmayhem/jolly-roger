import React from 'react';
import { RouteComponentProps } from 'react-router';
import AccountForm, { AccountFormFormat } from './AccountForm';

interface EnrollFormParams {
  token: string;
}

interface EnrollFormProps extends RouteComponentProps<EnrollFormParams> {
}

const EnrollForm = (props: EnrollFormProps) => {
  return (
    <AccountForm format={AccountFormFormat.ENROLL} token={props.match.params.token} />
  );
};

export default EnrollForm;
