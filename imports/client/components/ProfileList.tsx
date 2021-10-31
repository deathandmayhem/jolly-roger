import { Meteor } from 'meteor/meteor';
import { faEraser } from '@fortawesome/free-solid-svg-icons/faEraser';
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
import { ProfileType } from '../../lib/schemas/profile';

interface ProfileListProps {
  huntId?: string;
  canInvite?: boolean;
  canSyncDiscord?: boolean;
  profiles: ProfileType[];
}

const ProfileList = (props: ProfileListProps) => {
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
            (!profile.phoneNumber || profile.phoneNumber.toLowerCase().indexOf(searchKey) === -1)) {
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
    Meteor.call('syncDiscordRole', props.huntId);
  }, [props.huntId]);

  const syncDiscordButton = useMemo(() => {
    if (!props.huntId || !props.canSyncDiscord) {
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
  }, [props.huntId, props.canSyncDiscord, syncDiscord]);

  const inviteToHuntItem = useMemo(() => {
    if (!props.huntId || !props.canInvite) {
      return null;
    }

    return (
      <RRBS.LinkContainer to={`/hunts/${props.huntId}/hunters/invite`}>
        <ListGroupItem action>
          <strong>Invite someone...</strong>
        </ListGroupItem>
      </RRBS.LinkContainer>
    );
  }, [props.huntId, props.canInvite]);

  const globalInfo = useMemo(() => {
    if (props.huntId) {
      return null;
    }

    return (
      <Alert variant="info">
        This shows everyone registered on Jolly Roger, not just those hunting in this year&apos;s
        Mystery Hunt. For that, go to the hunt page and click on &quot;Hunters&quot;.
      </Alert>
    );
  }, [props.huntId]);

  const profiles = props.profiles.filter(matcher);
  return (
    <div>
      <h1>List of hunters</h1>
      <div className="profiles-summary">
        <div>
          Total hunters:
          {' '}
          {props.profiles.length}
        </div>
      </div>

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
            placeholder="search by name..."
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
        {profiles.map((profile) => (
          <RRBS.LinkContainer key={profile._id} to={`/users/${profile._id}`}>
            <ListGroupItem action>
              {profile.displayName || '<no name provided>'}
            </ListGroupItem>
          </RRBS.LinkContainer>
        ))}
      </ListGroup>
    </div>
  );
};

export default ProfileList;
