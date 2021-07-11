import md5 from 'md5';
import React from 'react';

function gravatarHash(emailAddress: string): string {
  return md5(emailAddress.trim().toLowerCase());
}

interface GravatarProps {
  email: string;
}

const Gravatar = (props: GravatarProps) => {
  return (
    <div>
      <img
        src={`https://www.gravatar.com/avatar/${gravatarHash(props.email)}?d=identicon`}
        alt="Avatar"
      />
    </div>
  );
};

export default React.memo(Gravatar);
