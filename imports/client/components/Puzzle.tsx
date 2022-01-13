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
import PuzzleAnswer from './PuzzleAnswer';
import PuzzleDeleteModal from './PuzzleDeleteModal';
import PuzzleModalForm, { PuzzleModalFormSubmitPayload } from './PuzzleModalForm';
import SubscriberCount from './SubscriberCount';
import TagList from './TagList';

interface PuzzleProps {
  puzzle: PuzzleType;
  // All tags associated with the hunt.
  allTags: TagType[];
  layout: 'grid' | 'table';
  canUpdate: boolean;
  suppressTags?: string[];
  segmentAnswers?: boolean;
}

const Puzzle = React.memo((props: PuzzleProps) => {
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
    Ansible.log('Updating puzzle properties', { puzzle: props.puzzle._id, user: Meteor.userId(), state });
    Meteor.call('updatePuzzle', props.puzzle._id, state, callback);
  }, [props.puzzle._id]);

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
    if (props.canUpdate) {
      return (
        <ButtonGroup size="sm">
          <Button onClick={onShowEditModal} variant="light" title="Edit puzzle...">
            <FontAwesomeIcon icon={faEdit} />
          </Button>
          {!props.puzzle.deleted && (
            <Button onClick={onShowDeleteModal} variant="light" title="Delete puzzle...">
              <FontAwesomeIcon icon={faMinus} />
            </Button>
          )}
        </ButtonGroup>
      );
    }
    return null;
  }, [props.canUpdate, props.puzzle.deleted, onShowEditModal, onShowDeleteModal]);

  // id, title, answer, tags
  const linkTarget = `/hunts/${props.puzzle.hunt}/puzzles/${props.puzzle._id}`;
  const tagIndex = _.indexBy(props.allTags, '_id');
  const shownTags = _.difference(props.puzzle.tags, props.suppressTags || []);
  const ownTags = shownTags.map((tagId) => { return tagIndex[tagId]; }).filter(Boolean);

  const puzzleClasses = classnames(
    'puzzle',
    props.puzzle.expectedAnswerCount === 0 ? 'administrivia' : null,
    props.puzzle.expectedAnswerCount > 0 && props.puzzle.answers.length >= props.puzzle.expectedAnswerCount ? 'solved' : null,
    props.puzzle.expectedAnswerCount > 0 && props.puzzle.answers.length < props.puzzle.expectedAnswerCount ? 'unsolved' : null,
    props.layout === 'grid' ? 'puzzle-grid' : null,
    props.layout === 'table' ? 'puzzle-table-row' : null
  );

  const answers = props.puzzle.answers.map((answer, i) => {
    return (
      // eslint-disable-next-line react/no-array-index-key
      <PuzzleAnswer key={`${i}-${answer}`} answer={answer} respace={props.segmentAnswers} />
    );
  });

  if (props.layout === 'table') {
    return (
      <tr className={puzzleClasses}>
        <td className="puzzle-title">
          {editButtons}
          {' '}
          <Link to={linkTarget}>{props.puzzle.title}</Link>
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
          key={props.puzzle._id}
          ref={editModalRef}
          puzzle={props.puzzle}
          huntId={props.puzzle.hunt}
          tags={props.allTags}
          onSubmit={onEdit}
          showOnMount
        />
      ) : null}
      {renderDeleteModal && (
        <PuzzleDeleteModal
          ref={deleteModalRef}
          puzzle={props.puzzle}
        />
      )}
      {props.canUpdate && (
        <div className="puzzle-column puzzle-edit-button">
          {editButtons}
        </div>
      )}
      <div className="puzzle-column puzzle-title">
        <Link to={linkTarget}>{props.puzzle.title}</Link>
      </div>
      <div className="puzzle-column puzzle-view-count">
        {!(props.puzzle.answers.length >= props.puzzle.expectedAnswerCount) && <SubscriberCount puzzleId={props.puzzle._id} />}
      </div>
      <div className="puzzle-column puzzle-link">
        {props.puzzle.url ? (
          <span>
            <a href={props.puzzle.url} target="_blank" rel="noopener noreferrer" title="Open the puzzle">
              <FontAwesomeIcon icon={faPuzzlePiece} />
            </a>
          </span>
        ) : null}
      </div>
      <div className="puzzle-column puzzle-answer">
        {answers}
      </div>
      <TagList className="puzzle-column" puzzle={props.puzzle} tags={ownTags} linkToSearch={props.layout === 'grid'} popoverRelated={false} />
    </div>
  );
});

export default Puzzle;
