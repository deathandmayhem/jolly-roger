import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Roles } from 'meteor/nicolaslopezj:roles';
import * as PropTypes from 'prop-types';
import * as React from 'react';
import * as Alert from 'react-bootstrap/lib/Alert';
import * as Button from 'react-bootstrap/lib/Button';
import * as ButtonToolbar from 'react-bootstrap/lib/ButtonToolbar';
import * as DocumentTitle from 'react-document-title';
import { withTracker } from 'meteor/react-meteor-data';
import * as DOMPurify from 'dompurify';
import * as marked from 'marked';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import subsCache from '../subsCache';
import CelebrationCenter from './CelebrationCenter';
import HuntsSchema, { HuntType } from '../../lib/schemas/hunts';
import Hunts from '../../lib/models/hunts';

interface HuntDeletedErrorProps {
  huntId: string;
  hunt: HuntType;
  canUndestroy: boolean;
}

class HuntDeletedError extends React.Component<HuntDeletedErrorProps> {
  static propTypes = {
    huntId: PropTypes.string.isRequired,
    hunt: PropTypes.shape(HuntsSchema.asReactPropTypes()).isRequired as React.Validator<HuntType>,
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

const HuntDeletedErrorContainer = withTracker(({ huntId }: { huntId: string }) => {
  return {
    hunt: Hunts.findOneDeleted(huntId),
    canUndestroy: Roles.userHasPermission(Meteor.userId(), 'mongo.hunts.update'),
  };
})(HuntDeletedError);

HuntDeletedErrorContainer.propTypes = {
  huntId: PropTypes.string.isRequired,
};

interface HuntMemberErrorProps {
  huntId: string;
  hunt: HuntType;
  canJoin: boolean;
}

class HuntMemberError extends React.Component<HuntMemberErrorProps> {
  static propTypes = {
    huntId: PropTypes.string.isRequired,
    hunt: PropTypes.shape(HuntsSchema.asReactPropTypes()).isRequired as React.Validator<HuntType>,
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
    Meteor.call('addToHunt', this.props.huntId, user.emails[0].address);
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

const HuntMemberErrorContainer = withTracker(({ huntId }: { huntId: string }) => {
  return {
    hunt: Hunts.findOne(huntId),
    canJoin: Roles.userHasPermission(Meteor.userId(), 'hunt.join', huntId),
  };
})(HuntMemberError);

HuntMemberErrorContainer.propTypes = {
  huntId: PropTypes.string.isRequired,
};

interface HuntAppParams {
  params: {huntId: string};
}

interface HuntAppProps extends HuntAppParams {
  children: React.ReactNode;
  ready: boolean;
  hunt?: HuntType;
  member: boolean;
}

class HuntApp extends React.Component<HuntAppProps> {
  static propTypes = {
    params: PropTypes.shape({
      huntId: PropTypes.string.isRequired,
    }).isRequired,
    children: PropTypes.node.isRequired,
    ready: PropTypes.bool.isRequired,
    hunt: PropTypes.shape(HuntsSchema.asReactPropTypes()) as React.Requireable<HuntType>,
    member: PropTypes.bool.isRequired,
  };

  renderBody = () => {
    if (!this.props.ready || !this.props.hunt) {
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
      // @ts-ignore The current type definitions expect this to be an ES6
      //   default export but it's actually a CJS default export (yes, they're
      //   different), which is why it needs to be imported with "import *"
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
