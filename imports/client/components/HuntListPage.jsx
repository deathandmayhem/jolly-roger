import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import React from 'react';
import { Link } from 'react-router';
import BS from 'react-bootstrap';
import Ansible from '/imports/ansible.js';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
import { navAggregatorType } from '/imports/client/components/NavAggregator.jsx';
import { ModalForm } from '/imports/client/components/ModalForm.jsx';
import { ReactMeteorData } from 'meteor/react-meteor-data';

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
    hunt: React.PropTypes.shape(Schemas.Hunts.asReactPropTypes()),
    onSubmit: React.PropTypes.func.isRequired, // Takes two args: state (object) and callback (func)
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
        <BS.FormGroup>
          <BS.ControlLabel htmlFor={`${idPrefix}name`} className="col-xs-3">
            Name
          </BS.ControlLabel>
          <div className="col-xs-9">
            <BS.FormControl
              id={`${idPrefix}name`}
              type="text"
              value={this.state.name}
              onChange={this.onNameChanged}
              autoFocus
              disabled={disableForm}
            />
          </div>
        </BS.FormGroup>

        <BS.FormGroup>
          <BS.ControlLabel htmlFor={`${idPrefix}mailing-lists`} className="col-xs-3">
            Mailing lists
          </BS.ControlLabel>
          <div className="col-xs-9">
            <BS.FormControl
              id={`${idPrefix}mailing-lists`}
              type="text"
              value={this.state.mailingLists}
              onChange={this.onMailingListsChanged}
              disabled={disableForm}
            />
            <BS.HelpBlock>
              Users joining this hunt will be automatically added to all of these (comma-separated) lists
            </BS.HelpBlock>
          </div>
        </BS.FormGroup>

        <BS.FormGroup>
          <BS.ControlLabel htmlFor={`${idPrefix}signup-message`} className="col-xs-3">
            Signup message
          </BS.ControlLabel>
          <div className="col-xs-9">
            <BS.FormControl
              id={`${idPrefix}signup-message`}
              componentClass="textarea"
              value={this.state.signupMessage}
              onChange={this.onSignupMessageChanged}
              disabled={disableForm}
            />
            <BS.HelpBlock>
              This message (rendered as markdown) will be shown to users who aren't part of the hunt. This is a good place to put directions for how to sign up.
            </BS.HelpBlock>
          </div>
        </BS.FormGroup>

        <BS.FormGroup>
          <BS.ControlLabel htmlFor={`${idPrefix}open-signups`} className="col-xs-3">
            Open invites
          </BS.ControlLabel>
          <div className="col-xs-9">
            <BS.Checkbox
              id={`${idPrefix}open-signups`}
              checked={this.state.openSignups}
              onChange={this.onOpenSignupsChanged}
              disabled={disableForm}
            />
            <BS.HelpBlock>
              If open invites are enabled, then any current member of the hunt can add a new member to the hunt. Otherwise, only operators can add new members.
            </BS.HelpBlock>
          </div>
        </BS.FormGroup>

        <BS.FormGroup>
          <BS.ControlLabel htmlFor={`${idPrefix}firehose-slack-channel`} className="col-xs-3">
            Firehose Slack channel
          </BS.ControlLabel>
          <div className="col-xs-9">
            <BS.FormControl
              id={`${idPrefix}firehose-slack-channel`}
              type="text"
              value={this.state.firehoseSlackChannel}
              onChange={this.onFirehoseSlackChannelChanged}
              disabled={disableForm}
            />
            <BS.HelpBlock>
              If provided, all chat messages written in puzzles associated with this hunt will be mirrored to the specified channel in Slack.  Make sure to include the # at the beginning of the channel name, like <code>#firehose</code>.
            </BS.HelpBlock>
          </div>
        </BS.FormGroup>

        <BS.FormGroup>
          <BS.ControlLabel htmlFor={`${idPrefix}puzzle-hooks-slack-channel`} className="col-xs-3">
            Puzzle added/solved Slack channel
          </BS.ControlLabel>
          <div className="col-xs-9">
            <BS.FormControl
              id={`${idPrefix}puzzle-hooks-slack-channel`}
              type="text"
              value={this.state.puzzleHooksSlackChannel}
              onChange={this.onPuzzleHooksSlackChannelChanged}
            />
            <BS.HelpBlock>
              If provided, when a puzzle in this hunt is added or solved, a message will be sent to the specified channel.  Make sure to include the # at the beginning of the channel name, like <code>#general</code>.
            </BS.HelpBlock>
          </div>
        </BS.FormGroup>

        {this.state.submitState === 'failed' && <BS.Alert bsStyle="danger">{this.state.errorMessage}</BS.Alert>}
      </ModalForm>
    );
  },
});

const Hunt = React.createClass({
  propTypes: {
    hunt: React.PropTypes.shape(Schemas.Hunts.asReactPropTypes()).isRequired,
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
      isOperator: Roles.userHasRole(Meteor.userId(), 'admin'),
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
        <BS.Button onClick={this.showEditModal} bsStyle="default" title="Edit hunt...">
          <BS.Glyphicon glyph="edit" />
        </BS.Button>
      );
    }

    return undefined;
  },

  deleteButton() {
    if (this.data.canDestroy) {
      return (
        <BS.Button onClick={this.showDeleteModal} bsStyle="danger" title="Delete hunt...">
          <BS.Glyphicon glyph="remove" />
        </BS.Button>
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
        <BS.ButtonGroup bsSize="xs">
          {this.editButton()}
          {this.deleteButton()}
        </BS.ButtonGroup>
        {' '}
        <Link to={this.data.isOperator ? `/hunts/${hunt._id}` : `/hunts/${hunt._id}/puzzles`}>
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
        <BS.Button onClick={this.showAddModal} bsStyle="success" bsSize="xs" title="Add new hunt...">
          <BS.Glyphicon glyph="plus" />
        </BS.Button>
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

export { HuntListPage };
