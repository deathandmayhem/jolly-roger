import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Roles } from 'meteor/nicolaslopezj:roles';
import PropTypes from 'prop-types';
import React from 'react';
import Alert from 'react-bootstrap/lib/Alert';
import Button from 'react-bootstrap/lib/Button';
import ButtonToolbar from 'react-bootstrap/lib/ButtonToolbar';
import DocumentTitle from 'react-document-title';
import { withTracker } from 'meteor/react-meteor-data';
import * as DOMPurify from 'dompurify';
import marked from 'marked';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import subsCache from '../subsCache';
import CelebrationCenter from './CelebrationCenter';
import HuntsSchema from '../../lib/schemas/hunts';
import Hunts from '../../lib/models/hunts';

class HuntDeletedError extends React.Component {
  static propTypes = {
    huntId: PropTypes.string.isRequired,
    hunt: PropTypes.shape(HuntsSchema.asReactPropTypes()),
    canUndestroy: PropTypes.bool.isRequired,
  };

  static contextTypes = {
    router: PropTypes.object.isRequired,
  };

  undestroy = () => {
    Hunts.undestroy(this.props.hunt._id);
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
    hunt: Hunts.findOneDeleted(huntId),
    canUndestroy: Roles.userHasPermission(Meteor.userId(), 'mongo.hunts.update'),
  };
})(HuntDeletedError);

HuntDeletedErrorContainer.propTypes = {
  huntId: PropTypes.string.isRequired,
};

class HuntMemberError extends React.Component {
  static propTypes = {
    huntId: PropTypes.string.isRequired,
    hunt: PropTypes.shape(HuntsSchema.asReactPropTypes()),
    canJoin: PropTypes.bool,
  };

  static contextTypes = {
    router: PropTypes.object.isRequired,
  };

  join = () => {
    Meteor.call('addToHunt', this.props.huntId, Meteor.user().emails[0].address);
  };

  joinButton = () => {
    if (this.props.canJoin) {
      return (
        <Button bsStyle="primary" onClick={this.join}>
          Use operator permissions to join
        </Button>
      );
    }
    return null;
  };

  render() {
    const msg = marked(DOMPurify.sanitize(this.props.hunt.signupMessage || ''));
    return (
      <div>
        <Alert bsStyle="warning">
          You&apos;re not signed up for this hunt (
          {this.props.hunt.name}
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
    hunt: Hunts.findOne(huntId),
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
    hunt: PropTypes.shape(HuntsSchema.asReactPropTypes()),
    member: PropTypes.bool.isRequired,
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
        <div>
          <CelebrationCenter huntId={this.props.params.huntId} />
          {this.renderBody()}
        </div>
      </DocumentTitle>
    );
  }
}

const huntsCrumb = withBreadcrumb({ title: 'Hunts', link: '/hunts' });
const huntCrumb = withBreadcrumb(({ params, ready, hunt }) => {
  return { title: ready ? hunt.name : 'loading...', link: `/hunts/${params.huntId}` };
});
const tracker = withTracker(({ params }) => {
  const userHandle = subsCache.subscribe('selfHuntMembership');
  const huntHandle = subsCache.subscribe('mongo.hunts.allowingDeleted', {
    _id: params.huntId,
  });
  const member = Meteor.user() && _.contains(Meteor.user().hunts, params.huntId);
  return {
    ready: userHandle.ready() && huntHandle.ready(),
    hunt: Hunts.findOneAllowingDeleted(params.huntId),
    member,
  };
});

const HuntAppContainer = _.compose(huntsCrumb, tracker, huntCrumb)(HuntApp);
HuntAppContainer.propTypes = {
  params: PropTypes.shape({
    huntId: PropTypes.string.isRequired,
  }).isRequired,
};

export default HuntAppContainer;
