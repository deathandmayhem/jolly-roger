import React from 'react';
import { RouteComponentProps } from 'react-router';
import AccountForm, { AccountFormFormat } from './AccountForm';

interface PasswordResetFormParams {
  token: string;
}

interface PasswordResetFormProps extends RouteComponentProps<PasswordResetFormParams> {
}

const PasswordResetForm = (props: PasswordResetFormProps) => {
  return (
    <AccountForm format={AccountFormFormat.RESET_PWD} token={props.match.params.token} />
  );
};

export default PasswordResetForm;
