import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import PropTypes from 'prop-types';
import React from 'react';
import Alert from 'react-bootstrap/lib/Alert';
import Button from 'react-bootstrap/lib/Button';
import ButtonToolbar from 'react-bootstrap/lib/ButtonToolbar';
import DocumentTitle from 'react-document-title';
import { withTracker } from 'meteor/react-meteor-data';
import marked from 'marked';
import subsCache from '../subsCache.js';
import navAggregatorType from './navAggregatorType.jsx';
import CelebrationCenter from './CelebrationCenter.jsx';

class HuntDeletedError extends React.Component {
  static propTypes = {
    huntId: PropTypes.string.isRequired,
    hunt: PropTypes.shape(Schemas.Hunts.asReactPropTypes()),
    canUndestroy: PropTypes.bool.isRequired,
  };

  static contextTypes = {
    router: PropTypes.object.isRequired,
  };

  undestroy = () => {
    Models.Hunts.undestroy(this.props.hunt._id);
  };

  undestroyButton = () => {
    if (this.props.canUndestroy) {
      return (
        <Button bsStyle="primary" onClick={this.undestroy}>
          Undelete this hunt
        </Button>
      );
    }
    return null;
  };

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
  }
}

const HuntDeletedErrorContainer = withTracker(({ huntId }) => {
  return {
    hunt: Models.Hunts.findOneDeleted(huntId),
    canUndestroy: Roles.userHasPermission(Meteor.userId(), 'mongo.hunts.update'),
  };
})(HuntDeletedError);

HuntDeletedErrorContainer.propTypes = {
  huntId: PropTypes.string.isRequired,
};

class HuntMemberError extends React.Component {
  static propTypes = {
    huntId: PropTypes.string.isRequired,
    hunt: PropTypes.shape(Schemas.Hunts.asReactPropTypes()),
    canJoin: PropTypes.bool,
  };

  static contextTypes = {
    router: PropTypes.object.isRequired,
  };

  join = () => {
    Meteor.call('addToHunt', this.props.huntId, Meteor.user().emails[0].address);
  };

  joinButton = () => {
    if (this.data.canJoin) {
      return (
        <Button bsStyle="primary" onClick={this.join}>
          Use operator permissions to join
        </Button>
      );
    }
    return null;
  };

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
  }
}

const HuntMemberErrorContainer = withTracker(({ huntId }) => {
  return {
    hunt: Models.Hunts.findOne(huntId),
    canJoin: Roles.userHasPermission(Meteor.userId(), 'hunt.join', huntId),
  };
})(HuntMemberError);

HuntMemberErrorContainer.propTypes = {
  huntId: PropTypes.string,
};

class HuntApp extends React.Component {
  static propTypes = {
    params: PropTypes.shape({
      huntId: PropTypes.string.isRequired,
    }).isRequired,
    children: PropTypes.node,
    ready: PropTypes.bool.isRequired,
    hunt: PropTypes.shape(Schemas.Hunts.asReactPropTypes()),
    member: PropTypes.bool.isRequired,
  };

  static contextTypes = {
    navAggregator: navAggregatorType,
  };

  renderBody = () => {
    if (!this.props.ready) {
      return <span>loading...</span>;
    }

    if (this.props.hunt.deleted) {
      return <HuntDeletedErrorContainer huntId={this.props.params.huntId} />;
    }

    if (!this.props.member) {
      return <HuntMemberErrorContainer huntId={this.props.params.huntId} />;
    }

    return React.Children.only(this.props.children);
  };

  render() {
    const title = this.props.hunt ? `${this.props.hunt.name} :: Jolly Roger` : '';

    return (
      <DocumentTitle title={title}>
        <this.context.navAggregator.NavItem
          itemKey="hunts"
          to="/hunts"
          label="Hunts"
          depth={0}
        >
          <this.context.navAggregator.NavItem
            itemKey="huntid"
            to={`/hunts/${this.props.params.huntId}`}
            label={this.props.ready ? this.props.hunt.name : 'loading...'}
            depth={1}
          >
            <div>
              <CelebrationCenter huntId={this.props.params.huntId} />
              {this.renderBody()}
            </div>
          </this.context.navAggregator.NavItem>
        </this.context.navAggregator.NavItem>
      </DocumentTitle>
    );
  }
}

const HuntAppContainer = withTracker(({ params }) => {
  const userHandle = subsCache.subscribe('selfHuntMembership');
  const huntHandle = subsCache.subscribe('mongo.hunts.allowingDeleted', {
    _id: params.huntId,
  });
  const member = Meteor.user() && _.contains(Meteor.user().hunts, params.huntId);
  return {
    ready: userHandle.ready() && huntHandle.ready(),
    hunt: Models.Hunts.findOneAllowingDeleted(params.huntId),
    member,
  };
})(HuntApp);

HuntAppContainer.propTypes = {
  params: PropTypes.shape({
    huntId: PropTypes.string.isRequired,
  }).isRequired,
};

export default HuntAppContainer;
