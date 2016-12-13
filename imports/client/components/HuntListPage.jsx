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
      };
    } else {
      return {
        name: '',
        mailingLists: '',
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
              id={`${idPrefix}name`}
              type="text"
              value={this.state.mailingLists}
              onChange={this.onMailingListsChanged}
            />
            <BS.HelpBlock>
              Users joining this hunt will be automatically added to all of these (comma-separated) lists
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
    const { name, mailingLists } = state;
    Ansible.log('Updating hunt settings', { hunt: this.props.hunt._id, user: Meteor.userId(), mailingLists });
    Models.Hunts.update(
      { _id: this.props.hunt._id },
      {
        $set: {
          name,
          mailingLists: this.splitLists(mailingLists),
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
    const { name, mailingLists } = state;
    Ansible.log('Creating a new hunt', { name, user: Meteor.userId(), mailingLists });
    Models.Hunts.insert({
      name,
      mailingLists: splitLists(mailingLists),
    }, callback);
  },

  getMeteorData() {
    this.context.subs.subscribe('mongo.hunts');
    return {
      canAdd: Roles.userHasPermission(Meteor.userId(), 'mongo.hunts.insert'),
      hunts: Models.Hunts.find().fetch(),
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
    const hunts = this.data.hunts.map((hunt) => {
      return <Hunt key={hunt._id} hunt={hunt} />;
    });

    //  Insert mock data from 2015 hunt.
    // _.each(huntFixtures, (mockData, id) => {
    //   hunts.push(<MockHunt key={id} hunt={mockData}/>);
    // });

    return (
      <div id="jr-hunts">
        <h1>Hunts</h1>
        <HuntFormModal
          ref={(node) => { this.addModalNode = node; }}
          onSubmit={this.onAdd}
        />
        {this.addButton()}
        <ul>
          {hunts}
        </ul>
      </div>
    );
  },
});

export { HuntListPage };
