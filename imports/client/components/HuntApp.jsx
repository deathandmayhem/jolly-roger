import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import PropTypes from 'prop-types';
import React from 'react';
import Alert from 'react-bootstrap/lib/Alert';
import Button from 'react-bootstrap/lib/Button';
import ButtonToolbar from 'react-bootstrap/lib/ButtonToolbar';
import DocumentTitle from 'react-document-title';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import marked from 'marked';
import subsCache from '../subsCache.js';
import navAggregatorType from './navAggregatorType.jsx';
import CelebrationCenter from './CelebrationCenter.jsx';

const HuntDeletedError = React.createClass({
  propTypes: {
    huntId: PropTypes.string.isRequired,
  },

  contextTypes: {
    router: PropTypes.object.isRequired,
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
        <Button bsStyle="primary" onClick={this.undestroy}>
          Undelete this hunt
        </Button>
      );
    }
    return null;
  },

  render() {
    return (
      <div>
        <Alert bsStyle="danger">
        This hunt has been deleted, so there&apos;s nothing much to see here anymore.
        </Alert>

        <ButtonToolbar>
          <Button bsStyle="default" onClick={this.context.router.goBack}>
            Whoops! Get me out of here
          </Button>
          {this.undestroyButton()}
        </ButtonToolbar>
      </div>
    );
  },
});

const HuntMemberError = React.createClass({
  propTypes: {
    huntId: PropTypes.string.isRequired,
  },

  contextTypes: {
    router: PropTypes.object.isRequired,
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
        <Button bsStyle="primary" onClick={this.join}>
          Use operator permissions to join
        </Button>
      );
    }
    return null;
  },

  render() {
    const msg = marked(this.data.hunt.signupMessage || '', { sanitize: true });
    return (
      <div>
        <Alert bsStyle="warning">
          You&apos;re not signed up for this hunt (
          {this.data.hunt.name}
          ) yet.
        </Alert>

        <div dangerouslySetInnerHTML={{ __html: msg }} />

        <ButtonToolbar>
          <Button bsStyle="default" onClick={this.context.router.goBack}>
            Whoops! Get me out of here
          </Button>
          {this.joinButton()}
        </ButtonToolbar>
      </div>
    );
  },
});

const HuntApp = React.createClass({
  propTypes: {
    params: PropTypes.shape({
      huntId: PropTypes.string.isRequired,
    }).isRequired,
    children: PropTypes.node,
  },

  contextTypes: {
    navAggregator: navAggregatorType,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    const userHandle = subsCache.subscribe('selfHuntMembership');
    const huntHandle = subsCache.subscribe('mongo.hunts.allowingDeleted', {
      _id: this.props.params.huntId,
    });
    const member = Meteor.user() && _.contains(Meteor.user().hunts, this.props.params.huntId);
    return {
      ready: userHandle.ready() && huntHandle.ready(),
      hunt: Models.Hunts.findOneAllowingDeleted(this.props.params.huntId),
      member,
    };
  },

  renderBody() {
    if (!this.data.ready) {
      return <span>loading...</span>;
    }

    if (this.data.hunt.deleted) {
      return <HuntDeletedError huntId={this.props.params.huntId} />;
    }

    if (!this.data.member) {
      return <HuntMemberError huntId={this.props.params.huntId} />;
    }

    return React.Children.only(this.props.children);
  },

  render() {
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
            label={this.data.ready ? this.data.hunt.name : 'loading...'}
          >
            <div>
              <CelebrationCenter huntId={this.props.params.huntId} />
              {this.renderBody()}
            </div>
          </this.context.navAggregator.NavItem>
        </this.context.navAggregator.NavItem>
      </DocumentTitle>
    );
  },
});

export default HuntApp;
