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
import DOMPurify from 'dompurify';
import marked from 'marked';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import subsCache from '../subsCache';
import CelebrationCenter from './CelebrationCenter';
import HuntsSchema, { HuntType } from '../../lib/schemas/hunts';
import Hunts from '../../lib/models/hunts';

interface HuntDeletedErrorProps {
  hunt: HuntType;
  canUndestroy: boolean;
}

class HuntDeletedError extends React.PureComponent<HuntDeletedErrorProps> {
  static propTypes = {
    hunt: PropTypes.shape(
      HuntsSchema.asReactPropTypes<HuntType>()
    ).isRequired as React.Validator<HuntType>,
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

interface HuntMemberErrorProps {
  hunt: HuntType;
  canJoin: boolean;
}

class HuntMemberError extends React.PureComponent<HuntMemberErrorProps> {
  static propTypes = {
    hunt: PropTypes.shape(
      HuntsSchema.asReactPropTypes<HuntType>()
    ).isRequired as React.Validator<HuntType>,
    canJoin: PropTypes.bool.isRequired,
  };

  static contextTypes = {
    router: PropTypes.object.isRequired,
  };

  join = () => {
    const user = Meteor.user();
    if (!user || !user.emails) {
      return;
    }
    Meteor.call('addToHunt', this.props.hunt._id, user.emails[0].address);
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

interface HuntAppParams {
  params: {huntId: string};
}

interface HuntAppProps extends HuntAppParams {
  children: React.ReactNode;
  ready: boolean;
  hunt?: HuntType;
  member: boolean;
  canUndestroy: boolean;
  canJoin: boolean;
}

class HuntApp extends React.Component<HuntAppProps> {
  static propTypes = {
    params: PropTypes.shape({
      huntId: PropTypes.string.isRequired,
    }).isRequired,
    children: PropTypes.node.isRequired,
    ready: PropTypes.bool.isRequired,
    hunt: PropTypes.shape(HuntsSchema.asReactPropTypes<HuntType>()) as React.Requireable<HuntType>,
    member: PropTypes.bool.isRequired,
    canUndestroy: PropTypes.bool.isRequired,
    canJoin: PropTypes.bool.isRequired,
  };

  renderBody = () => {
    if (!this.props.ready) {
      return <span>loading...</span>;
    }

    if (!this.props.hunt) {
      return <span>This hunt does not exist</span>;
    }

    if (this.props.hunt.deleted) {
      return <HuntDeletedError hunt={this.props.hunt} canUndestroy={this.props.canUndestroy} />;
    }

    if (!this.props.member) {
      return <HuntMemberError hunt={this.props.hunt} canJoin={this.props.canJoin} />;
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

const huntsCrumb = withBreadcrumb({ title: 'Hunts', path: '/hunts' });
const huntCrumb = withBreadcrumb(({ params, ready, hunt }: HuntAppProps) => {
  return { title: ready && hunt ? hunt.name : 'loading...', path: `/hunts/${params.huntId}` };
});
const tracker = withTracker(({ params }: HuntAppParams) => {
  const userHandle = subsCache.subscribe('selfHuntMembership');
  const huntHandle = subsCache.subscribe('mongo.hunts.allowingDeleted', {
    _id: params.huntId,
  });
  const user = Meteor.user();
  const member = user && _.contains(user.hunts, params.huntId);
  return {
    ready: userHandle.ready() && huntHandle.ready(),
    hunt: Hunts.findOneAllowingDeleted(params.huntId),
    member,
    canUndestroy: Roles.userHasPermission(Meteor.userId(), 'mongo.hunts.update'),
    canJoin: Roles.userHasPermission(Meteor.userId(), 'hunt.join', params.huntId),
  };
});

const HuntAppContainer = _.compose(huntsCrumb, tracker, huntCrumb)(HuntApp);
HuntAppContainer.propTypes = {
  params: PropTypes.shape({
    huntId: PropTypes.string.isRequired,
  }).isRequired,
};

export default HuntAppContainer;
