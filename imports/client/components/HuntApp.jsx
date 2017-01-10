import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import React from 'react';
import BS from 'react-bootstrap';
import DocumentTitle from 'react-document-title';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
import { navAggregatorType } from '/imports/client/components/NavAggregator.jsx';
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
    Models.Hunts.undestroy(this.data.hunt._id);
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

const HuntApp = React.createClass({
  propTypes: {
    params: React.PropTypes.shape({
      huntId: React.PropTypes.string.isRequired,
    }).isRequired,
    children: React.PropTypes.node,
  },

  contextTypes: {
    subs: JRPropTypes.subs,
    navAggregator: navAggregatorType,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    const userHandle = this.context.subs.subscribe('selfHuntMembership');
    const huntHandle = this.context.subs.subscribe('mongo.hunts.allowingDeleted', {
      _id: this.props.params.huntId,
    });
    const member = Meteor.user() && _.contains(Meteor.user().hunts, this.props.params.huntId);
    return {
      ready: userHandle.ready() && huntHandle.ready(),
      hunt: Models.Hunts.findOneAllowingDeleted(this.props.params.huntId),
      member,
    };
  },

  render() {
    if (!this.data.ready) {
      return <span>loading...</span>;
    }

    if (this.data.hunt.deleted) {
      return <HuntDeletedError huntId={this.props.params.huntId} />;
    }

    if (!this.data.member) {
      return <HuntMemberError huntId={this.props.params.huntId} />;
    }

    const title = this.data.hunt ? `${this.data.hunt.name} :: Jolly Roger` : '';

    return (
      <DocumentTitle title={title}>
        <this.context.navAggregator.NavItem
          itemKey="hunts"
          to="/hunts"
          label="Hunts"
        >
          <this.context.navAggregator.NavItem
            itemKey="huntid"
            to={`/hunts/${this.props.params.huntId}`}
            label={this.data.hunt.name}
          >
            {React.Children.only(this.props.children)}
          </this.context.navAggregator.NavItem>
        </this.context.navAggregator.NavItem>
      </DocumentTitle>
    );
  },
});

export { HuntApp };
