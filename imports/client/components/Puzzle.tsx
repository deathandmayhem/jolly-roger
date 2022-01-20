/* eslint-disable max-len */
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { faEdit } from '@fortawesome/free-solid-svg-icons/faEdit';
import { faMinus } from '@fortawesome/free-solid-svg-icons/faMinus';
import { faPuzzlePiece } from '@fortawesome/free-solid-svg-icons/faPuzzlePiece';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classnames from 'classnames';
import React, {
  useCallback, useMemo, useRef, useState,
} from 'react';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/esm/ButtonGroup';
import { Link } from 'react-router-dom';
import Ansible from '../../ansible';
import { PuzzleType } from '../../lib/schemas/puzzle';
import { TagType } from '../../lib/schemas/tag';
import { useOperatorActionsHiddenForHunt } from '../hooks/persisted-state';
import PuzzleActivity from './PuzzleActivity';
import PuzzleAnswer from './PuzzleAnswer';
import PuzzleDeleteModal from './PuzzleDeleteModal';
import PuzzleModalForm, { PuzzleModalFormSubmitPayload } from './PuzzleModalForm';
import TagList from './TagList';

const Puzzle = React.memo(({
  puzzle, allTags, layout, canUpdate, suppressTags, segmentAnswers,
}: {
  puzzle: PuzzleType;
  // All tags associated with the hunt.
  allTags: TagType[];
  layout: 'grid' | 'table';
  canUpdate: boolean;
  suppressTags?: string[];
  segmentAnswers?: boolean;
}) => {
  const [operatorActionsHidden] = useOperatorActionsHiddenForHunt(puzzle.hunt);
  const showEdit = canUpdate && !operatorActionsHidden;

  // Generating the edit modals for all puzzles is expensive, so we do it
  // lazily. The first time the modal button is clicked, we change this state
  // variable, which causes us to mount a new modal, which is set to open on
  // mount. Subsequent times, we just open the existing modal.
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const editModalRef = useRef<React.ElementRef<typeof PuzzleModalForm>>(null);
  const [renderDeleteModal, setRenderDeleteModal] = useState<boolean>(false);
  const deleteModalRef = useRef<React.ElementRef<typeof PuzzleDeleteModal>>(null);

  const onEdit = useCallback((
    state: PuzzleModalFormSubmitPayload,
    callback: (error?: Error) => void
  ) => {
    Ansible.log('Updating puzzle properties', { puzzle: puzzle._id, user: Meteor.userId(), state });
    Meteor.call('updatePuzzle', puzzle._id, state, callback);
  }, [puzzle._id]);

  const onShowEditModal = useCallback(() => {
    if (showEditModal && editModalRef.current) {
      editModalRef.current.show();
    } else {
      setShowEditModal(true);
    }
  }, [showEditModal]);
  const onShowDeleteModal = useCallback(() => {
    if (renderDeleteModal && deleteModalRef.current) {
      deleteModalRef.current.show();
    } else {
      setRenderDeleteModal(true);
    }
  }, [renderDeleteModal]);

  const editButtons = useMemo(() => {
    if (showEdit) {
      return (
        <ButtonGroup size="sm">
          <Button onClick={onShowEditModal} variant="light" title="Edit puzzle...">
            <FontAwesomeIcon icon={faEdit} />
          </Button>
          {!puzzle.deleted && (
            <Button onClick={onShowDeleteModal} variant="light" title="Delete puzzle...">
              <FontAwesomeIcon icon={faMinus} />
            </Button>
          )}
        </ButtonGroup>
      );
    }
    return null;
  }, [showEdit, puzzle.deleted, onShowEditModal, onShowDeleteModal]);

  // id, title, answer, tags
  const linkTarget = `/hunts/${puzzle.hunt}/puzzles/${puzzle._id}`;
  const tagIndex = _.indexBy(allTags, '_id');
  const shownTags = _.difference(puzzle.tags, suppressTags || []);
  const ownTags = shownTags.map((tagId) => { return tagIndex[tagId]; }).filter(Boolean);

  const puzzleClasses = classnames(
    'puzzle',
    puzzle.expectedAnswerCount === 0 ? 'administrivia' : null,
    puzzle.expectedAnswerCount > 0 && puzzle.answers.length >= puzzle.expectedAnswerCount ? 'solved' : null,
    puzzle.expectedAnswerCount > 0 && puzzle.answers.length < puzzle.expectedAnswerCount ? 'unsolved' : null,
    layout === 'grid' ? 'puzzle-grid' : null,
    layout === 'table' ? 'puzzle-table-row' : null
  );

  const answers = puzzle.answers.map((answer, i) => {
    return (
      // eslint-disable-next-line react/no-array-index-key
      <PuzzleAnswer key={`${i}-${answer}`} answer={answer} respace={segmentAnswers} />
    );
  });

  if (layout === 'table') {
    return (
      <tr className={puzzleClasses}>
        <td className="puzzle-title">
          {editButtons}
          {' '}
          <Link to={linkTarget}>{puzzle.title}</Link>
        </td>
        <td className="puzzle-answer">
          {answers}
        </td>
      </tr>
    );
  }

  return (
    <div className={puzzleClasses}>
      {showEditModal ? (
        <PuzzleModalForm
          key={puzzle._id}
          ref={editModalRef}
          puzzle={puzzle}
          huntId={puzzle.hunt}
          tags={allTags}
          onSubmit={onEdit}
          showOnMount
        />
      ) : null}
      {renderDeleteModal && (
        <PuzzleDeleteModal
          ref={deleteModalRef}
          puzzle={puzzle}
        />
      )}
      {showEdit && (
        <div className="puzzle-column puzzle-edit-button">
          {editButtons}
        </div>
      )}
      <div className="puzzle-column puzzle-title">
        <Link to={linkTarget}>{puzzle.title}</Link>
      </div>
      <div className="puzzle-column puzzle-activity">
        {!(puzzle.answers.length >= puzzle.expectedAnswerCount) && <PuzzleActivity huntId={puzzle.hunt} puzzleId={puzzle._id} unlockTime={puzzle.createdAt} />}
      </div>
      <div className="puzzle-column puzzle-link">
        {puzzle.url ? (
          <span>
            <a href={puzzle.url} target="_blank" rel="noopener noreferrer" title="Open the puzzle">
              <FontAwesomeIcon icon={faPuzzlePiece} />
            </a>
          </span>
        ) : null}
      </div>
      <div className="puzzle-column puzzle-answer">
        {answers}
      </div>
      <TagList className="puzzle-column" puzzle={puzzle} tags={ownTags} linkToSearch={layout === 'grid'} popoverRelated={false} />
    </div>
  );
});

export default Puzzle;
