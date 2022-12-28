import React, { useCallback, useState } from 'react';
import AccountForm, { AccountFormFormat } from './AccountForm';

type LoginFormFormat = AccountFormFormat.LOGIN | AccountFormFormat.REQUEST_PW_RESET;

const LoginForm = () => {
  const [format, setFormat] = useState<LoginFormFormat>(AccountFormFormat.LOGIN);
  const toggleFormat = useCallback(() => {
    setFormat((prevFormat) => {
      const newFormat = prevFormat === AccountFormFormat.LOGIN ?
        AccountFormFormat.REQUEST_PW_RESET :
        AccountFormFormat.LOGIN;
      return newFormat;
    });
  }, []);

  return (
    <AccountForm format={format} onFormatChange={toggleFormat} />
  );
};

export default LoginForm;
