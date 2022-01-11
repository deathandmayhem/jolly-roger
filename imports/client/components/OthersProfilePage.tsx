import { Meteor } from 'meteor/meteor';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import React, { useCallback, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/esm/Tooltip';
import styled from 'styled-components';
import { getAvatarCdnUrl } from '../../lib/discord';
import Hunts from '../../lib/models/hunts';
import { ProfileType } from '../../lib/schemas/profile';

interface OthersProfilePageProps {
  profile: ProfileType;
  viewerCanMakeOperator: boolean;
  targetIsOperator: boolean;
  huntMembership?: string[];
}

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

const OthersProfilePage = (props: OthersProfilePageProps) => {
  const [shouldShowOperatorConfirm, setShouldShowOperatorConfirm] = useState(false);
  const showConfirm = useCallback(() => setShouldShowOperatorConfirm(true), []);
  const hideConfirm = useCallback(() => setShouldShowOperatorConfirm(false), []);

  const huntsLoading = useSubscribe(props.viewerCanMakeOperator ? 'mongo.hunts' : undefined, {});
  const loading = huntsLoading();
  const hunts = useTracker(() => (loading ? {} : _.indexBy(Hunts.find().fetch(), '_id')), [loading]);

  const makeOperator = useCallback(() => {
    Meteor.call('makeOperator', props.profile._id);
    hideConfirm();
  }, [props.profile._id, hideConfirm]);

  const profile = props.profile;
  const showOperatorBadge = props.targetIsOperator;
  const showMakeOperatorButton = props.viewerCanMakeOperator && !props.targetIsOperator;
  const discordAvatarUrl = getAvatarCdnUrl(profile.discordAccount);
  const discordAvatarUrlLarge = getAvatarCdnUrl(profile.discordAccount, 256);
  return (
    <>
      {showMakeOperatorButton && (
        <Modal show={shouldShowOperatorConfirm} onHide={hideConfirm}>
          <Modal.Header closeButton>
            <Modal.Title>Make Operator</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              Are you sure you want to make this user an operator? This can not easily be undone.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={hideConfirm}>
              Cancel
            </Button>
            <Button variant="primary" onClick={makeOperator}>
              Make Operator
            </Button>
          </Modal.Footer>
        </Modal>
      )}
      <div>
        <h1>
          {discordAvatarUrl && (
            <>
              <OverlayTrigger
                placement="bottom-start"
                overlay={(
                  <AvatarTooltip id="tooltip-avatar">
                    <img src={discordAvatarUrlLarge} width={256} height={256} alt="Discord avatar" />
                  </AvatarTooltip>
                )}
              >
                <img
                  alt={`${profile.displayName}'s Discord avatar`}
                  src={discordAvatarUrl}
                  className="discord-avatar"
                />
              </OverlayTrigger>
              {' '}
            </>
          )}
          {profile.displayName}
          {showOperatorBadge && (
            <>
              {' '}
              <Badge variant="primary">operator</Badge>
            </>
          )}
          {showMakeOperatorButton && (
            <>
              {' '}
              <Button variant="danger" onClick={showConfirm}>Make operator</Button>
            </>
          )}
        </h1>

        <ProfileTable>
          <tbody>
            <tr>
              <th>Email</th>
              <td>
                <a href={`mailto:${profile.primaryEmail}`} target="_blank" rel="noreferrer">
                  {profile.primaryEmail}
                </a>
              </td>
            </tr>
            <tr>
              <th>Phone</th>
              <td>
                {profile.phoneNumber ? (
                  <a href={`tel:${profile.phoneNumber}`}>{profile.phoneNumber}</a>
                ) : (
                  '(none)'
                )}
              </td>
            </tr>
            <tr>
              <th>Discord handle</th>
              <td>
                {profile.discordAccount ? (
                  <a href={`https://discord.com/users/${profile.discordAccount.id}`} target="_blank" rel="noreferrer">
                    {profile.discordAccount.username}
                    #
                    {profile.discordAccount.discriminator}
                  </a>
                ) : (
                  '(none)'
                )}
              </td>
            </tr>
            {props.viewerCanMakeOperator && props.huntMembership && (
              <tr>
                <th>All hunts participated</th>
                <td>
                  {(
                    loading ?
                      'loading...' :
                      props.huntMembership.map((huntId) => (
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
    </>
  );
};

export default OthersProfilePage;
