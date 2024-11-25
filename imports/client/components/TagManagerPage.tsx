import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import Hunts, { HuntType } from "../../lib/models/Hunts";
import Tags, { TagType } from "../../lib/models/Tags";
import { userIsOperatorForHunt, userMayWritePuzzlesForHunt } from "../../lib/permission_stubs";
import puzzlesForPuzzleList from "../../lib/publications/puzzlesForPuzzleList";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import ModalForm, { ModalFormHandle } from "./ModalForm";
import destroyTag from "../../methods/destroyTag";
import { faEdit, faMinus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ButtonGroup, Button } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import Puzzles from "../../lib/models/Puzzles";
import styled, { css } from "styled-components";
import { mediaBreakpointDown } from "./styling/responsive";

const TagColumn = styled.div`
  padding: 0 2px;
  display: inline-block;
  flex: none;
  overflow: hidden;
`;

const TagPuzzleDiv = styled.div`
  display: flex;
  flex-direction: row;
  align-items: first baseline;
  justify-content: flex-start;
  line-height: 24px;
  padding: 4px 2px;
  margin-bottom: 4px;
  ${mediaBreakpointDown(
    "xs",
    css`
      flex-wrap: wrap;
    `,
  )}
`;

const TagControlButtonsColumn = styled(TagColumn)`
  align-self: flex-start;
  order: -1;
`;

const TagNameColumn = styled(TagColumn)`
  flex: 4;
  overflow-wrap: break-word;
  order: -1;
`;

const Tag = React.memo(({ hunt, tag }: { hunt: HuntType, tag: TagType }) => {
  const tagId = tag._id;
  const huntId = hunt._id;

  const { canUpdate, canDestroy } = useTracker(() => {
    return {
      canUpdate: userIsOperatorForHunt(Meteor.user(), hunt),

      // Because we delete by setting the deleted flag, you only need
      // update to "remove" something
      canDestroy: userIsOperatorForHunt(Meteor.user(), hunt),
    };
  }, [hunt]);

  const deleteModalRef = useRef<ModalFormHandle>(null);

  const onDelete = useCallback(
    (callback: () => void) => {
      destroyTag.call({ tagId }, callback);
    },
    [huntId],
  );

  const showDeleteModal = useCallback(() => {
    if (deleteModalRef.current) {
      deleteModalRef.current.show();
    }
  }, []);

  const puzzlesForTag = useTracker(() => {
    return Puzzles.find({tags: tagId}).fetch();
  })

  return (
    <TagPuzzleDiv>
      <ModalForm
        ref={deleteModalRef}
        title="Delete Tag"
        submitLabel="Delete"
        submitStyle="danger"
        onSubmit={onDelete}
      >
        Are you sure you want to delete <code>{tag.name}</code>?
        This will remove the tag from {puzzlesForTag.length}&nbsp;
        puzzle{puzzlesForTag.length == 1 ? '' : 's'}.
      </ModalForm>
      <TagControlButtonsColumn>
      <ButtonGroup size="sm">
        {canUpdate ? (
          <LinkContainer to={tag._id}>
            <Button as="a" variant="outline-secondary" title="Edit tag...">
              <FontAwesomeIcon fixedWidth icon={faEdit} />
            </Button>
          </LinkContainer>
        ) : undefined}
        {canDestroy ? (
          <Button
            onClick={showDeleteModal}
            variant="danger"
            title="Delete hunt..."
          >
            <FontAwesomeIcon fixedWidth icon={faMinus} />
          </Button>
        ) : undefined}
      </ButtonGroup>
      </TagControlButtonsColumn>
      <TagNameColumn>
      <Link to={tagId}>{tag.name}</Link>
      </TagNameColumn>
    </TagPuzzleDiv>
  );
});


const TagListView = ({
  huntId,
  canAdd,
  canUpdate,
  loading,
}: {
  huntId: string;
  canAdd: boolean;
  canUpdate: boolean;
  loading: boolean;
}) => {

  const allTags = useTracker(
    () => Tags.find({ hunt: huntId }).fetch(),
    [huntId],
  );

  const hunt = useTracker(
    () => Hunts.findOne(huntId),
    [huntId]
  );

  return (
    <div>
      {allTags.map((t) => {return <Tag
      key={t._id}
      hunt={hunt}
      tag={t}
      />})}
    </div>
  );
};

const TagManagerPage = () => {
  const huntId = useParams<"huntId">().huntId!;

  const tags = useTracker(() => Tags.find({hunt: huntId}).fetch(), [huntId]);

  // Assertion is safe because hunt is already subscribed and checked by HuntApp
  const hunt = useTracker(() => Hunts.findOne(huntId)!, [huntId]);
  const { canAdd, canUpdate } = useTracker(() => {
    return {
      canAdd: userMayWritePuzzlesForHunt(Meteor.user(), hunt),
      canUpdate: userMayWritePuzzlesForHunt(Meteor.user(), hunt),
    };
  }, [hunt]);

  useTypedSubscribe(puzzlesForPuzzleList, {
    huntId,
    includeDeleted: canUpdate,
  }); // need to figure out why this is needed for the page to work
  const loading = false;

  // Don't bother including this in loading - it's ok if they trickle in
  // useTypedSubscribe(puzzleActivityForHunt, { huntId });

  return loading ? (
    <span>loading...</span>
  ) : (
    <TagListView
    huntId={huntId}
    canAdd={canAdd}
    canUpdate={canUpdate}
    loading={loading}
    />
  );
};

export default TagManagerPage;
