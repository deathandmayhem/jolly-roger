import React from 'react';
import { AccountForm } from '/imports/client/components/AccountForm.jsx';

const EnrollForm = React.createClass({
  propTypes: {
    params: React.PropTypes.shape({
      token: React.PropTypes.string.isRequired,
    }).isRequired,
  },

  render() {
    return <AccountForm format="enroll" token={this.props.params.token} />;
  },
});

export default EnrollForm;
