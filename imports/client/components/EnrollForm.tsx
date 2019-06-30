import * as PropTypes from 'prop-types';
import * as React from 'react';
import AccountForm, { AccountFormFormat } from './AccountForm';

interface EnrollFormProps {
  params: {token: string};
}

class EnrollForm extends React.Component<EnrollFormProps> {
  static propTypes = {
    params: PropTypes.shape({
      token: PropTypes.string.isRequired,
    }).isRequired,
  };

  render() {
    return <AccountForm format={AccountFormFormat.ENROLL} token={this.props.params.token} />;
  }
}

export default EnrollForm;
