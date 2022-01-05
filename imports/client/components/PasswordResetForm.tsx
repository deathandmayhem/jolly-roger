import React from 'react';
import { useParams } from 'react-router';
import AccountForm, { AccountFormFormat } from './AccountForm';

interface PasswordResetFormParams {
  token: string;
}

const PasswordResetForm = () => {
  const { token } = useParams<PasswordResetFormParams>();
  return (
    <AccountForm format={AccountFormFormat.RESET_PWD} token={token} />
  );
};

export default PasswordResetForm;
