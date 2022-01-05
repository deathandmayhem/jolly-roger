import React from 'react';
import { useParams } from 'react-router';
import AccountForm, { AccountFormFormat } from './AccountForm';

interface EnrollFormParams {
  token: string;
}

const EnrollForm = () => {
  const { token } = useParams<EnrollFormParams>();
  return (
    <AccountForm format={AccountFormFormat.ENROLL} token={token} />
  );
};

export default EnrollForm;
