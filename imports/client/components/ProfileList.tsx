import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { faEraser } from '@fortawesome/free-solid-svg-icons/faEraser';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {
  MouseEvent, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState,
} from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import FormLabel from 'react-bootstrap/FormLabel';
import FormText from 'react-bootstrap/FormText';
import InputGroup from 'react-bootstrap/InputGroup';
import ListGroup from 'react-bootstrap/ListGroup';
import ListGroupItem from 'react-bootstrap/ListGroupItem';
import Modal from 'react-bootstrap/Modal';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { userIdIsAdmin } from '../../lib/is-admin';
import { userIsOperatorForHunt } from '../../lib/permission_stubs';
import demoteOperator from '../../methods/demoteOperator';
import promoteOperator from '../../methods/promoteOperator';
import syncHuntDiscordRole from '../../methods/syncHuntDiscordRole';
import Avatar from './Avatar';

const ProfilesSummary = styled.div`
  text-align: right;
`;

const ListItemContainer = styled.div`
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
  margin-right: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const OperatorBox = styled.div`
  margin-left: auto;
  padding-right: 0.5rem;

  * {
    margin: 0 0.25rem;
  }
`;

type OperatorModalHandle = {
  show(): void;
};

const PromoteOperatorModal = React.forwardRef((
  { user, huntId }: { user: Meteor.User, huntId: string },
  forwardedRef: React.Ref<OperatorModalHandle>,
) => {
  const [visible, setVisible] = useState(true);
  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  useImperativeHandle(forwardedRef, () => ({ show }), [show]);

  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState<Error>();
  const clearError = useCallback(() => setError(undefined), []);

  const promote = useCallback(() => {
    promoteOperator.call({ targetUserId: user._id, huntId }, (e) => {
      setDisabled(false);
      if (e) {
        setError(e);
      } else {
        hide();
      }
    });
    setDisabled(true);
  }, [huntId, hide, user._id]);

  return (
    <Modal show={visible} onHide={hide}>
      <Modal.Header closeButton>
        <Modal.Title>Promote Operator</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          Are you sure you want to make
          {' '}
          <strong>{user.displayName}</strong>
          {' '}
          an operator?
        </p>
        {error && (
          <Alert variant="danger" dismissible onClose={clearError}>
            {error.message}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={hide} disabled={disabled}>
          Cancel
        </Button>
        <Button variant="danger" onClick={promote} disabled={disabled}>
          Promote
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

const DemoteOperatorModal = React.forwardRef((
  { user, huntId }: { user: Meteor.User, huntId: string },
  forwardedRef: React.Ref<OperatorModalHandle>,
) => {
  const [visible, setVisible] = useState(true);
  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  useImperativeHandle(forwardedRef, () => ({ show }), [show]);

  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState<Error>();
  const clearError = useCallback(() => setError(undefined), []);

  const demote = useCallback(() => {
    demoteOperator.call({ targetUserId: user._id, huntId }, (e) => {
      setDisabled(false);
      if (e) {
        setError(e);
      } else {
        hide();
      }
    });
    setDisabled(true);
  }, [huntId, hide, user._id]);

  return (
    <Modal show={visible} onHide={hide}>
      <Modal.Header closeButton>
        <Modal.Title>Demote Operator</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          Are you sure you want to demote
          {' '}
          <strong>{user.displayName}</strong>
          ?
        </p>
        {error && (
          <Alert variant="danger" dismissible onClose={clearError}>
            {error.message}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={hide} disabled={disabled}>
          Cancel
        </Button>
        <Button variant="danger" onClick={demote} disabled={disabled}>
          Demote
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

const OperatorControls = ({ user, huntId }: { user: Meteor.User, huntId: string }) => {
  const self = useTracker(() => user._id === Meteor.userId(), [user._id]);
  const { userIsOperator, userIsAdmin } = useTracker(() => {
    return {
      userIsOperator: userIsOperatorForHunt(user._id, huntId),
      userIsAdmin: userIdIsAdmin(user._id),
    };
  }, [user._id, huntId]);

  const [renderPromoteModal, setRenderPromoteModal] = useState(false);
  const promoteModalRef = useRef<OperatorModalHandle>(null);
  const [renderDemoteModal, setRenderDemoteModal] = useState(false);
  const demoteModalRef = useRef<OperatorModalHandle>(null);

  const showPromoteModal = useCallback((e: MouseEvent) => {
    e.preventDefault();
    if (renderPromoteModal && promoteModalRef.current) {
      promoteModalRef.current.show();
    } else {
      setRenderPromoteModal(true);
    }
  }, [renderPromoteModal, promoteModalRef]);
  const showDemoteModal = useCallback((e: MouseEvent) => {
    e.preventDefault();
    if (renderDemoteModal && demoteModalRef.current) {
      demoteModalRef.current.show();
    } else {
      setRenderDemoteModal(true);
    }
  }, [renderDemoteModal]);

  const preventPropagation = useCallback((e: MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <OperatorBox onClick={preventPropagation}>
      {renderPromoteModal && (
        <PromoteOperatorModal ref={promoteModalRef} user={user} huntId={huntId} />
      )}
      {renderDemoteModal && (
        <DemoteOperatorModal ref={demoteModalRef} user={user} huntId={huntId} />
      )}
      {userIsAdmin && (
        <Badge bg="success">Admin</Badge>
      )}
      {userIsOperator ? (
        <>
          {!self && (
            <Button size="sm" variant="warning" onClick={showDemoteModal}>
              Demote
            </Button>
          )}
          <Badge bg="info">Operator</Badge>
        </>
      ) : (
        <Button size="sm" variant="warning" onClick={showPromoteModal}>
          Make operator
        </Button>
      )}
    </OperatorBox>
  );
};

const ProfileList = ({
  huntId, canInvite, canSyncDiscord, canMakeOperator, users, roles,
}: {
  huntId?: string;
  canInvite?: boolean;
  canSyncDiscord?: boolean;
  canMakeOperator?: boolean;
  users: Meteor.User[];
  roles?: Record<string, string[]>;
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
  const onSearchStringChange: NonNullable<FormControlProps['onChange']> = useCallback((e) => {
    setSearchString(e.currentTarget.value);
  }, []);

  const matcher = useMemo(() => {
    const searchKeys = searchString.split(' ');
    const toMatch = searchKeys.filter(Boolean).map((s) => s.toLowerCase());

    const isInteresting = (user: Meteor.User) => {
      // A user is interesting if for every search key, that search key matches
      // one of their fields.
      return toMatch.every((searchKey) => {
        return user.displayName?.toLowerCase().includes(searchKey) ||
          user.emails?.some((e) => e.address.toLowerCase().includes(searchKey)) ||
          user.phoneNumber?.toLowerCase().includes(searchKey) ||
          (user.discordAccount && (`${user.discordAccount.username.toLowerCase()}#${user.discordAccount.discriminator}`.includes(searchKey))) ||
          roles?.[user._id]?.some((role) => role.toLowerCase().includes(searchKey));
      });
    };

    return isInteresting;
  }, [searchString, roles]);

  const clearSearch = useCallback(() => {
    setSearchString('');
  }, []);

  const syncDiscord = useCallback(() => {
    if (!huntId) {
      return;
    }

    syncHuntDiscordRole.call({ huntId });
  }, [huntId]);

  const syncDiscordButton = useMemo(() => {
    if (!huntId || !canSyncDiscord) {
      return null;
    }

    return (
      <FormGroup className="mb-3">
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
      <ListGroupItem action as={Link} to={`/hunts/${huntId}/hunters/invite`} className="p-1">
        <ListItemContainer>
          <ImageBlock>
            <FontAwesomeIcon icon={faPlus} />
          </ImageBlock>
          <strong>Invite someone...</strong>
        </ListItemContainer>
      </ListGroupItem>
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

  const matching = users.filter(matcher);
  return (
    <div>
      <h1>List of hunters</h1>
      <ProfilesSummary>
        Total hunters:
        {' '}
        {users.length}
      </ProfilesSummary>

      {syncDiscordButton}

      <FormGroup className="mb-3">
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
          <Button variant="secondary" onClick={clearSearch}>
            <FontAwesomeIcon icon={faEraser} />
          </Button>
        </InputGroup>
      </FormGroup>

      {globalInfo}

      <ListGroup>
        {inviteToHuntItem}
        {matching.map((user) => {
          const name = user.displayName ?? '<no name provided>';
          return (
            <ListGroupItem key={user._id} action as={Link} to={`/users/${user._id}`} className="p-1">
              <ListItemContainer>
                <ImageBlock>
                  <Avatar {...user} size={40} />
                </ImageBlock>
                {name}
                {huntId && canMakeOperator && (
                  <OperatorControls huntId={huntId} user={user} />
                )}
              </ListItemContainer>
            </ListGroupItem>
          );
        })}
      </ListGroup>
    </div>
  );
};

export default ProfileList;
