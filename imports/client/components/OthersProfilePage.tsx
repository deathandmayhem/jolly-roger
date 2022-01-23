import { Meteor } from 'meteor/meteor';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import React from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/esm/Tooltip';
import styled from 'styled-components';
import { getAvatarCdnUrl } from '../../lib/discord';
import Hunts from '../../lib/models/hunts';

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
  user, huntMembership,
}: {
  user: Meteor.User;
  huntMembership?: string[];
}) => {
  const showHuntList = (huntMembership?.length ?? 0) > 0;

  const huntsLoading = useSubscribe(showHuntList ? 'mongo.hunts' : undefined, {});
  const loading = huntsLoading();
  const hunts = useTracker(() => (loading ? {} : _.indexBy(Hunts.find().fetch(), '_id')), [loading]);

  const discordAvatarUrl = getAvatarCdnUrl(user.profile?.discordAccount);
  const discordAvatarUrlLarge = getAvatarCdnUrl(user.profile?.discordAccount, 256);
  return (
    <div>
      <h1>
        {discordAvatarUrl && (
          <>
            <OverlayTrigger
              placement="bottom-start"
              overlay={(
                <AvatarTooltip id="tooltip-avatar">
                  <img
                    alt="Discord avatar"
                    src={discordAvatarUrlLarge}
                    width={128}
                    height={128}
                  />
                </AvatarTooltip>
              )}
            >
              <img
                alt={`${user.profile?.displayName}'s Discord avatar`}
                src={discordAvatarUrl}
                width={40}
                height={40}
                className="discord-avatar"
              />
            </OverlayTrigger>
            {' '}
          </>
        )}
        {user.profile?.displayName ?? 'No display name'}
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
              {user.profile?.phoneNumber ? (
                <a href={`tel:${user.profile.phoneNumber}`}>{user.profile.phoneNumber}</a>
              ) : (
                '(none)'
              )}
            </td>
          </tr>
          <tr>
            <th>Discord handle</th>
            <td>
              {user.profile?.discordAccount ? (
                <a href={`https://discord.com/users/${user.profile.discordAccount.id}`} target="_blank" rel="noreferrer">
                  {user.profile.discordAccount.username}
                  #
                  {user.profile.discordAccount.discriminator}
                </a>
              ) : (
                '(none)'
              )}
            </td>
          </tr>
          {showHuntList && (
            <tr>
              <th>All hunts participated</th>
              <td>
                {(
                  loading ?
                    'loading...' :
                    huntMembership?.map((huntId) => (
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
