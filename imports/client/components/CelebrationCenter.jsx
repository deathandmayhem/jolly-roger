import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import { Meteor } from 'meteor/meteor';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import Flags from '../../flags.js';
import subsCache from '../subsCache.js';
import Celebration from './Celebration.jsx';
import Profiles from '../../lib/models/profiles.js';
import Puzzles from '../../lib/models/puzzles.js';

/* eslint-disable react/prefer-es6-class */
const CelebrationCenter = createReactClass({
  displayName: 'CelebrationCenter',

  propTypes: {
    huntId: PropTypes.string.isRequired,
  },

  mixins: [ReactMeteorData],

  getInitialState() {
    return {
      playbackQueue: [],
    };
  },

  componentWillUnmount() {
    if (this.watchHandle) {
      this.watchHandle.stop();
      this.watchHandle = undefined;
    }
  },

  onPuzzleSolved(puzzle) {
    // Only celebrate if:
    // 1) we're not on mobile, and
    // 2) the feature flag is not disabled, and
    // 3) TODO: the user has not disabled it in their profile settings
    if ((window.orientation === undefined) && !this.data.disabled) {
      this.setState((prevState) => {
        const newQueue = prevState.playbackQueue.concat([{
          puzzleId: puzzle._id,
          url: `/hunts/${puzzle.hunt}/puzzles/${puzzle._id}`,
          answer: puzzle.answer,
          title: puzzle.title,
        }]);

        this.setState({
          playbackQueue: newQueue,
        });
      });
    }
  },

  getMeteorData() {
    // This should be effectively a noop, since we're already fetching it for every hunt
    const puzzlesHandle = subsCache.subscribe('mongo.puzzles', { hunt: this.props.huntId });
    if (puzzlesHandle.ready()) {
      if (this.watchHandle) {
        this.watchHandle.stop();
      }

      this.watchHandle = Puzzles.find().observe({
        changed: (newDoc, oldDoc) => {
          if ((!oldDoc.answer) && newDoc.answer) {
            this.onPuzzleSolved(newDoc);
          }
        },
      });
    }

    const profile = Profiles.findOne({ _id: Meteor.userId() });
    const muted = profile && profile.muteApplause;

    return {
      disabled: Flags.active('disable.applause'),
      muted,
    };
  },

  dismissCurrentCelebration() {
    const [car, ...cons] = this.state.playbackQueue; // eslint-disable-line no-unused-vars
    this.setState({
      playbackQueue: cons,
    });
  },

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
          playAudio={!this.data.muted}
          onClose={this.dismissCurrentCelebration}
        />
      );
    }
  },
});

export default CelebrationCenter;
