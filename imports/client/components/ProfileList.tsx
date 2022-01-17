import { Meteor } from 'meteor/meteor';
import { faEraser } from '@fortawesome/free-solid-svg-icons/faEraser';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import FormLabel from 'react-bootstrap/FormLabel';
import FormText from 'react-bootstrap/FormText';
import InputGroup from 'react-bootstrap/InputGroup';
import ListGroup from 'react-bootstrap/ListGroup';
import ListGroupItem from 'react-bootstrap/ListGroupItem';
import * as RRBS from 'react-router-bootstrap';
import styled from 'styled-components';
import { getAvatarCdnUrl } from '../../lib/discord';
import { ProfileType } from '../../lib/schemas/profile';

const ProfilesSummary = styled.div`
  text-align: right;
`;

const StyledListGroupItem = styled(ListGroupItem)`
  padding: .25rem;
  width: 100%;

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const ImageBlock = styled.div`
  width: 40px;
  height: 40px;
  flex: none;
  margin-right: .5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const ProfileList = ({
  huntId, canInvite, canSyncDiscord, profiles,
}: {
  huntId?: string;
  canInvite?: boolean;
  canSyncDiscord?: boolean;
  profiles: ProfileType[];
}) => {
  const [searchString, setSearchString] = useState<string>('');

  const searchBarRef = useRef<HTMLInputElement>(null); // Wrong type but I should fix it

  const maybeStealCtrlF = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      const node = searchBarRef.current;
      if (node) {
        node.focus();
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', maybeStealCtrlF);
    return () => {
      window.removeEventListener('keydown', maybeStealCtrlF);
    };
  }, [maybeStealCtrlF]);

  // The type annotation on FormControl is wrong here - the event is from the
  // input element, not the FormControl React component
  const onSearchStringChange: FormControlProps['onChange'] = useCallback((e) => {
    setSearchString(e.currentTarget.value);
  }, []);

  const matcher = useMemo(() => {
    const searchKeys = searchString.split(' ');
    const toMatch = searchKeys.filter(Boolean).map((s) => s.toLowerCase());
    const isInteresting = (profile: ProfileType) => {
      for (let i = 0; i < toMatch.length; i++) {
        const searchKey = toMatch[i];
        if (profile.displayName.toLowerCase().indexOf(searchKey) === -1 &&
          profile.primaryEmail.toLowerCase().indexOf(searchKey) === -1 &&
          (!profile.phoneNumber || profile.phoneNumber.toLowerCase().indexOf(searchKey) === -1) &&
          (!profile.discordAccount || `${profile.discordAccount.username.toLowerCase()}#${profile.discordAccount.discriminator}`.indexOf(searchKey) === -1)) {
          return false;
        }
      }

      return true;
    };

    return isInteresting;
  }, [searchString]);

  const clearSearch = useCallback(() => {
    setSearchString('');
  }, []);

  const syncDiscord = useCallback(() => {
    Meteor.call('syncDiscordRole', huntId);
  }, [huntId]);

  const syncDiscordButton = useMemo(() => {
    if (!huntId || !canSyncDiscord) {
      return null;
    }

    return (
      <FormGroup>
        <Button variant="warning" onClick={syncDiscord}>
          Sync this hunt&apos;s Discord role
        </Button>
        <FormText>
          (Click this if people are reporting that they can&apos;t access hunt-specific channels)
        </FormText>
      </FormGroup>
    );
  }, [huntId, canSyncDiscord, syncDiscord]);

  const inviteToHuntItem = useMemo(() => {
    if (!huntId || !canInvite) {
      return null;
    }

    return (
      <RRBS.LinkContainer to={`/hunts/${huntId}/hunters/invite`}>
        <StyledListGroupItem action>
          <ImageBlock>
            <FontAwesomeIcon icon={faPlus} />
          </ImageBlock>
          <strong>Invite someone...</strong>
        </StyledListGroupItem>
      </RRBS.LinkContainer>
    );
  }, [huntId, canInvite]);

  const globalInfo = useMemo(() => {
    if (huntId) {
      return null;
    }

    return (
      <Alert variant="info">
        This shows everyone registered on Jolly Roger, not just those hunting in this year&apos;s
        Mystery Hunt. For that, go to the hunt page and click on &quot;Hunters&quot;.
      </Alert>
    );
  }, [huntId]);

  const matching = profiles.filter(matcher);
  return (
    <div>
      <h1>List of hunters</h1>
      <ProfilesSummary>
        Total hunters:
        {' '}
        {profiles.length}
      </ProfilesSummary>

      {syncDiscordButton}

      <FormGroup>
        <FormLabel htmlFor="jr-profile-list-search">
          Search
        </FormLabel>
        <InputGroup>
          <FormControl
            id="jr-profile-list-search"
            type="text"
            ref={searchBarRef}
            placeholder="search by name, email, phone, Discord..."
            value={searchString}
            onChange={onSearchStringChange}
          />
          <InputGroup.Append>
            <Button variant="secondary" onClick={clearSearch}>
              <FontAwesomeIcon icon={faEraser} />
            </Button>
          </InputGroup.Append>
        </InputGroup>
      </FormGroup>

      {globalInfo}

      <ListGroup>
        {inviteToHuntItem}
        {matching.map((profile) => {
          const name = profile.displayName || '<no name provided>';
          const discordAvatarUrl = getAvatarCdnUrl(profile.discordAccount);
          return (
            <RRBS.LinkContainer key={profile._id} to={`/users/${profile._id}`}>
              <StyledListGroupItem action>
                <ImageBlock>
                  {discordAvatarUrl && (
                    <img
                      alt={`${name}'s Discord avatar`}
                      src={discordAvatarUrl}
                      width={40}
                      height={40}
                      className="discord-avatar"
                    />
                  )}
                </ImageBlock>
                {name}
              </StyledListGroupItem>
            </RRBS.LinkContainer>
          );
        })}
      </ListGroup>
    </div>
  );
};

export default ProfileList;
