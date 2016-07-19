import React from 'react';
import { AccountForm } from '/imports/client/components/AccountForm.jsx';

const EnrollForm = React.createClass({
  render() {
    return <AccountForm format='enroll' token={this.props.params.token} />;
  },
});

export { EnrollForm };
