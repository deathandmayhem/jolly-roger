import { Meteor } from 'meteor/meteor';
import React, { useCallback } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import { ProfileType } from '../../lib/schemas/profiles';
import Gravatar from './Gravatar';

interface OthersProfilePageProps {
  profile: ProfileType;
  viewerCanMakeOperator: boolean;
  targetIsOperator: boolean;
}

const OthersProfilePage = (props: OthersProfilePageProps) => {
  const makeOperator = useCallback(() => {
    Meteor.call('makeOperator', props.profile._id);
  }, [props.profile._id]);

  const profile = props.profile;
  const showOperatorBadge = props.targetIsOperator;
  const showMakeOperatorButton = props.viewerCanMakeOperator && !props.targetIsOperator;
  return (
    <div>
      <h1>{profile.displayName}</h1>
      {showOperatorBadge && <Badge>operator</Badge>}
      {showMakeOperatorButton && <Button onClick={makeOperator}>Make operator</Button>}
      <Gravatar email={profile.primaryEmail} />
      <div>
        Email:
        {' '}
        {profile.primaryEmail}
      </div>
      {profile.phoneNumber ? (
        <div>
          Phone:
          {' '}
          {profile.phoneNumber}
        </div>
      ) : null}
      {profile.discordAccount ? (
        <div>
          Discord handle:
          {' '}
          {profile.discordAccount.username}
          #
          {profile.discordAccount.discriminator}
        </div>
      ) : null}
    </div>
  );
};

export default OthersProfilePage;
