import React from 'react';
import PropTypes from 'prop-types';
import md5 from 'blueimp-md5';

function gravatarHash(emailAddress) {
  return md5(emailAddress.trim().toLowerCase());
}

class Gravatar extends React.PureComponent {
  static propTypes = {
    email: PropTypes.string.isRequired,
  };

  render() {
    return (
      <div>
        <img
          src={`https://www.gravatar.com/avatar/${gravatarHash(this.props.email)}?d=identicon`}
          alt="Avatar"
        />
      </div>
    );
  }
}

export default Gravatar;
