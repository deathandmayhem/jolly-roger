import { Meteor } from 'meteor/meteor';
import React from 'react';
import { Link } from 'react-router';
import BS from 'react-bootstrap';
import Ansible from '/imports/ansible.js';
// import { huntFixtures } from '/imports/fixtures.js';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
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

const HuntFormModal = React.createClass({
  propTypes: {
    hunt: React.PropTypes.instanceOf(Transforms.Hunt),
    onSubmit: React.PropTypes.func, // Takes two args: state (object) and callback (func)
  },

  getInitialState() {
    if (this.props.hunt) {
      return {
        name: this.props.hunt.name,
        mailingLists: this.props.hunt.mailingLists.join(', '),
        signupMessage: this.props.hunt.signupMessage,
        openSignups: this.props.hunt.openSignups,
        slackChannel: this.props.hunt.slackChannel,
      };
    } else {
      return {
        name: '',
        mailingLists: '',
        signupMessage: '',
        openSignups: false,
        slackChannel: '',
      };
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

  onSlackChannelChanged(e) {
    this.setState({
      slackChannel: e.target.value,
    });
  },

  onFormSubmit(callback) {
    if (this.props.onSubmit) {
      this.props.onSubmit(this.state, callback);
    } else {
      callback();
    }
  },

  show() {
    this.formNode.show();
  },

  render() {
    const idPrefix = this.props.hunt ? `jr-hunt-${this.props.hunt.id}-modal-` : 'jr-hunt-new-modal-';
    return (
      <ModalForm
        ref={(node) => { this.formNode = node; }}
        title={this.props.hunt ? 'Edit Hunt' : 'New Hunt'}
        onSubmit={this.onFormSubmit}
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
            />
            <BS.HelpBlock>
              This message (rendered as markdown) will be shown to users who aren't part of the hunt. This is a good place to put directions for how to sign up.
            </BS.HelpBlock>
          </div>
        </BS.FormGroup>

        <BS.FormGroup>
          <BS.ControlLabel htmlFor={`${idPrefix}open-signups`} className="col-xs-3">
            Open signups
          </BS.ControlLabel>
          <div className="col-xs-9">
            <BS.Checkbox
              id={`${idPrefix}open-signups`}
              checked={this.state.openSignups}
              onChange={this.onOpenSignupsChanged}
            />
            <BS.HelpBlock>
              If open signups are enabled, then any current member of the hunt can add a new member to the hunt. Otherwise, only operators can add new members.
            </BS.HelpBlock>
          </div>
        </BS.FormGroup>

        <BS.FormGroup>
          <BS.ControlLabel htmlFor={`${idPrefix}slack-channel`} className="col-xs-3">
            Slack channel
          </BS.ControlLabel>
          <div className="col-xs-9">
            <BS.FormControl
              id={`${idPrefix}slack-channel`}
              type="text"
              value={this.state.slackChannel}
              onChange={this.onSlackChannelChanged}
            />
            <BS.HelpBlock>
              If provided, all chat messages written in puzzles associated with this hunt will be mirrored to the specified channel in Slack.  Make sure to include the # at the beginning of the channel name, like <code>#firehose</code>.
            </BS.HelpBlock>
          </div>
        </BS.FormGroup>
      </ModalForm>
    );
  },
});

const Hunt = React.createClass({
  propTypes: {
    hunt: React.PropTypes.instanceOf(Transforms.Hunt).isRequired,
  },

  mixins: [ReactMeteorData],

  onEdit(state, callback) {
    const { name, mailingLists, signupMessage, openSignups, slackChannel } = state;
    Ansible.log('Updating hunt settings', { hunt: this.props.hunt._id, user: Meteor.userId(), mailingLists, openSignups, slackChannel });
    Models.Hunts.update(
      { _id: this.props.hunt._id },
      {
        $set: {
          name,
          mailingLists: splitLists(mailingLists),
          signupMessage,
          openSignups,
          slackChannel,
        },
      },
      callback
    );
  },

  onDelete(callback) {
    this.props.hunt.destroy(callback);
  },

  getMeteorData() {
    return {
      isOperator: Roles.userHasRole(Meteor.userId(), 'admin'),
      canUpdate: Roles.userHasPermission(Meteor.userId(), 'mongo.hunts.update'),
      canRemove: Roles.userHasPermission(Meteor.userId(), 'mongo.hunts.remove'),
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
    if (this.data.canRemove) {
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
        <HuntFormModal
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
        <Link to={this.data.isOperator ? `/hunts/${hunt._id}` : `/hunts/${hunt._id}/puzzles`}>
          {hunt.name}
        </Link>
        <BS.ButtonGroup bsSize="xs">
          {this.editButton()}
          {this.deleteButton()}
        </BS.ButtonGroup>
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
  },

  mixins: [ReactMeteorData],

  onAdd(state, callback) {
    const { name, mailingLists, signupMessage, openSignups, slackChannel } = state;
    Ansible.log('Creating a new hunt', { name, user: Meteor.userId(), mailingLists });
    Models.Hunts.insert({
      name,
      mailingLists: splitLists(mailingLists),
      signupMessage,
      openSignups,
      slackChannel,
    }, callback);
  },

  getMeteorData() {
    const huntListHandle = this.context.subs.subscribe('mongo.hunts');
    const myHuntsHandle = this.context.subs.subscribe('huntMembership');
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
    //  Insert mock data from 2015 hunt.
    // _.each(huntFixtures, (mockData, id) => {
    //   hunts.push(<MockHunt key={id} hunt={mockData}/>);
    // });

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
      <div id="jr-hunts">
        <h1>Hunts</h1>
        <HuntFormModal
          ref={(node) => { this.addModalNode = node; }}
          onSubmit={this.onAdd}
        />
        {this.addButton()}
        {body}
      </div>
    );
  },
});

export { HuntListPage };
