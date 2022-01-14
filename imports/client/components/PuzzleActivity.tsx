import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { faVolumeDown } from '@fortawesome/free-solid-svg-icons/faVolumeDown';
import { faVolumeOff } from '@fortawesome/free-solid-svg-icons/faVolumeOff';
import { faVolumeUp } from '@fortawesome/free-solid-svg-icons/faVolumeUp';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useState } from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import styled from 'styled-components';
import { RECENT_ACTIVITY_TIME_WINDOW_MS } from '../../lib/config/webrtc';
import CallHistories from '../../lib/models/mediasoup/call_histories';
import relativeTimeFormat, { terseRelativeTimeFormat } from '../../lib/relativeTimeFormat';
import SubscriberCount from './SubscriberCount';

const PuzzleActivitySpan = styled.span`
  font-size: 14px;
  color: #666666;
`;

const LastActiveSpan = styled.span`
  display: inline-block;
  text-align: left;
  width: 1em;
  margin-left: 2px;
  margin-right: 2px;
`;

interface PuzzleActivityProps {
  huntId: string;
  puzzleId: string;
  unlockTime: Date;
}

// For how long after the last audio detected should we indicate "recent audio presence"?
// Currently set to 10 minutes.
const RECENTLY_ACTIVE_INTERVAL = 10 * 60 * 1000;

const PuzzleActivity = ({ huntId, puzzleId, unlockTime }: PuzzleActivityProps) => {
  const callLastActive = useTracker(() => {
    return CallHistories.findOne({ hunt: huntId, call: puzzleId })?.lastActivity;
  }, [huntId, puzzleId]);

  const [lastActiveRelative, setLastActiveRelative] = useState<string>();
  const [lastActiveRecent, setLastActiveRecent] = useState<boolean>();

  const [unlockTimeRelative, setUnlockTimeRelative] = useState<string>('');

  useEffect(() => {
    const lastActiveFormatter = () => {
      if (callLastActive) {
        return relativeTimeFormat(callLastActive, { minimumUnit: 'minute' });
      }
      return undefined;
    };
    const unlockTimeFormatter = () => terseRelativeTimeFormat(unlockTime, { minimumUnit: 'minute' });
    setUnlockTimeRelative(unlockTimeFormatter());
    if (callLastActive) {
      setLastActiveRecent(Date.now() - callLastActive.getTime() < RECENTLY_ACTIVE_INTERVAL);
      setLastActiveRelative(lastActiveFormatter());
    }

    const interval = Meteor.setInterval(() => {
      setUnlockTimeRelative(unlockTimeFormatter());
      if (callLastActive) {
        setLastActiveRecent(Date.now() - callLastActive.getTime() < RECENTLY_ACTIVE_INTERVAL);
        setLastActiveRelative(lastActiveFormatter());
      }
    }, RECENT_ACTIVITY_TIME_WINDOW_MS);

    return () => {
      if (interval) {
        Meteor.clearInterval(interval);
      }
    };
  }, [unlockTime, callLastActive]);

  const unlockTooltip = (
    <Tooltip id={`puzzle-activity-unlock-${puzzleId}`}>
      Puzzle age (time since creation)
    </Tooltip>
  );

  const audioTooltipText = callLastActive ? `Call last active ${lastActiveRelative}` : 'Call never used';
  const audioTooltip = (
    <Tooltip id={`puzzle-activity-audio-${puzzleId}`}>
      {audioTooltipText}
    </Tooltip>
  );

  let icon = faVolumeOff;
  if (callLastActive) {
    if (lastActiveRecent) {
      icon = faVolumeUp;
    } else {
      icon = faVolumeDown;
    }
  }

  return (
    <PuzzleActivitySpan>
      <OverlayTrigger placement="top" overlay={unlockTooltip}>
        <span>{unlockTimeRelative}</span>
      </OverlayTrigger>
      <OverlayTrigger placement="top" overlay={audioTooltip}>
        <LastActiveSpan>
          <FontAwesomeIcon icon={icon} />
        </LastActiveSpan>
      </OverlayTrigger>
      <SubscriberCount puzzleId={puzzleId} />
    </PuzzleActivitySpan>
  );
};

export default PuzzleActivity;
