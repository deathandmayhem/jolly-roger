import * as React from 'react';
import * as PropTypes from 'prop-types';
import { withTracker } from 'meteor/react-meteor-data';
import * as OverlayTrigger from 'react-bootstrap/lib/OverlayTrigger';
import * as Tooltip from 'react-bootstrap/lib/Tooltip';

import { SubscriberCounters } from '../subscribers';
import Flags from '../../flags';

interface SubscriberCountProps {
  puzzleId: string;
  disabled: boolean;
  viewCount: number;
}

class SubscriberCount extends React.Component<SubscriberCountProps> {
  static displayName = 'SubscriberCount';

  static propTypes = {
    puzzleId: PropTypes.string.isRequired,
    disabled: PropTypes.bool.isRequired,
    viewCount: PropTypes.number.isRequired,
  };

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

SubscriberCountContainer.propTypes = {
  puzzleId: PropTypes.string.isRequired,
};

export default SubscriberCountContainer;
