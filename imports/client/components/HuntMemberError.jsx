import React from 'react';
import BS from 'react-bootstrap';
import marked from 'marked';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
import { ReactMeteorData } from 'meteor/react-meteor-data';

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
    const handle = this.context.subs.subscribe('mongo.hunts', { _id: this.props.huntId });
    return {
      ready: handle.ready(),
      hunt: Models.Hunts.findOne(this.props.huntId),
    };
  },

  render() {
    if (!this.data.ready) {
      return <span>loading...</span>;
    }

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
        </BS.ButtonToolbar>
      </div>
    );
  },
});

export { HuntMemberError };
