import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { faEdit } from '@fortawesome/free-solid-svg-icons/faEdit';
import { faPuzzlePiece } from '@fortawesome/free-solid-svg-icons/faPuzzlePiece';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classnames from 'classnames';
import React from 'react';
import Button from 'react-bootstrap/Button';
import { Link } from 'react-router-dom';
import Ansible from '../../ansible';
import { PuzzleType } from '../../lib/schemas/puzzles';
import { TagType } from '../../lib/schemas/tags';
import PuzzleAnswer from './PuzzleAnswer';
import PuzzleModalForm, { PuzzleModalFormSubmitPayload } from './PuzzleModalForm';
import SubscriberCount from './SubscriberCount';
import TagList from './TagList';

/* eslint-disable max-len */

interface PuzzleProps {
  puzzle: PuzzleType;
  // All tags associated with the hunt.
  allTags: TagType[];
  layout: 'grid' | 'table';
  canUpdate: boolean;
  suppressTags?: string[];
}

interface PuzzleState {
  showEditModal: boolean;
}

class Puzzle extends React.PureComponent<PuzzleProps, PuzzleState> {
  private modalRef: React.RefObject<PuzzleModalForm>;

  static displayName = 'Puzzle';

  constructor(props: PuzzleProps) {
    super(props);
    this.state = {
      // Generating the edit modals for all puzzles is expensive, so we do it
      // lazily. The first time the modal button is clicked, we change this state
      // variable, which causes us to mount a new modal, which is set to open on
      // mount. Subsequent times, we just open the existing modal.
      showEditModal: false,
    };
    this.modalRef = React.createRef();
  }

  onEdit = (state: PuzzleModalFormSubmitPayload, callback: (error?: Error) => void) => {
    Ansible.log('Updating puzzle properties', { puzzle: this.props.puzzle._id, user: Meteor.userId(), state });
    Meteor.call('updatePuzzle', this.props.puzzle._id, state, callback);
  };

  showEditModal = () => {
    if (this.state.showEditModal && this.modalRef.current) {
      this.modalRef.current.show();
    } else {
      this.setState({
        showEditModal: true,
      });
    }
  };

  editButton = () => {
    if (this.props.canUpdate) {
      return (
        <Button onClick={this.showEditModal} variant="light" size="sm" title="Edit puzzle...">
          <FontAwesomeIcon icon={faEdit} />
        </Button>
      );
    }
    return null;
  };

  render() {
    // id, title, answer, tags
    const linkTarget = `/hunts/${this.props.puzzle.hunt}/puzzles/${this.props.puzzle._id}`;
    const tagIndex = _.indexBy(this.props.allTags, '_id');
    const shownTags = _.difference(this.props.puzzle.tags, this.props.suppressTags || []);
    const ownTags = shownTags.map((tagId) => { return tagIndex[tagId]; }).filter(Boolean);
    const isAdministrivia = this.props.puzzle.tags.find((t) => { return tagIndex[t] && tagIndex[t].name === 'administrivia'; });

    const puzzleClasses = classnames('puzzle',
      this.props.puzzle.answers.length >= this.props.puzzle.expectedAnswerCount ? 'solved' : 'unsolved',
      this.props.layout === 'grid' ? 'puzzle-grid' : null,
      this.props.layout === 'table' ? 'puzzle-table-row' : null,
      isAdministrivia ? 'administrivia' : null);

    const answers = this.props.puzzle.answers.map((answer, i) => {
      return (
        // eslint-disable-next-line react/no-array-index-key
        <PuzzleAnswer key={`${i}-${answer}`} answer={answer} />
      );
    });

    if (this.props.layout === 'table') {
      return (
        <tr className={puzzleClasses}>
          <td className="puzzle-title">
            {this.editButton()}
            {' '}
            <Link to={linkTarget}>{this.props.puzzle.title}</Link>
          </td>
          <td className="puzzle-answer">
            {answers}
          </td>
        </tr>
      );
    }

    return (
      <div className={puzzleClasses}>
        {this.state.showEditModal ? (
          <PuzzleModalForm
            key={this.props.puzzle._id}
            ref={this.modalRef}
            puzzle={this.props.puzzle}
            huntId={this.props.puzzle.hunt}
            tags={this.props.allTags}
            onSubmit={this.onEdit}
            showOnMount
          />
        ) : null}
        {this.props.canUpdate && (
          <div className="puzzle-edit-button">
            {this.editButton()}
          </div>
        )}
        <div className="puzzle-title">
          <Link to={linkTarget}>{this.props.puzzle.title}</Link>
        </div>
        <div className="puzzle-view-count">
          {!(this.props.puzzle.answers.length >= this.props.puzzle.expectedAnswerCount) && !isAdministrivia && <SubscriberCount puzzleId={this.props.puzzle._id} />}
        </div>
        <div className="puzzle-link">
          {this.props.puzzle.url ? (
            <span>
              <a href={this.props.puzzle.url} target="_blank" rel="noopener noreferrer" title="Open the puzzle">
                <FontAwesomeIcon icon={faPuzzlePiece} />
              </a>
            </span>
          ) : null}
        </div>
        <div className="puzzle-answer">
          {answers}
        </div>
        <TagList puzzle={this.props.puzzle} tags={ownTags} linkToSearch={this.props.layout === 'grid'} popoverRelated={false} />
      </div>
    );
  }
}

export default Puzzle;
