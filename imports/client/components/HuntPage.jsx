import React from 'react';
import { Link } from 'react-router';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
// TODO: ReactMeteorData

const HuntPage = React.createClass({
  mixins: [ReactMeteorData],

  contextTypes: {
    subs: JRPropTypes.subs,
  },

  getMeteorData() {
    const huntHandle = this.context.subs.subscribe('mongo.hunts', {_id: this.props.params.huntId});
    return {
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
