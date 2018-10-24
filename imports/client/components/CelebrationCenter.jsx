import PropTypes from 'prop-types';
import React from 'react';
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { withTracker } from 'meteor/react-meteor-data';
import Flags from '../../flags.js';
import subsCache from '../subsCache.js';
import Celebration from './Celebration.jsx';
import Profiles from '../../lib/models/profiles.js';
import Puzzles from '../../lib/models/puzzles.js';

class CelebrationCenter extends React.Component {
  static displayName = 'CelebrationCenter';

  static propTypes = {
    huntId: PropTypes.string.isRequired,
    disabled: PropTypes.bool.isRequired,
    muted: PropTypes.bool.isRequired,
  };

  state = {
    playbackQueue: [],
  };

  componentDidMount() {
    setTimeout(() => this.resetComputation(), 0);
  }

  componentDidUpdate() {
    setTimeout(() => this.resetComputation(), 0);
  }

  componentWillUnmount() {
    if (this.computation) {
      this.computation.stop();
      this.computation = null;
    }
  }

  onPuzzleSolved = (puzzle) => {
    // Only celebrate if:
    // 1) we're not on mobile, and
    // 2) the feature flag is not disabled, and
    // 3) TODO: the user has not disabled it in their profile settings
    if ((window.orientation === undefined) && !this.props.disabled) {
      this.setState((prevState) => {
        const newQueue = prevState.playbackQueue.concat([{
          puzzleId: puzzle._id,
          url: `/hunts/${puzzle.hunt}/puzzles/${puzzle._id}`,
          answer: puzzle.answer,
          title: puzzle.title,
        }]);

        return { playbackQueue: newQueue };
      });
    }
  };

  resetComputation = () => {
    if (this.computation) {
      this.computation.stop();
    }

    this.computation = Tracker.autorun(() => {
      Puzzles.find().observe({
        changed: (newDoc, oldDoc) => {
          if ((!oldDoc.answer) && newDoc.answer) {
            this.onPuzzleSolved(newDoc);
          }
        },
      });
    });
  };

  dismissCurrentCelebration = () => {
    const [car, ...cons] = this.state.playbackQueue; // eslint-disable-line no-unused-vars
    this.setState({
      playbackQueue: cons,
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

const CelebrationCenterContainer = withTracker(({ huntId }) => {
  // This should be effectively a noop, since we're already fetching it for every hunt
  subsCache.subscribe('mongo.puzzles', { hunt: huntId });

  const profile = Profiles.findOne({ _id: Meteor.userId() });
  const muted = !!(profile && profile.muteApplause);

  return {
    disabled: Flags.active('disable.applause'),
    muted,
  };
})(CelebrationCenter);

CelebrationCenterContainer.propTypes = {
  huntId: PropTypes.string.isRequired,
};

export default CelebrationCenterContainer;
