import React from 'react';
import DocumentTitle from 'react-document-title';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
// TODO: ReactMeteorData

HuntApp = React.createClass({
  mixins: [ReactMeteorData],

  contextTypes: {
    subs: JRPropTypes.subs,
  },

  getMeteorData() {
    this.context.subs.subscribe('mongo.hunts', {_id: this.props.params.huntId});
    return {hunt: Models.Hunts.findOne(this.props.params.huntId)};
  },

  render() {
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
