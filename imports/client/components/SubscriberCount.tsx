import { useTracker } from 'meteor/react-meteor-data';
import React from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { SubscriberCounters } from '../subscribers';

interface SubscriberCountProps {
  puzzleId: string;
}

const SubscriberCount = (props: SubscriberCountProps) => {
  const viewCount = useTracker(() => {
    return SubscriberCounters.findOne(`puzzle:${props.puzzleId}`)?.value ?? 0;
  }, [props.puzzleId]);

  const countTooltip = (
    <Tooltip id={`count-description-${props.puzzleId}`}>
      users currently viewing this puzzle
    </Tooltip>
  );
  return (
    <OverlayTrigger placement="top" overlay={countTooltip}>
      <span>
        (
        {viewCount}
        )
      </span>
    </OverlayTrigger>
  );
};

export default SubscriberCount;
