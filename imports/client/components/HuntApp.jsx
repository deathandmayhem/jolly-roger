import React from 'react';
import DocumentTitle from 'react-document-title';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
import { HuntMembershipVerifier } from '/imports/client/components/HuntMembershipVerifier.jsx';
import { ReactMeteorData } from 'meteor/react-meteor-data';

const HuntApp = React.createClass({
  propTypes: {
    params: React.PropTypes.shape({
      huntId: React.PropTypes.string.isRequired,
    }).isRequired,
    children: React.PropTypes.node,
  },

  contextTypes: {
    subs: JRPropTypes.subs,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    this.context.subs.subscribe('mongo.hunts', { _id: this.props.params.huntId });
    return { hunt: Models.Hunts.findOne(this.props.params.huntId) };
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

export { HuntApp };
