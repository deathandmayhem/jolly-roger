import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import { Tracker } from 'meteor/tracker';
import React from 'react';
import Flags from '../../flags';
import Profiles from '../../lib/models/profiles';
import Puzzles from '../../lib/models/puzzles';
import { PuzzleType } from '../../lib/schemas/puzzles';
import Celebration from './Celebration';

interface CelebrationCenterProps {
  huntId: string;
  disabled: boolean;
  muted: boolean;
}

interface CelebrationCenterQueueItem {
  puzzleId: string;
  url: string;
  answer: string;
  title: string;
}

interface CelebrationCenterState {
  playbackQueue: CelebrationCenterQueueItem[];
}

class CelebrationCenter extends React.Component<CelebrationCenterProps, CelebrationCenterState> {
  private computation?: Tracker.Computation;

  static displayName = 'CelebrationCenter';

  constructor(props: CelebrationCenterProps) {
    super(props);
    this.state = {
      playbackQueue: [],
    };
  }

  componentDidMount() {
    setTimeout(() => this.resetComputation(), 0);
  }

  componentDidUpdate() {
    setTimeout(() => this.resetComputation(), 0);
  }

  componentWillUnmount() {
    if (this.computation) {
      this.computation.stop();
      this.computation = undefined;
    }
  }

  onPuzzleSolved = (_puzzle: PuzzleType) => {
    // Only celebrate if:
    // 1) we're not on mobile, and
    // 2) the feature flag is not disabled, and
    // 3) TODO: the user has not disabled it in their profile settings
    // Hack: disabled celebrations because I don't want to think about it right now
    /*
    const answer = puzzle.answer;
    if ((window.orientation === undefined) && !this.props.disabled && answer) {
      this.setState((prevState) => {
        const newQueue = prevState.playbackQueue.concat([{
          puzzleId: puzzle._id,
          url: `/hunts/${puzzle.hunt}/puzzles/${puzzle._id}`,
          answer,
          title: puzzle.title,
        }]);

        return { playbackQueue: newQueue };
      });
    }
    */
  };

  resetComputation = () => {
    if (this.computation) {
      this.computation.stop();
    }

    this.computation = Tracker.autorun(() => {
      Puzzles.find().observe({
        changed: (newDoc, oldDoc) => {
          if (oldDoc.answers.length < newDoc.answers.length) {
            this.onPuzzleSolved(newDoc);
          }
        },
      });
    });
  };

  dismissCurrentCelebration = () => {
    this.setState((prevState) => {
      return { playbackQueue: prevState.playbackQueue.slice(1) };
    });
  };

  render() {
    if (this.state.playbackQueue.length === 0) {
      return null;
    } else {
      const celebration = this.state.playbackQueue[0];
      return (
        <Celebration
          key={celebration.puzzleId}
          url={celebration.url}
          title={celebration.title}
          answer={celebration.answer}
          playAudio={!this.props.muted}
          onClose={this.dismissCurrentCelebration}
        />
      );
    }
  }
}

const CelebrationCenterContainer = withTracker(({ huntId }: { huntId: string }) => {
  // This should be effectively a noop, since we're already fetching it for every hunt
  Meteor.subscribe('mongo.puzzles', { hunt: huntId });

  const profile = Profiles.findOne({ _id: Meteor.userId()! });
  const muted = !!(profile && profile.muteApplause);

  return {
    disabled: Flags.active('disable.applause'),
    muted,
  };
})(CelebrationCenter);

export default CelebrationCenterContainer;
