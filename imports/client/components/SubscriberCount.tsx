import { withTracker } from 'meteor/react-meteor-data';
import React from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { SubscriberCounters } from '../subscribers';

interface SubscriberCountProps {
  puzzleId: string;
  viewCount: number;
}

class SubscriberCount extends React.Component<SubscriberCountProps> {
  static displayName = 'SubscriberCount';

  render() {
    const countTooltip = (
      <Tooltip id={`count-description-${this.props.puzzleId}`}>
        users currently viewing this puzzle
      </Tooltip>
    );
    return (
      <OverlayTrigger placement="top" overlay={countTooltip}>
        <span>
          (
          {this.props.viewCount}
          )
        </span>
      </OverlayTrigger>
    );
  }
}

const SubscriberCountContainer = withTracker(({ puzzleId }: { puzzleId: string }) => {
  const count = SubscriberCounters.findOne(`puzzle:${puzzleId}`);
  return {
    viewCount: count ? count.value : 0,
  };
})(SubscriberCount);

export default SubscriberCountContainer;
