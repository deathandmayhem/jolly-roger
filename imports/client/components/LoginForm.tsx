import * as React from 'react';
import AccountForm, { AccountFormFormat } from './AccountForm';

interface LoginFormState {
  format: AccountFormFormat.LOGIN | AccountFormFormat.REQUEST_PW_RESET;
}

class LoginForm extends React.Component<{}, LoginFormState> {
  state = {
    format: AccountFormFormat.LOGIN,
  } as LoginFormState;

  changeFormat = () => {
    this.setState((prevState) => {
      const newFormat = (prevState.format === AccountFormFormat.LOGIN) ?
        AccountFormFormat.REQUEST_PW_RESET :
        AccountFormFormat.LOGIN;
      return { format: newFormat };
    });
  };

  render() {
    return <AccountForm format={this.state.format} onFormatChange={this.changeFormat} />;
  }
}

export default LoginForm;
