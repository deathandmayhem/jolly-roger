import { Meteor } from 'meteor/meteor';
import React from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import { ProfileType } from '../../lib/schemas/profiles';
import Gravatar from './Gravatar';

interface OthersProfilePageProps {
  profile: ProfileType;
  viewerCanMakeOperator: boolean;
  targetIsOperator: boolean;
}

class OthersProfilePage extends React.Component<OthersProfilePageProps> {
  makeOperator = () => {
    Meteor.call('makeOperator', this.props.profile._id);
  };

  render() {
    const profile = this.props.profile;
    const showOperatorBadge = this.props.targetIsOperator;
    const showMakeOperatorButton = this.props.viewerCanMakeOperator && !this.props.targetIsOperator;
    return (
      <div>
        <h1>{profile.displayName}</h1>
        {showOperatorBadge && <Badge>operator</Badge>}
        {showMakeOperatorButton && <Button onClick={this.makeOperator}>Make operator</Button>}
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
      </div>
    );
  }
}

export default OthersProfilePage;
