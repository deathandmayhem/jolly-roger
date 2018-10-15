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
import Glyphicon from 'react-bootstrap/lib/Glyphicon';
import HelpBlock from 'react-bootstrap/lib/HelpBlock';
import { Link } from 'react-router';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import Ansible from '../../ansible.js';
import JRPropTypes from '../JRPropTypes.js';
import navAggregatorType from './navAggregatorType.jsx';
import ModalForm from './ModalForm.jsx';

/* eslint-disable max-len */

const splitLists = function (lists) {
  const strippedLists = lists.trim();
  if (strippedLists === '') {
    return [];
  }

  return strippedLists.split(/[, ]+/);
};

const HuntModalForm = React.createClass({
  propTypes: {
    hunt: PropTypes.shape(Schemas.Hunts.asReactPropTypes()),
    onSubmit: PropTypes.func.isRequired, // Takes two args: state (object) and callback (func)
  },

  getInitialState() {
    const state = {
      submitState: 'idle',
      errorMessage: '',
    };
    if (this.props.hunt) {
      return _.extend(state, {
        name: this.props.hunt.name,
        mailingLists: this.props.hunt.mailingLists.join(', '),
        signupMessage: this.props.hunt.signupMessage,
        openSignups: this.props.hunt.openSignups,
        firehoseSlackChannel: this.props.hunt.firehoseSlackChannel,
        puzzleHooksSlackChannel: this.props.hunt.puzzleHooksSlackChannel,
      });
    } else {
      return _.extend(state, {
        name: '',
        mailingLists: '',
        signupMessage: '',
        openSignups: false,
        firehoseSlackChannel: '',
        puzzleHooksSlackChannel: '',
      });
    }
  },

  onNameChanged(e) {
    this.setState({
      name: e.target.value,
    });
  },

  onMailingListsChanged(e) {
    this.setState({
      mailingLists: e.target.value,
    });
  },

  onSignupMessageChanged(e) {
    this.setState({
      signupMessage: e.target.value,
    });
  },

  onOpenSignupsChanged(e) {
    this.setState({
      openSignups: e.target.checked,
    });
  },

  onFirehoseSlackChannelChanged(e) {
    this.setState({
      firehoseSlackChannel: e.target.value,
    });
  },

  onPuzzleHooksSlackChannelChanged(e) {
    this.setState({
      puzzleHooksSlackChannel: e.target.value,
    });
  },

  onFormSubmit(callback) {
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
        this.setState(this.getInitialState());
        callback();
      }
    });
  },

  show() {
    this.formNode.show();
  },

  render() {
    const disableForm = this.state.submitState === 'submitting';
    const idPrefix = this.props.hunt ? `jr-hunt-${this.props.hunt.id}-modal-` : 'jr-hunt-new-modal-';
    return (
      <ModalForm
        ref={(node) => { this.formNode = node; }}
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
              This message (rendered as markdown) will be shown to users who aren't part of the hunt. This is a good place to put directions for how to sign up.
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
              If provided, all chat messages written in puzzles associated with this hunt will be mirrored to the specified channel in Slack.  Make sure to include the # at the beginning of the channel name, like <code>#firehose</code>.
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
              If provided, when a puzzle in this hunt is added or solved, a message will be sent to the specified channel.  Make sure to include the # at the beginning of the channel name, like <code>#general</code>.
            </HelpBlock>
          </div>
        </FormGroup>

        {this.state.submitState === 'failed' && <Alert bsStyle="danger">{this.state.errorMessage}</Alert>}
      </ModalForm>
    );
  },
});

const Hunt = React.createClass({
  propTypes: {
    hunt: PropTypes.shape(Schemas.Hunts.asReactPropTypes()).isRequired,
  },

  mixins: [ReactMeteorData],

  onEdit(state, callback) {
    Ansible.log('Updating hunt settings', { hunt: this.props.hunt._id, user: Meteor.userId(), state });
    Models.Hunts.update(
      { _id: this.props.hunt._id },
      { $set: state },
      callback
    );
  },

  onDelete(callback) {
    Models.Hunts.destroy(this.props.hunt._id, callback);
  },

  getMeteorData() {
    return {
      canUpdate: Roles.userHasPermission(Meteor.userId(), 'mongo.hunts.update'),

      // Because we delete by setting the deleted flag, you only need
      // update to "remove" something
      canDestroy: Roles.userHasPermission(Meteor.userId(), 'mongo.hunts.update'),
    };
  },

  showEditModal() {
    this.editModalNode.show();
  },

  showDeleteModal() {
    this.deleteModalNode.show();
  },

  editButton() {
    if (this.data.canUpdate) {
      return (
        <Button onClick={this.showEditModal} bsStyle="default" title="Edit hunt...">
          <Glyphicon glyph="edit" />
        </Button>
      );
    }

    return undefined;
  },

  deleteButton() {
    if (this.data.canDestroy) {
      return (
        <Button onClick={this.showDeleteModal} bsStyle="danger" title="Delete hunt...">
          <Glyphicon glyph="remove" />
        </Button>
      );
    }

    return undefined;
  },

  render() {
    const hunt = this.props.hunt;
    return (
      <li>
        <HuntModalForm
          ref={(node) => { this.editModalNode = node; }}
          hunt={this.props.hunt}
          onSubmit={this.onEdit}
        />
        <ModalForm
          ref={(node) => { this.deleteModalNode = node; }}
          title="Delete Hunt"
          submitLabel="Delete"
          submitStyle="danger"
          onSubmit={this.onDelete}
        >
          Are you sure you want to delete "{this.props.hunt.name}"?
          This will additionally delete all puzzles and associated
          state.
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
  },
});

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

const HuntListPage = React.createClass({
  contextTypes: {
    subs: JRPropTypes.subs,
    navAggregator: navAggregatorType,
  },

  mixins: [ReactMeteorData],

  onAdd(state, callback) {
    Ansible.log('Creating a new hunt', { user: Meteor.userId(), state });
    Models.Hunts.insert(state, callback);
  },

  getMeteorData() {
    const huntListHandle = this.context.subs.subscribe('mongo.hunts');
    const myHuntsHandle = this.context.subs.subscribe('selfHuntMembership');
    const ready = huntListHandle.ready() && myHuntsHandle.ready();

    const myHunts = {};
    if (ready) {
      Meteor.user().hunts.forEach((hunt) => { myHunts[hunt] = true; });
    }

    return {
      ready,
      canAdd: Roles.userHasPermission(Meteor.userId(), 'mongo.hunts.insert'),
      hunts: Models.Hunts.find({}, { sort: { createdAt: -1 } }).fetch(),
      myHunts,
    };
  },

  showAddModal() {
    this.addModalNode.show();
  },

  addButton() {
    if (this.data.canAdd) {
      return (
        <Button onClick={this.showAddModal} bsStyle="success" bsSize="xs" title="Add new hunt...">
          <Glyphicon glyph="plus" />
        </Button>
      );
    }

    return undefined;
  },

  render() {
    const body = [];
    if (this.data.ready) {
      const joinedHunts = [];
      const otherHunts = [];
      this.data.hunts.forEach((hunt) => {
        const huntTag = <Hunt key={hunt._id} hunt={hunt} />;
        if (this.data.myHunts[hunt._id]) {
          joinedHunts.push(huntTag);
        } else {
          otherHunts.push(huntTag);
        }
      });

      body.push(<h2 key="myhuntsheader">Hunts you are a member of:</h2>);
      if (joinedHunts.length > 0) {
        body.push(<ul key="myhunts">
          {joinedHunts}
        </ul>);
      } else {
        body.push(<div key="nomyhunts">You're not a member of any hunts yet.  Consider joining one, or asking an operator to invite you.</div>);
      }
      body.push(<h2 key="otherhuntsheader">Other hunts:</h2>);
      if (otherHunts.length > 0) {
        body.push(<ul key="otherhunts">
          {otherHunts}
        </ul>);
      } else {
        body.push(<div key="nootherhunts">There are no other hunts you haven't joined.</div>);
      }
    } else {
      body.push(<div key="loading">Loading...</div>);
    }

    return (
      <this.context.navAggregator.NavItem
        itemKey="hunts"
        to="/hunts"
        label="Hunts"
      >
        <div id="jr-hunts">
          <h1>Hunts</h1>
          <HuntModalForm
            ref={(node) => { this.addModalNode = node; }}
            onSubmit={this.onAdd}
          />
          {this.addButton()}
          {body}
        </div>
      </this.context.navAggregator.NavItem>
    );
  },
});

export default HuntListPage;
