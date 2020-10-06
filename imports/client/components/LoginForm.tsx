import React from 'react';
import AccountForm, { AccountFormFormat } from './AccountForm';

interface LoginFormState {
  format: AccountFormFormat.LOGIN | AccountFormFormat.REQUEST_PW_RESET;
}

class LoginForm extends React.Component<{}, LoginFormState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      format: AccountFormFormat.LOGIN,
    };
  }

  changeFormat = () => {
    this.setState((prevState) => {
      const newFormat = (prevState.format === AccountFormFormat.LOGIN) ?
        AccountFormFormat.REQUEST_PW_RESET :
        AccountFormFormat.LOGIN;
      return { format: newFormat };
    });
  };

  render() {
    return (
      <AccountForm format={this.state.format} onFormatChange={this.changeFormat} />
    );
  }
}

export default LoginForm;
