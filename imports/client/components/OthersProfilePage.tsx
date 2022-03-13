import { Meteor } from 'meteor/meteor';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import React from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/esm/Tooltip';
import styled from 'styled-components';
import Hunts from '../../lib/models/Hunts';
import Avatar from './Avatar';

const AvatarTooltip = styled(Tooltip)`
  opacity: 1 !important;
  .tooltip-inner {
    max-width: 300px;
  }
`;

const ProfileTable = styled.table`
  td, th {
    padding: 0.25rem 0.5rem;
  }
`;

const OthersProfilePage = ({
  user,
}: {
  user: Meteor.User;
}) => {
  const showHuntList = (user.hunts?.length ?? 0) > 0;

  const huntsLoading = useSubscribe(showHuntList ? 'mongo.hunts' : undefined, {});
  const loading = huntsLoading();
  const hunts = useTracker(() => (loading ? {} : _.indexBy(Hunts.find().fetch(), '_id')), [loading]);

  return (
    <div>
      <h1>
        <OverlayTrigger
          placement="bottom-start"
          overlay={(
            <AvatarTooltip id="tooltip-avatar">
              <Avatar {...user} size={128} />
            </AvatarTooltip>
          )}
        >
          <Avatar {...user} size={64} />
        </OverlayTrigger>
        {' '}
        {user.displayName ?? 'No display name'}
      </h1>

      <ProfileTable>
        <tbody>
          <tr>
            <th>Email</th>
            <td>
              {user.emails?.[0].address ? (
                <a href={`mailto:${user.emails[0].address}`} target="_blank" rel="noreferrer">
                  {user.emails[0].address}
                </a>
              ) : (
                '(none)'
              )}
            </td>
          </tr>
          <tr>
            <th>Phone</th>
            <td>
              {user.phoneNumber ? (
                <a href={`tel:${user.phoneNumber}`}>{user.phoneNumber}</a>
              ) : (
                '(none)'
              )}
            </td>
          </tr>
          <tr>
            <th>Discord handle</th>
            <td>
              {user.discordAccount ? (
                <a href={`https://discord.com/users/${user.discordAccount.id}`} target="_blank" rel="noreferrer">
                  {user.discordAccount.username}
                  #
                  {user.discordAccount.discriminator}
                </a>
              ) : (
                '(none)'
              )}
            </td>
          </tr>
          {showHuntList && (
            <tr>
              <th>Hunts in common</th>
              <td>
                {(
                  loading ?
                    'loading...' :
                    user.hunts?.map((huntId) => (
                      hunts[huntId]?.name ?? `Unknown hunt ${huntId}`
                    ))
                      .join(', ')
                )}
              </td>
            </tr>
          )}
        </tbody>
      </ProfileTable>
    </div>
  );
};

export default OthersProfilePage;
