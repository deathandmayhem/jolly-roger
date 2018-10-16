import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import React from 'react';
import PropTypes from 'prop-types';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import Button from 'react-bootstrap/lib/Button';
import Glyphicon from 'react-bootstrap/lib/Glyphicon';
import classnames from 'classnames';
import { Link } from 'react-router';

import Ansible from '../../ansible.js';
import PuzzleAnswer from './PuzzleAnswer.jsx';
import PuzzleModalForm from './PuzzleModalForm.jsx';
import SubscriberCount from './SubscriberCount.jsx';
import TagList from './TagList.jsx';
import puzzleShape from './puzzleShape.js';
import tagShape from './tagShape.js';

/* eslint-disable max-len */

const Puzzle = React.createClass({
  displayName: 'Puzzle',
  propTypes: {
    puzzle: PropTypes.shape(puzzleShape).isRequired,
    allTags: PropTypes.arrayOf(PropTypes.shape(tagShape)).isRequired, // All tags associated with the hunt.
    layout: PropTypes.oneOf(['grid', 'table']).isRequired,
    canUpdate: PropTypes.bool.isRequired,
    suppressTags: PropTypes.arrayOf(PropTypes.string),
  },
  mixins: [PureRenderMixin],

  getInitialState() {
    return {
      showEditModal: false,
    };
  },

  onEdit(state, callback) {
    Ansible.log('Updating puzzle properties', { puzzle: this.props.puzzle._id, user: Meteor.userId(), state });
    Meteor.call('updatePuzzle', this.props.puzzle._id, state, callback);
  },

  showEditModal() {
    if (this.state.showEditModal) {
      this.modalNode.show();
    } else {
      this.setState({
        showEditModal: true,
      });
    }
  },

  editButton() {
    if (this.props.canUpdate) {
      return (
        <Button onClick={this.showEditModal} bsStyle="default" bsSize="xs" title="Edit puzzle...">
          <Glyphicon glyph="edit" />
        </Button>
      );
    }
    return null;
  },

  render() {
    // id, title, answer, tags
    const linkTarget = `/hunts/${this.props.puzzle.hunt}/puzzles/${this.props.puzzle._id}`;
    const tagIndex = _.indexBy(this.props.allTags, '_id');
    const shownTags = _.difference(this.props.puzzle.tags, this.props.suppressTags || []);
    const ownTags = shownTags.map((tagId) => { return tagIndex[tagId]; });
    const isAdministrivia = _.find(this.props.puzzle.tags, (t) => { return tagIndex[t].name === 'administrivia'; });

    const puzzleClasses = classnames('puzzle',
      this.props.puzzle.answer ? 'solved' : 'unsolved',
      this.props.layout === 'grid' ? 'puzzle-grid' : null,
      this.props.layout === 'table' ? 'puzzle-table-row' : null,
      isAdministrivia ? 'administrivia' : null);

    if (this.props.layout === 'table') {
      return (
        <tr className={puzzleClasses}>
          <td className="puzzle-title">
            {this.editButton()}
            {' '}
            <Link to={linkTarget}>{this.props.puzzle.title}</Link>
          </td>
          <td className="puzzle-answer">
            {this.props.puzzle.answer ? <PuzzleAnswer answer={this.props.puzzle.answer} /> : null}
          </td>
        </tr>
      );
    }

    return (
      <div className={puzzleClasses}>
        {this.state.showEditModal ? (
          <PuzzleModalForm
            ref={(node) => {
              if (node && this.modalNode === undefined) {
                // Automatically show this node the first time it's created.
                node.show();
              }

              this.modalNode = node;
            }}
            puzzle={this.props.puzzle}
            huntId={this.props.puzzle.hunt}
            tags={this.props.allTags}
            onSubmit={this.onEdit}
          />
        ) : null}
        <div className="puzzle-title">
          {this.editButton()}
          {' '}
          <Link to={linkTarget}>{this.props.puzzle.title}</Link>
        </div>
        {this.props.layout === 'grid' ? (
          <div className="puzzle-link">
            {this.props.puzzle.url ? (
              <span>
                (
                <a href={this.props.puzzle.url} target="_blank" rel="noopener noreferrer">puzzle</a>
                )
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="puzzle-view-count">
          {!this.props.puzzle.answer && !isAdministrivia && <SubscriberCount puzzleId={this.props.puzzle._id} />}
        </div>
        <div className="puzzle-answer">
          {this.props.puzzle.answer ? <PuzzleAnswer answer={this.props.puzzle.answer} /> : null}
        </div>
        <TagList puzzleId={this.props.puzzle._id} tags={ownTags} linkToSearch={this.props.layout === 'grid'} />
      </div>
    );
  },
});

export default Puzzle;
