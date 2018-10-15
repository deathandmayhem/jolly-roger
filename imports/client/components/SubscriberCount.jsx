import React from 'react';
import PropTypes from 'prop-types';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import OverlayTrigger from 'react-bootstrap/lib/OverlayTrigger';
import Tooltip from 'react-bootstrap/lib/Tooltip';

import { SubscriberCounters } from '../subscribers.js';
import Flags from '../../flags.js';

const SubscriberCount = React.createClass({
  displayName: 'SubscriberCount',
  propTypes: {
    puzzleId: PropTypes.string.isRequired,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    const disabled = Flags.active('disable.subcounters');
    const count = SubscriberCounters.findOne(`puzzle:${this.props.puzzleId}`);
    return {
      disabled,
      viewCount: count ? count.value : 0,
    };
  },

  render() {
    if (this.data.disabled) {
      return <div />;
    }

    const countTooltip = (
      <Tooltip id={`count-description-${this.props.puzzleId}`}>
        users currently viewing this puzzle
      </Tooltip>
    );
    return (
      <OverlayTrigger placement="top" overlay={countTooltip}>
        <span>({this.data.viewCount})</span>
      </OverlayTrigger>
    );
  },
});

export default SubscriberCount;
