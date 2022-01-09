import { Meteor } from 'meteor/meteor';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { faEdit } from '@fortawesome/free-solid-svg-icons/faEdit';
import { faInfo } from '@fortawesome/free-solid-svg-icons/faInfo';
import { faMinus } from '@fortawesome/free-solid-svg-icons/faMinus';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {
  useCallback, useImperativeHandle, useRef, useState,
} from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Col from 'react-bootstrap/Col';
import FormCheck from 'react-bootstrap/FormCheck';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import FormLabel from 'react-bootstrap/FormLabel';
import FormText from 'react-bootstrap/FormText';
import Row from 'react-bootstrap/Row';
import { Link } from 'react-router-dom';
import Ansible from '../../ansible';
import DiscordCache from '../../lib/models/discord_cache';
import Hunts from '../../lib/models/hunts';
import Settings from '../../lib/models/settings';
import { userMayCreateHunt, userMayUpdateHunt } from '../../lib/permission_stubs';
import { HuntType, SavedDiscordObjectType } from '../../lib/schemas/hunt';
import { SettingType } from '../../lib/schemas/setting';
import { useBreadcrumb } from '../hooks/breadcrumb';
import ModalForm, { ModalFormHandle } from './ModalForm';

/* eslint-disable max-len */

const splitLists = function (lists: string): string[] {
  const strippedLists = lists.trim();
  if (strippedLists === '') {
    return [];
  }

  return strippedLists.split(/[, ]+/);
};

interface DiscordSelectorParams {
  disable: boolean;
  id: string;
  value: SavedDiscordObjectType | undefined;
  onChange: (next: SavedDiscordObjectType | undefined) => void;
}

interface DiscordSelectorProps extends DiscordSelectorParams {
  loading: boolean;
  options: SavedDiscordObjectType[];
}

const DiscordSelector = (props: DiscordSelectorProps) => {
  const {
    disable, value, onChange, loading, options,
  } = props;
  const onValueChanged: FormControlProps['onChange'] = useCallback((e) => {
    if (e.currentTarget.value === 'empty') {
      onChange(undefined);
    } else {
      const match = options.find((obj) => { return obj.id === e.currentTarget.value; });
      if (match) {
        onChange(match);
      }
    }
  }, [onChange, options]);

  const formOptions = useCallback((): SavedDiscordObjectType[] => {
    // List of the options.  Be sure to include the saved option if it's (for
    // some reason) not present in the channel list.
    const noneOption = {
      id: 'empty',
      name: 'disabled',
    } as SavedDiscordObjectType;

    if (value) {
      if (!options.find((opt) => {
        return opt.id === value!.id;
      })) {
        return [noneOption, value, ...options];
      }
    }
    return [noneOption, ...options];
  }, [value, options]);

  if (loading) {
    return <div>Loading discord resources...</div>;
  } else {
    return (
      <FormControl
        id={props.id}
        as="select"
        type="text"
        placeholder=""
        value={value && value.id}
        disabled={disable}
        onChange={onValueChanged}
      >
        {formOptions().map(({ id, name }) => {
          return (
            <option key={id} value={id}>{name}</option>
          );
        })}
      </FormControl>
    );
  }
};

const DiscordChannelSelector = (params: DiscordSelectorParams & { guildId: string }) => {
  const cacheLoading = useSubscribe('discord.cache', { type: 'channel' });
  const loading = cacheLoading();

  const { options } = useTracker(() => {
    const discordChannels: SavedDiscordObjectType[] = DiscordCache.find({
      type: 'channel',
      'object.guild': params.guildId,
      // We want only text channels, since those are the only ones we can bridge chat messages to.
      'object.type': 'text',
    }, {
      // We want to sort them in the same order they're provided in the Discord UI.
      sort: { 'object.rawPosition': 1 },
      fields: { 'object.id': 1, 'object.name': 1 },
    })
      .map((c) => c.object as SavedDiscordObjectType);

    return {
      options: discordChannels,
    };
  }, [params.guildId]);
  return (
    <DiscordSelector
      loading={loading}
      options={options}
      {...params}
    />
  );
};

const DiscordRoleSelector = (params: DiscordSelectorParams & { guildId: string }) => {
  const cacheLoading = useSubscribe('discord.cache', { type: 'role' });
  const loading = cacheLoading();
  const { options } = useTracker(() => {
    const discordRoles: SavedDiscordObjectType[] = DiscordCache.find({
      type: 'role',
      'object.guild': params.guildId,
      // The role whose id is the same as the guild is the @everyone role, don't want that
      'object.id': { $ne: params.guildId },
      // Managed roles are owned by an integration
      'object.managed': false,
    }, {
      // We want to sort them in the same order they're provided in the Discord UI.
      sort: { 'object.rawPosition': 1 },
      fields: { 'object.id': 1, 'object.name': 1 },
    })
      .map((c) => c.object as SavedDiscordObjectType);

    return {
      options: discordRoles,
    };
  }, [params.guildId]);
  return (
    <DiscordSelector
      loading={loading}
      options={options}
      {...params}
    />
  );
};

export interface HuntModalSubmit {
  // eslint-disable-next-line no-restricted-globals
  name: string;
  mailingLists: string[];
  signupMessage: string;
  openSignups: boolean;
  hasGuessQueue: boolean;
  homepageUrl: string;
  submitTemplate: string;
  puzzleHooksDiscordChannel: SavedDiscordObjectType | undefined;
  firehoseDiscordChannel: SavedDiscordObjectType | undefined;
  memberDiscordRole: SavedDiscordObjectType | undefined;
}

interface HuntModalFormProps {
  hunt?: HuntType;
  onSubmit: (state: HuntModalSubmit, callback: (error?: Error) => void) => void;
}

enum HuntModalFormSubmitState {
  IDLE = 'idle',
  SUBMITTING = 'submitting',
  FAILED = 'failed',
}

type HuntModalFormHandle = {
  show: () => void;
}

const HuntModalForm = React.forwardRef((props: HuntModalFormProps, forwardedRef: React.Ref<HuntModalFormHandle>) => {
  useSubscribe('mongo.settings', { name: 'discord.guild' });
  const guildId = useTracker(() => {
    const setting = Settings.findOne({ name: 'discord.guild' }) as SettingType & { name: 'discord.guild' } | undefined;
    return setting?.value.guild.id;
  }, []);

  const [submitState, setSubmitState] = useState<HuntModalFormSubmitState>(HuntModalFormSubmitState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [name, setName] = useState<string>(props.hunt?.name ?? '');
  const [mailingLists, setMailingLists] = useState<string>(props.hunt?.mailingLists.join(', ') ?? '');
  const [signupMessage, setSignupMessage] = useState<string>(props.hunt?.signupMessage ?? '');
  const [openSignups, setOpenSignups] = useState<boolean>(props.hunt?.openSignups ?? false);
  const [hasGuessQueue, setHasGuessQueue] = useState<boolean>(props.hunt?.hasGuessQueue ?? true);
  const [homepageUrl, setHomepageUrl] = useState<string>(props.hunt?.homepageUrl ?? '');
  const [submitTemplate, setSubmitTemplate] = useState<string>(props.hunt?.submitTemplate ?? '');
  const [puzzleHooksDiscordChannel, setPuzzleHooksDiscordChannel] = useState<SavedDiscordObjectType | undefined>(props.hunt?.puzzleHooksDiscordChannel);
  const [firehoseDiscordChannel, setFirehoseDiscordChannel] = useState<SavedDiscordObjectType | undefined>(props.hunt?.firehoseDiscordChannel);
  const [memberDiscordRole, setMemberDiscordRole] = useState<SavedDiscordObjectType | undefined>(props.hunt?.memberDiscordRole);

  const formRef = useRef<ModalFormHandle>(null);

  useImperativeHandle(forwardedRef, () => ({
    show: () => {
      if (formRef.current) {
        formRef.current.show();
      }
    },
  }));

  const onNameChanged: FormControlProps['onChange'] = useCallback((e) => {
    setName(e.currentTarget.value);
  }, []);

  const onMailingListsChanged: FormControlProps['onChange'] = useCallback((e) => {
    setMailingLists(e.currentTarget.value);
  }, []);

  const onSignupMessageChanged: FormControlProps['onChange'] = useCallback((e) => {
    setSignupMessage(e.currentTarget.value);
  }, []);

  const onOpenSignupsChanged = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setOpenSignups(e.currentTarget.checked);
  }, []);

  const onHasGuessQueueChanged = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setHasGuessQueue(e.currentTarget.checked);
  }, []);

  const onHomepageUrlChanged: FormControlProps['onChange'] = useCallback((e) => {
    setHomepageUrl(e.currentTarget.value);
  }, []);

  const onSubmitTemplateChanged: FormControlProps['onChange'] = useCallback((e) => {
    setSubmitTemplate(e.currentTarget.value);
  }, []);

  const onPuzzleHooksDiscordChannelChanged = useCallback((next: SavedDiscordObjectType | undefined) => {
    setPuzzleHooksDiscordChannel(next);
  }, []);

  const onFirehoseDiscordChannelChanged = useCallback((next: SavedDiscordObjectType | undefined) => {
    setFirehoseDiscordChannel(next);
  }, []);

  const onMemberDiscordRoleChanged = useCallback((next: SavedDiscordObjectType | undefined) => {
    setMemberDiscordRole(next);
  }, []);

  const onFormSubmit = (callback: () => void) => {
    setSubmitState(HuntModalFormSubmitState.SUBMITTING);
    const sendState: HuntModalSubmit = {
      name,
      mailingLists: splitLists(mailingLists),
      signupMessage,
      openSignups,
      hasGuessQueue,
      homepageUrl,
      submitTemplate,
      puzzleHooksDiscordChannel,
      firehoseDiscordChannel,
      memberDiscordRole,
    };

    props.onSubmit(sendState, (error?: Error) => {
      if (error) {
        setErrorMessage(error.message);
        setSubmitState(HuntModalFormSubmitState.FAILED);
      } else {
        setSubmitState(HuntModalFormSubmitState.IDLE);
        setErrorMessage('');
        callback();
      }
    });
  };

  const disableForm = submitState === HuntModalFormSubmitState.SUBMITTING;
  const idPrefix = props.hunt ? `jr-hunt-${props.hunt._id}-modal-` : 'jr-hunt-new-modal-';
  return (
    <ModalForm
      ref={formRef}
      title={props.hunt ? 'Edit Hunt' : 'New Hunt'}
      onSubmit={onFormSubmit}
      submitDisabled={disableForm}
    >
      <FormGroup as={Row}>
        <FormLabel column xs={3} htmlFor={`${idPrefix}name`}>
          Name
        </FormLabel>
        <Col xs={9}>
          <FormControl
            id={`${idPrefix}name`}
            type="text"
            value={name}
            onChange={onNameChanged}
            autoFocus
            disabled={disableForm}
          />
        </Col>
      </FormGroup>

      <h3>Users and permissions</h3>

      <FormGroup as={Row}>
        <FormLabel column xs={3} htmlFor={`${idPrefix}signup-message`}>
          Signup message
        </FormLabel>
        <Col xs={9}>
          <FormControl
            id={`${idPrefix}signup-message`}
            as="textarea"
            value={signupMessage}
            onChange={onSignupMessageChanged}
            disabled={disableForm}
          />
          <FormText>
            This message (rendered as markdown) will be shown to users who aren&apos;t part of the hunt. This is a good place to put directions for how to sign up.
          </FormText>
        </Col>
      </FormGroup>

      <FormGroup as={Row}>
        <FormLabel column xs={3} htmlFor={`${idPrefix}open-signups`}>
          Open invites
        </FormLabel>
        <Col xs={9}>
          <FormCheck
            id={`${idPrefix}open-signups`}
            checked={openSignups}
            onChange={onOpenSignupsChanged}
            disabled={disableForm}
          />
          <FormText>
            If open invites are enabled, then any current member of the hunt can add a new member to the hunt. Otherwise, only operators can add new members.
          </FormText>
        </Col>
      </FormGroup>

      <FormGroup as={Row}>
        <FormLabel column xs={3} htmlFor={`${idPrefix}has-guess-queue`}>
          Guess queue
        </FormLabel>
        <Col xs={9}>
          <FormCheck
            id={`${idPrefix}has-guess-queue`}
            checked={hasGuessQueue}
            onChange={onHasGuessQueueChanged}
            disabled={disableForm}
          />
          <FormText>
            If enabled, users can submit guesses for puzzles but operators must mark them as correct. If disabled, any user can enter the puzzle answer.
          </FormText>
        </Col>
      </FormGroup>

      <h3>Hunt website</h3>

      <FormGroup as={Row}>
        <FormLabel column xs={3} htmlFor={`${idPrefix}homepage-url`}>
          Homepage URL
        </FormLabel>
        <Col xs={9}>
          <FormControl
            id={`${idPrefix}homepage-url`}
            type="text"
            value={homepageUrl}
            onChange={onHomepageUrlChanged}
            disabled={disableForm}
          />
          <FormText>
            If provided, a link to the hunt homepage will be placed on the landing page.
          </FormText>
        </Col>
      </FormGroup>

      <FormGroup as={Row}>
        <FormLabel column xs={3} htmlFor={`${idPrefix}submit-template`}>
          Submit URL template
        </FormLabel>
        <Col xs={9}>
          <FormControl
            id={`${idPrefix}submit-template`}
            type="text"
            value={submitTemplate}
            onChange={onSubmitTemplateChanged}
            disabled={disableForm}
          />
          <FormText>
            If provided, this
            {' '}
            <a href="https://mustache.github.io/mustache.5.html">Mustache template</a>
            {' '}
            is used to generate the link to the guess submission page. It gets as context a
            {' '}
            <a href="https://developer.mozilla.org/en-US/docs/Web/API/URL">parsed URL</a>
            {', '}
            providing variables like
            {' '}
            <code>hostname</code>
            {' '}
            or
            {' '}
            <code>pathname</code>
            {'. '}
            Because this will be used as a link directly, make sure to use &quot;triple-mustaches&quot; so that the URL components aren&apos;t escaped. As an example, setting this to
            {' '}
            <code>{'{{{origin}}}/submit{{{pathname}}}'}</code>
            {' '}
            would work for the 2018 Mystery Hunt. If not specified, the puzzle URL is used as the link to the guess submission page.
          </FormText>
        </Col>
      </FormGroup>

      <h3>External integrations</h3>

      <FormGroup as={Row}>
        <FormLabel column xs={3} htmlFor={`${idPrefix}mailing-lists`}>
          Mailing lists
        </FormLabel>
        <Col xs={9}>
          <FormControl
            id={`${idPrefix}mailing-lists`}
            type="text"
            value={mailingLists}
            onChange={onMailingListsChanged}
            disabled={disableForm}
          />
          <FormText>
            Users joining this hunt will be automatically added to all of these (comma-separated) lists
          </FormText>
        </Col>
      </FormGroup>

      {guildId ? (
        <>
          <FormGroup as={Row}>
            <FormLabel column xs={3} htmlFor={`${idPrefix}puzzle-hooks-discord-channel`}>
              Puzzle notifications Discord channel
            </FormLabel>
            <Col xs={9}>
              <DiscordChannelSelector
                id={`${idPrefix}puzzle-hooks-discord-channel`}
                guildId={guildId}
                disable={disableForm}
                value={puzzleHooksDiscordChannel}
                onChange={onPuzzleHooksDiscordChannelChanged}
              />
              <FormText>
                If this field is specified, when a puzzle in this hunt is added or solved, a message will be sent to the specified channel.
              </FormText>
            </Col>
          </FormGroup>

          <FormGroup as={Row}>
            <FormLabel column xs={3} htmlFor={`${idPrefix}firehose-discord-channel`}>
              Firehose Discord channel
            </FormLabel>
            <Col xs={9}>
              <DiscordChannelSelector
                id={`${idPrefix}firehose-discord-channel`}
                guildId={guildId}
                disable={disableForm}
                value={firehoseDiscordChannel}
                onChange={onFirehoseDiscordChannelChanged}
              />
              <FormText>
                If this field is specified, all chat messages written in puzzles associated with this hunt will be mirrored to the specified Discord channel.
              </FormText>
            </Col>
          </FormGroup>

          <FormGroup as={Row}>
            <FormLabel column xs={3} htmlFor={`${idPrefix}member-discord-role`}>
              Discord role for members
            </FormLabel>
            <Col xs={9}>
              <DiscordRoleSelector
                id={`${idPrefix}member-discord-role`}
                guildId={guildId}
                disable={disableForm}
                value={memberDiscordRole}
                onChange={onMemberDiscordRoleChanged}
              />
              <FormText>
                If set, then members of the hunt that have linked their Discord profile are added to the specified Discord role. Note that for continuity, if this setting is changed, Jolly Roger will not touch the old role (e.g. to remove members)
              </FormText>
            </Col>
          </FormGroup>
        </>
      ) : (
        <Alert variant="info">
          <FontAwesomeIcon icon={faInfo} fixedWidth />
          Discord has not been configured, so Discord settings are disabled.
        </Alert>
      )}

      {submitState === HuntModalFormSubmitState.FAILED && <Alert variant="danger">{errorMessage}</Alert>}
    </ModalForm>
  );
});

interface HuntProps {
  hunt: HuntType;
}

const Hunt = React.memo((props: HuntProps) => {
  const { canUpdate, canDestroy } = useTracker(() => {
    const huntId = props.hunt._id;
    return {
      canUpdate: userMayUpdateHunt(Meteor.userId(), huntId),

      // Because we delete by setting the deleted flag, you only need
      // update to "remove" something
      canDestroy: userMayUpdateHunt(Meteor.userId(), huntId),
    };
  }, [props.hunt._id]);

  const editModalRef = useRef<React.ElementRef<typeof HuntModalForm>>(null);
  const deleteModalRef = useRef<ModalFormHandle>(null);

  const onEdit = useCallback((state: HuntModalSubmit, callback: (error?: Error) => void) => {
    Ansible.log('Updating hunt settings', { hunt: props.hunt._id, user: Meteor.userId(), state });
    Meteor.call('updateHunt', props.hunt._id, state, callback);
  }, [props.hunt._id]);

  const onDelete = useCallback((callback: () => void) => {
    Meteor.call('destroyHunt', props.hunt._id, (err?: Error) => {
      if (err) {
        Ansible.log('Failed to destroy hunt', { hunt: props.hunt._id, user: Meteor.userId() });
      }
      callback();
    });
  }, [props.hunt._id]);

  const showEditModal = useCallback(() => {
    if (editModalRef.current) {
      editModalRef.current.show();
    }
  }, []);

  const showDeleteModal = useCallback(() => {
    if (deleteModalRef.current) {
      deleteModalRef.current.show();
    }
  }, []);

  return (
    <li>
      <HuntModalForm
        ref={editModalRef}
        hunt={props.hunt}
        onSubmit={onEdit}
      />
      <ModalForm
        ref={deleteModalRef}
        title="Delete Hunt"
        submitLabel="Delete"
        submitStyle="danger"
        onSubmit={onDelete}
      >
        Are you sure you want to delete &quot;
        {props.hunt.name}
        &quot;? This will additionally delete all puzzles and associated state.
      </ModalForm>
      <ButtonGroup size="sm">
        {canUpdate ? (
          <Button onClick={showEditModal} variant="outline-secondary" title="Edit hunt...">
            <FontAwesomeIcon fixedWidth icon={faEdit} />
          </Button>
        ) : undefined}
        {canDestroy ? (
          <Button onClick={showDeleteModal} variant="danger" title="Delete hunt...">
            <FontAwesomeIcon fixedWidth icon={faMinus} />
          </Button>
        ) : undefined}
      </ButtonGroup>
      {' '}
      <Link to={`/hunts/${props.hunt._id}`}>
        {props.hunt.name}
      </Link>
    </li>
  );
});

const HuntListPage = () => {
  useBreadcrumb({ title: 'Hunts', path: '/hunts' });
  const huntsLoading = useSubscribe('mongo.hunts');
  const myHuntsLoading = useSubscribe('selfHuntMembership');
  const loading = huntsLoading() || myHuntsLoading();

  const { canAdd, hunts, myHunts } = useTracker(() => {
    return {
      canAdd: userMayCreateHunt(Meteor.userId()),
      hunts: Hunts.find({}, { sort: { createdAt: -1 } }).fetch(),
      myHunts: new Set(Meteor.user()?.hunts ?? []),
    };
  }, []);

  const addModalRef = useRef<HuntModalFormHandle>(null);

  const onAdd = useCallback((state: HuntModalSubmit, callback: (error?: Error) => void): void => {
    Ansible.log('Creating a new hunt', { user: Meteor.userId(), state });
    Meteor.call('createHunt', state, callback);
  }, []);

  const showAddModal = useCallback(() => {
    if (addModalRef.current) {
      addModalRef.current.show();
    }
  }, []);

  const body = [];
  if (loading) {
    body.push(<div key="loading">Loading...</div>);
  } else {
    const joinedHunts: JSX.Element[] = [];
    const otherHunts: JSX.Element[] = [];
    hunts.forEach((hunt) => {
      const huntTag = <Hunt key={hunt._id} hunt={hunt} />;
      if (myHunts.has(hunt._id)) {
        joinedHunts.push(huntTag);
      } else {
        otherHunts.push(huntTag);
      }
    });

    body.push(<h2 key="myhuntsheader">Hunts you are a member of:</h2>);
    if (joinedHunts.length > 0) {
      body.push(
        <ul key="myhunts">
          {joinedHunts}
        </ul>
      );
    } else {
      body.push(<div key="nomyhunts">You&apos;re not a member of any hunts yet.  Consider joining one, or asking an operator to invite you.</div>);
    }
    body.push(<h2 key="otherhuntsheader">Other hunts:</h2>);
    if (otherHunts.length > 0) {
      body.push(
        <ul key="otherhunts">
          {otherHunts}
        </ul>
      );
    } else {
      body.push(<div key="nootherhunts">There are no other hunts you haven&apos;t joined.</div>);
    }
  }

  return (
    <div id="jr-hunts">
      <h1>Hunts</h1>
      <HuntModalForm
        ref={addModalRef}
        onSubmit={onAdd}
      />
      {canAdd ? (
        <Button onClick={showAddModal} variant="success" size="sm" title="Add new hunt...">
          <FontAwesomeIcon icon={faPlus} />
        </Button>
      ) : undefined}
      {body}
    </div>
  );
};

export default HuntListPage;
