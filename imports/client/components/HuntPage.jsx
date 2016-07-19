import React from 'react';
import { Link } from 'react-router';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
import { ReactMeteorData } from 'meteor/react-meteor-data';

/* eslint-disable max-len */

const HuntPage = React.createClass({
  propTypes: {
    params: React.PropTypes.shape({
      huntId: React.PropTypes.string.isRequired,
    }).isRequired,
  },

  contextTypes: {
    subs: JRPropTypes.subs,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    const huntHandle = this.context.subs.subscribe('mongo.hunts', { _id: this.props.params.huntId });
    return {
      ready: huntHandle.ready(),
      hunt: Models.Hunts.findOne(this.props.params.huntId),
    };
  },

  render() {
    const huntName = (this.data.hunt && this.data.hunt.name) || 'loading...';
    return (
      <div>
        <h1>{huntName}</h1>
        <ul>
          <li><Link to={`/hunts/${this.props.params.huntId}/puzzles`}>Puzzles</Link></li>
          <li><Link to={`/hunts/${this.props.params.huntId}/announcements`}>Announcements</Link></li>
          <li><Link to={`/hunts/${this.props.params.huntId}/guesses`}>Guess queue</Link></li>
        </ul>
      </div>
    );
  },
});

export { HuntPage };
