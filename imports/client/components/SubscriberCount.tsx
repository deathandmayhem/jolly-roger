import { withTracker } from 'meteor/react-meteor-data';
import React from 'react';
import OverlayTrigger from 'react-bootstrap/lib/OverlayTrigger';
import Tooltip from 'react-bootstrap/lib/Tooltip';
import Flags from '../../flags';
import { SubscriberCounters } from '../subscribers';

interface SubscriberCountProps {
  puzzleId: string;
  disabled: boolean;
  viewCount: number;
}

class SubscriberCount extends React.Component<SubscriberCountProps> {
  static displayName = 'SubscriberCount';

  render() {
    if (this.props.disabled) {
      return <div />;
    }

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
  const disabled = Flags.active('disable.subcounters');
  const count = SubscriberCounters.findOne(`puzzle:${puzzleId}`);
  return {
    disabled,
    viewCount: count ? count.value : 0,
  };
})(SubscriberCount);

export default SubscriberCountContainer;
