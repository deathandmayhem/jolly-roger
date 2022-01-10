import { Meteor } from 'meteor/meteor';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { Tracker } from 'meteor/tracker';
import React, { useCallback, useEffect, useState } from 'react';
import Flags from '../../flags';
import Profiles from '../../lib/models/profiles';
import Puzzles from '../../lib/models/puzzles';
import { PuzzleType } from '../../lib/schemas/puzzle';
import Celebration from './Celebration';

interface CelebrationCenterProps {
  huntId: string;
}

interface CelebrationCenterQueueItem {
  puzzleId: string;
  url: string;
  answer: string;
  title: string;
}

const CelebrationCenter = (props: CelebrationCenterProps) => {
  const [playbackQueue, setPlaybackQueue] = useState<CelebrationCenterQueueItem[]>([]);

  // This should be effectively a noop, since we're already fetching it for every hunt
  useSubscribe('mongo.puzzles', { hunt: props.huntId });

  const disabled = useTracker(() => Flags.active('disable.applause'), []);
  const muted = useTracker(() => !!(Profiles.findOne({ _id: Meteor.userId()! })?.muteApplause), []);

  const onPuzzleSolved = useCallback((puzzle: PuzzleType, newAnswer: string) => {
    // Only celebrate if:
    // 1) we're not on mobile, and
    // 2) the global feature flag is not disabled, and
    // 3) TODO: the user has not disabled it in their profile settings
    // Hack: disabled celebrations because I don't want to think about it right now
    // eslint-disable-next-line no-constant-condition
    if ((window.orientation === undefined) && !disabled && false) {
      setPlaybackQueue((prevPlaybackQueue) => {
        const newQueue = prevPlaybackQueue.concat([{
          puzzleId: puzzle._id,
          url: `/hunts/${puzzle.hunt}/puzzles/${puzzle._id}`,
          answer: newAnswer,
          title: puzzle.title,
        }]);

        return newQueue;
      });
    }
  }, [disabled]);

  useEffect(() => {
    const puzzleWatcher = Tracker.autorun(() => {
      Puzzles.find().observe({
        changed: (newDoc, oldDoc) => {
          if (oldDoc.answers.length < newDoc.answers.length) {
            const newAnswer = newDoc.answers.find((answer) => !oldDoc.answers.includes(answer));
            if (newAnswer) {
              onPuzzleSolved(newDoc, newAnswer);
            }
          }
        },
      });
    });

    return () => {
      // Clean up the Tracker autorun
      puzzleWatcher.stop();
    };
  }, [onPuzzleSolved]);

  const dismissCurrentCelebration = useCallback(() => {
    setPlaybackQueue((prevPlaybackQueue) => {
      return prevPlaybackQueue.slice(1);
    });
  }, []);

  if (playbackQueue.length === 0) {
    return null;
  } else {
    const celebration = playbackQueue[0];
    return (
      <Celebration
        key={celebration.puzzleId}
        url={celebration.url}
        title={celebration.title}
        answer={celebration.answer}
        playAudio={!muted}
        onClose={dismissCurrentCelebration}
      />
    );
  }
};

export default CelebrationCenter;
