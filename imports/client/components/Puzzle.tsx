/* eslint-disable max-len */
import { Meteor } from 'meteor/meteor';
import { faEdit } from '@fortawesome/free-solid-svg-icons/faEdit';
import { faMinus } from '@fortawesome/free-solid-svg-icons/faMinus';
import { faPuzzlePiece } from '@fortawesome/free-solid-svg-icons/faPuzzlePiece';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {
  useCallback, useMemo, useRef, useState,
} from 'react';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/esm/ButtonGroup';
import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';
import Ansible from '../../Ansible';
import { difference, indexedById } from '../../lib/listUtils';
import { PuzzleType } from '../../lib/schemas/Puzzle';
import { TagType } from '../../lib/schemas/Tag';
import { computeSolvedness, Solvedness } from '../../lib/solvedness';
import updatePuzzle from '../../methods/updatePuzzle';
import { useOperatorActionsHiddenForHunt } from '../hooks/persisted-state';
import PuzzleActivity from './PuzzleActivity';
import PuzzleAnswer from './PuzzleAnswer';
import PuzzleDeleteModal from './PuzzleDeleteModal';
import PuzzleModalForm, { PuzzleModalFormSubmitPayload } from './PuzzleModalForm';
import TagList from './TagList';
import Breakable from './styling/Breakable';
import { backgroundColorLookupTable } from './styling/constants';
import { mediaBreakpointDown } from './styling/responsive';

const PuzzleDiv = styled.div<{
  solvedness: Solvedness,
}>`
  ${({ solvedness }) => css`
    background-color: ${backgroundColorLookupTable[solvedness]};
  `}

  display: flex;
  flex-direction: row;
  align-items: first baseline;
  justify-content: flex-start;
  line-height: 24px;
  padding: 4px 2px;
  margin-bottom: 4px;
  ${mediaBreakpointDown('xs', css`
    flex-wrap: wrap;
  `)}
`;

const PuzzleColumn = styled.div`
  padding: 0 2px;
  display: inline-block;
  flex: none;
  overflow: hidden;
`;

const PuzzleEditButtonsColumn = styled(PuzzleColumn)`
  align-self: flex-start;
`;

const StyledButton = styled(Button)`
  // Precedence boost needed to override bootstrap default button padding
  && {
    // Resize button to fit in one line-height
    display: block;
    height: 24px;
    width: 24px;
    padding: 0;
  }
`;

const PuzzleTitleColumn = styled(Breakable)`
  flex: 4;
`;

const PuzzleActivityColumn = styled(PuzzleColumn)`
  width: 11rem;
  text-align: right;
  ${mediaBreakpointDown('xs', css`
    // Push to take whole row in narrow views
    flex: 0 0 100%;
  `)}
`;

const PuzzleLinkColumn = styled(PuzzleColumn)`
  width: 26px;
  text-align: center;
`;

const PuzzleAnswerColumn = styled(PuzzleColumn)`
  flex: 3;
  ${mediaBreakpointDown('xs', css`
    // Push to take whole row in narrow views
    flex: 0 0 100%;
  `)}
`;

const TagListColumn = styled(TagList)`
  padding: 0 2px;
  display: inline-block;
  flex: 3;
  margin: -2px -4px -2px 0;
  ${mediaBreakpointDown('xs', css`
    flex: 0 0 100%;
  `)}
`;

const Puzzle = React.memo(({
  puzzle, allTags, canUpdate, suppressTags, segmentAnswers,
}: {
  puzzle: PuzzleType;
  // All tags associated with the hunt.
  allTags: TagType[];
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
    const { huntId: _huntId, docType: _docType, ...rest } = state;
    updatePuzzle.call({ puzzleId: puzzle._id, ...rest }, callback);
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
          <StyledButton onClick={onShowEditModal} variant="light" title="Edit puzzle...">
            <FontAwesomeIcon icon={faEdit} />
          </StyledButton>
          {!puzzle.deleted && (
            <StyledButton onClick={onShowDeleteModal} variant="light" title="Delete puzzle...">
              <FontAwesomeIcon icon={faMinus} />
            </StyledButton>
          )}
        </ButtonGroup>
      );
    }
    return null;
  }, [showEdit, puzzle.deleted, onShowEditModal, onShowDeleteModal]);

  // id, title, answer, tags
  const linkTarget = `/hunts/${puzzle.hunt}/puzzles/${puzzle._id}`;
  const tagIndex = indexedById(allTags);
  const shownTags = difference(puzzle.tags, suppressTags ?? []);
  const ownTags = shownTags
    .map((tagId) => { return tagIndex.get(tagId); })
    .filter<TagType>((t): t is TagType => t !== undefined);

  const solvedness = computeSolvedness(puzzle);
  const answers = puzzle.answers.map((answer, i) => {
    return (
      // eslint-disable-next-line react/no-array-index-key
      <PuzzleAnswer key={`${i}-${answer}`} answer={answer} respace={segmentAnswers} breakable={!segmentAnswers} indented={!segmentAnswers} />
    );
  });

  return (
    <PuzzleDiv solvedness={solvedness}>
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
        <PuzzleEditButtonsColumn>
          {editButtons}
        </PuzzleEditButtonsColumn>
      )}
      <PuzzleTitleColumn>
        <Link to={linkTarget}>{puzzle.title}</Link>
      </PuzzleTitleColumn>
      <PuzzleActivityColumn>
        {!(puzzle.answers.length >= puzzle.expectedAnswerCount) && <PuzzleActivity huntId={puzzle.hunt} puzzleId={puzzle._id} unlockTime={puzzle.createdAt} />}
      </PuzzleActivityColumn>
      <PuzzleLinkColumn>
        {puzzle.url ? (
          <span>
            <a href={puzzle.url} target="_blank" rel="noopener noreferrer" title="Open the puzzle">
              <FontAwesomeIcon icon={faPuzzlePiece} />
            </a>
          </span>
        ) : null}
      </PuzzleLinkColumn>
      <PuzzleAnswerColumn>
        {answers}
      </PuzzleAnswerColumn>
      <TagListColumn puzzle={puzzle} tags={ownTags} linkToSearch popoverRelated={false} />
    </PuzzleDiv>
  );
});

export default Puzzle;
