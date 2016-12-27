import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import React from 'react';
import BS from 'react-bootstrap';
import DocumentTitle from 'react-document-title';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import marked from 'marked';

const HuntDeletedError = React.createClass({
  propTypes: {
    huntId: React.PropTypes.string.isRequired,
  },

  contextTypes: {
    router: React.PropTypes.object.isRequired,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    return {
      hunt: Models.Hunts.findOneDeleted(this.props.huntId),
      canUndestroy: Roles.userHasPermission(Meteor.userId(), 'mongo.hunts.update'),
    };
  },

  undestroy() {
    this.data.hunt.undestroy();
  },

  undestroyButton() {
    if (this.data.canUndestroy) {
      return (
        <BS.Button bsStyle="primary" onClick={this.undestroy}>
          Undelete this hunt
        </BS.Button>
      );
    }
    return null;
  },

  render() {
    return (
      <div>
        <BS.Alert bsStyle="danger">
        This hunt has been deleted, so there's nothing much to see here anymore.
        </BS.Alert>

        <BS.ButtonToolbar>
          <BS.Button bsStyle="default" onClick={this.context.router.goBack}>
            Whoops! Get me out of here
          </BS.Button>
          {this.undestroyButton()}
        </BS.ButtonToolbar>
      </div>
    );
  },
});

const HuntMemberError = React.createClass({
  propTypes: {
    huntId: React.PropTypes.string.isRequired,
  },

  contextTypes: {
    router: React.PropTypes.object.isRequired,
    subs: JRPropTypes.subs,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    return {
      hunt: Models.Hunts.findOne(this.props.huntId),
      canJoin: Roles.userHasPermission(Meteor.userId(), 'hunt.join', this.props.huntId),
    };
  },

  join() {
    Meteor.call('addToHunt', this.props.huntId, Meteor.user().emails[0].address);
  },

  joinButton() {
    if (this.data.canJoin) {
      return (
        <BS.Button bsStyle="primary" onClick={this.join}>
          Use operator permissions to join
        </BS.Button>
      );
    }
    return null;
  },

  render() {
    const msg = marked(this.data.hunt.signupMessage || '', { sanitize: true });
    return (
      <div>
        <BS.Alert bsStyle="warning">
          You're not signed up for this hunt ({this.data.hunt.name}) yet.
        </BS.Alert>

        <div dangerouslySetInnerHTML={{ __html: msg }} />

        <BS.ButtonToolbar>
          <BS.Button bsStyle="default" onClick={this.context.router.goBack}>
            Whoops! Get me out of here
          </BS.Button>
          {this.joinButton()}
        </BS.ButtonToolbar>
      </div>
    );
  },
});

const HuntMembershipVerifier = React.createClass({
  propTypes: {
    huntId: React.PropTypes.string.isRequired,
    children: React.PropTypes.node,
  },

  contextTypes: {
    subs: JRPropTypes.subs,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    const userHandle = this.context.subs.subscribe('huntMembership');
    if (!userHandle.ready()) {
      return { ready: false };
    }

    const user = Meteor.user();
    if (!user) {
      return { ready: false };
    }

    if (!_.contains(user.hunts, this.props.huntId)) {
      return {
        member: false,
        ready: true,
      };
    }

    return { ready: true, member: true };
  },

  render() {
    if (!this.data.ready) {
      return <span>loading...</span>;
    } else if (!this.data.member) {
      return <HuntMemberError huntId={this.props.huntId} />;
    } else {
      return React.Children.only(this.props.children);
    }
  },
});

const HuntApp = React.createClass({
  propTypes: {
    params: React.PropTypes.shape({
      huntId: React.PropTypes.string.isRequired,
    }).isRequired,
    children: React.PropTypes.node,
  },

  contextTypes: {
    subs: JRPropTypes.subs,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    const huntHandle = this.context.subs.subscribe('mongo.hunts.allowingDeleted', {
      _id: this.props.params.huntId,
    });
    return {
      ready: huntHandle.ready(),
      hunt: Models.Hunts.findOneAllowingDeleted(this.props.params.huntId),
    };
  },

  render() {
    if (!this.data.ready) {
      return <span>loading...</span>;
    }

    if (this.data.hunt.deleted) {
      return <HuntDeletedError huntId={this.props.params.huntId} />;
    }

    const title = this.data.hunt ? `${this.data.hunt.name} :: Jolly Roger` : '';

    return (
      <DocumentTitle title={title}>
        <HuntMembershipVerifier huntId={this.props.params.huntId}>
          {React.Children.only(this.props.children)}
        </HuntMembershipVerifier>
      </DocumentTitle>
    );
  },
});

export { HuntApp };
