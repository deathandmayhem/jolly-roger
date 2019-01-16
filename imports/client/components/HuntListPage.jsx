import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import PropTypes from 'prop-types';
import React from 'react';
import Alert from 'react-bootstrap/lib/Alert';
import Button from 'react-bootstrap/lib/Button';
import ButtonGroup from 'react-bootstrap/lib/ButtonGroup';
import Checkbox from 'react-bootstrap/lib/Checkbox';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import FormControl from 'react-bootstrap/lib/FormControl';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import HelpBlock from 'react-bootstrap/lib/HelpBlock';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router';
import { withTracker } from 'meteor/react-meteor-data';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import Ansible from '../../ansible';
import subsCache from '../subsCache';
import ModalForm from './ModalForm';
import HuntsSchema from '../../lib/schemas/hunts';
import Hunts from '../../lib/models/hunts';

/* eslint-disable max-len */

const splitLists = function (lists) {
  const strippedLists = lists.trim();
  if (strippedLists === '') {
    return [];
  }

  return strippedLists.split(/[, ]+/);
};

class HuntModalForm extends React.Component {
  static propTypes = {
    hunt: PropTypes.shape(HuntsSchema.asReactPropTypes()),
    onSubmit: PropTypes.func.isRequired, // Takes two args: state (object) and callback (func)
  };

  constructor(props, context) {
    super(props, context);
    this.state = this.initialState();
    this.formRef = React.createRef();
  }

  initialState = () => {
    const state = {
      submitState: 'idle',
      errorMessage: '',
    };
    if (this.props.hunt) {
      return _.extend(state, {
        name: this.props.hunt.name || '',
        mailingLists: this.props.hunt.mailingLists.join(', ') || '',
        signupMessage: this.props.hunt.signupMessage || '',
        openSignups: this.props.hunt.openSignups || false,
        submitTemplate: this.props.hunt.submitTemplate || '',
        firehoseSlackChannel: this.props.hunt.firehoseSlackChannel || '',
        puzzleHooksSlackChannel: this.props.hunt.puzzleHooksSlackChannel || '',
      });
    } else {
      return _.extend(state, {
        name: '',
        mailingLists: '',
        signupMessage: '',
        openSignups: false,
        submitTemplate: '',
        firehoseSlackChannel: '',
        puzzleHooksSlackChannel: '',
      });
    }
  };

  onNameChanged = (e) => {
    this.setState({
      name: e.target.value,
    });
  };

  onMailingListsChanged = (e) => {
    this.setState({
      mailingLists: e.target.value,
    });
  };

  onSignupMessageChanged = (e) => {
    this.setState({
      signupMessage: e.target.value,
    });
  };

  onOpenSignupsChanged = (e) => {
    this.setState({
      openSignups: e.target.checked,
    });
  };

  onSubmitTemplateChanged = (e) => {
    this.setState({
      submitTemplate: e.target.value,
    });
  }

  onFirehoseSlackChannelChanged = (e) => {
    this.setState({
      firehoseSlackChannel: e.target.value,
    });
  };

  onPuzzleHooksSlackChannelChanged = (e) => {
    this.setState({
      puzzleHooksSlackChannel: e.target.value,
    });
  };

  onFormSubmit = (callback) => {
    this.setState({ submitState: 'submitting' });
    const state = _.extend(
      {},
      _.omit(this.state, 'submitState', 'errorMessage'),
      { mailingLists: splitLists(this.state.mailingLists) },
    );
    this.props.onSubmit(state, (error) => {
      if (error) {
        this.setState({
          submitState: 'failed',
          errorMessage: error.message,
        });
      } else {
        this.setState(this.initialState());
        callback();
      }
    });
  };

  show = () => {
    this.formRef.current.show();
  };


  render() {
    const disableForm = this.state.submitState === 'submitting';
    const idPrefix = this.props.hunt ? `jr-hunt-${this.props.hunt.id}-modal-` : 'jr-hunt-new-modal-';
    return (
      <ModalForm
        ref={this.formRef}
        title={this.props.hunt ? 'Edit Hunt' : 'New Hunt'}
        onSubmit={this.onFormSubmit}
        submitDisabled={disableForm}
      >
        <FormGroup>
          <ControlLabel htmlFor={`${idPrefix}name`} className="col-xs-3">
            Name
          </ControlLabel>
          <div className="col-xs-9">
            <FormControl
              id={`${idPrefix}name`}
              type="text"
              value={this.state.name}
              onChange={this.onNameChanged}
              autoFocus
              disabled={disableForm}
            />
          </div>
        </FormGroup>

        <FormGroup>
          <ControlLabel htmlFor={`${idPrefix}mailing-lists`} className="col-xs-3">
            Mailing lists
          </ControlLabel>
          <div className="col-xs-9">
            <FormControl
              id={`${idPrefix}mailing-lists`}
              type="text"
              value={this.state.mailingLists}
              onChange={this.onMailingListsChanged}
              disabled={disableForm}
            />
            <HelpBlock>
              Users joining this hunt will be automatically added to all of these (comma-separated) lists
            </HelpBlock>
          </div>
        </FormGroup>

        <FormGroup>
          <ControlLabel htmlFor={`${idPrefix}signup-message`} className="col-xs-3">
            Signup message
          </ControlLabel>
          <div className="col-xs-9">
            <FormControl
              id={`${idPrefix}signup-message`}
              componentClass="textarea"
              value={this.state.signupMessage}
              onChange={this.onSignupMessageChanged}
              disabled={disableForm}
            />
            <HelpBlock>
              This message (rendered as markdown) will be shown to users who aren&apos;t part of the hunt. This is a good place to put directions for how to sign up.
            </HelpBlock>
          </div>
        </FormGroup>

        <FormGroup>
          <ControlLabel htmlFor={`${idPrefix}open-signups`} className="col-xs-3">
            Open invites
          </ControlLabel>
          <div className="col-xs-9">
            <Checkbox
              id={`${idPrefix}open-signups`}
              checked={this.state.openSignups}
              onChange={this.onOpenSignupsChanged}
              disabled={disableForm}
            />
            <HelpBlock>
              If open invites are enabled, then any current member of the hunt can add a new member to the hunt. Otherwise, only operators can add new members.
            </HelpBlock>
          </div>
        </FormGroup>

        <FormGroup>
          <ControlLabel htmlFor={`${idPrefix}submit-template`} className="col-xs-3">
            Submit URL template
          </ControlLabel>
          <div className="col-xs-9">
            <FormControl
              id={`${idPrefix}submit-template`}
              type="text"
              value={this.state.submitTemplate}
              onChange={this.onSubmitTemplateChanged}
              disabled={disableForm}
            />
            <HelpBlock>
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
            </HelpBlock>
          </div>
        </FormGroup>


        <FormGroup>
          <ControlLabel htmlFor={`${idPrefix}firehose-slack-channel`} className="col-xs-3">
            Firehose Slack channel
          </ControlLabel>
          <div className="col-xs-9">
            <FormControl
              id={`${idPrefix}firehose-slack-channel`}
              type="text"
              value={this.state.firehoseSlackChannel}
              onChange={this.onFirehoseSlackChannelChanged}
              disabled={disableForm}
            />
            <HelpBlock>
              If provided, all chat messages written in puzzles associated with this hunt will be mirrored to the specified channel in Slack.  Make sure to include the # at the beginning of the channel name, like
              {' '}
              <code>#firehose</code>
              .
            </HelpBlock>
          </div>
        </FormGroup>

        <FormGroup>
          <ControlLabel htmlFor={`${idPrefix}puzzle-hooks-slack-channel`} className="col-xs-3">
            Puzzle added/solved Slack channel
          </ControlLabel>
          <div className="col-xs-9">
            <FormControl
              id={`${idPrefix}puzzle-hooks-slack-channel`}
              type="text"
              value={this.state.puzzleHooksSlackChannel}
              onChange={this.onPuzzleHooksSlackChannelChanged}
            />
            <HelpBlock>
              If provided, when a puzzle in this hunt is added or solved, a message will be sent to the specified channel.  Make sure to include the # at the beginning of the channel name, like
              {' '}
              <code>#general</code>
              .
            </HelpBlock>
          </div>
        </FormGroup>

        {this.state.submitState === 'failed' && <Alert bsStyle="danger">{this.state.errorMessage}</Alert>}
      </ModalForm>
    );
  }
}

class Hunt extends React.Component {
  static propTypes = {
    hunt: PropTypes.shape(HuntsSchema.asReactPropTypes()).isRequired,
    canUpdate: PropTypes.bool.isRequired,
    canDestroy: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);
    this.editModalRef = React.createRef();
    this.deleteModalRef = React.createRef();
  }

  onEdit = (state, callback) => {
    Ansible.log('Updating hunt settings', { hunt: this.props.hunt._id, user: Meteor.userId(), state });
    Hunts.update(
      { _id: this.props.hunt._id },
      { $set: state },
      callback
    );
  };

  onDelete = (callback) => {
    Hunts.destroy(this.props.hunt._id, callback);
  };

  showEditModal = () => {
    this.editModalRef.current.show();
  };

  showDeleteModal = () => {
    this.deleteModalRef.current.show();
  };

  editButton = () => {
    if (this.props.canUpdate) {
      return (
        <Button onClick={this.showEditModal} bsStyle="default" title="Edit hunt...">
          <FontAwesomeIcon fixedWidth icon={faEdit} />
        </Button>
      );
    }

    return undefined;
  };

  deleteButton = () => {
    if (this.props.canDestroy) {
      return (
        <Button onClick={this.showDeleteModal} bsStyle="danger" title="Delete hunt...">
          <FontAwesomeIcon fixedWidth icon={faMinus} />
        </Button>
      );
    }

    return undefined;
  };

  render() {
    const hunt = this.props.hunt;
    return (
      <li>
        <HuntModalForm
          ref={this.editModalRef}
          hunt={this.props.hunt}
          onSubmit={this.onEdit}
        />
        <ModalForm
          ref={this.deleteModalRef}
          title="Delete Hunt"
          submitLabel="Delete"
          submitStyle="danger"
          onSubmit={this.onDelete}
        >
          Are you sure you want to delete &quot;
          {this.props.hunt.name}
          &quot;? This will additionally delete all puzzles and associated state.
        </ModalForm>
        <ButtonGroup bsSize="xs">
          {this.editButton()}
          {this.deleteButton()}
        </ButtonGroup>
        {' '}
        <Link to={`/hunts/${hunt._id}`}>
          {hunt.name}
        </Link>
      </li>
    );
  }
}

const HuntContainer = withTracker(() => {
  return {
    canUpdate: Roles.userHasPermission(Meteor.userId(), 'mongo.hunts.update'),

    // Because we delete by setting the deleted flag, you only need
    // update to "remove" something
    canDestroy: Roles.userHasPermission(Meteor.userId(), 'mongo.hunts.update'),
  };
})(Hunt);

/*
const MockHunt = React.createClass({
  render() {
    return (
      <li>
        <Link to={`/hunts/${this.props.hunt._id}`}>{this.props.hunt.title} (mock data)</Link>
      </li>
    );
  },
});
*/

class HuntListPage extends React.Component {
  static propTypes = {
    ready: PropTypes.bool.isRequired,
    canAdd: PropTypes.bool.isRequired,
    hunts: PropTypes.arrayOf(PropTypes.shape(HuntsSchema.asReactPropTypes())).isRequired,
    myHunts: PropTypes.objectOf(PropTypes.bool).isRequired,
  };

  constructor(props) {
    super(props);
    this.addModalRef = React.createRef();
  }

  onAdd = (state, callback) => {
    Ansible.log('Creating a new hunt', { user: Meteor.userId(), state });
    Hunts.insert(state, callback);
  };

  showAddModal = () => {
    this.addModalRef.current.show();
  };

  addButton = () => {
    if (this.props.canAdd) {
      return (
        <Button onClick={this.showAddModal} bsStyle="success" bsSize="xs" title="Add new hunt...">
          <FontAwesomeIcon icon={faPlus} />
        </Button>
      );
    }

    return undefined;
  };

  render() {
    const body = [];
    if (this.props.ready) {
      const joinedHunts = [];
      const otherHunts = [];
      this.props.hunts.forEach((hunt) => {
        const huntTag = <HuntContainer key={hunt._id} hunt={hunt} />;
        if (this.props.myHunts[hunt._id]) {
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
    } else {
      body.push(<div key="loading">Loading...</div>);
    }

    return (
      <div id="jr-hunts">
        <h1>Hunts</h1>
        <HuntModalForm
          ref={this.addModalRef}
          onSubmit={this.onAdd}
        />
        {this.addButton()}
        {body}
      </div>
    );
  }
}

const crumb = withBreadcrumb({ title: 'Hunts', link: '/hunts' });
const tracker = withTracker(() => {
  const huntListHandle = subsCache.subscribe('mongo.hunts');
  const myHuntsHandle = subsCache.subscribe('selfHuntMembership');
  const ready = huntListHandle.ready() && myHuntsHandle.ready();

  const myHunts = {};
  if (ready) {
    Meteor.user().hunts.forEach((hunt) => { myHunts[hunt] = true; });
  }

  return {
    ready,
    canAdd: Roles.userHasPermission(Meteor.userId(), 'mongo.hunts.insert'),
    hunts: Hunts.find({}, { sort: { createdAt: -1 } }).fetch(),
    myHunts,
  };
});

export default _.compose(crumb, tracker)(HuntListPage);
