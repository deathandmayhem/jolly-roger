import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as md5 from 'md5';

function gravatarHash(emailAddress: string): string {
  return md5(emailAddress.trim().toLowerCase());
}

interface GravatarProps {
  email: string;
}

class Gravatar extends React.PureComponent<GravatarProps> {
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
