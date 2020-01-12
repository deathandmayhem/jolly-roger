import md5 from 'md5';
import React from 'react';

function gravatarHash(emailAddress: string): string {
  return md5(emailAddress.trim().toLowerCase());
}

interface GravatarProps {
  email: string;
}

class Gravatar extends React.PureComponent<GravatarProps> {
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
