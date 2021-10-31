import { faMinus } from '@fortawesome/free-solid-svg-icons/faMinus';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useCallback, useState } from 'react';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import { PuzzleType } from '../../lib/schemas/puzzle';
import { TagType } from '../../lib/schemas/tags';
import Tag from './Tag';
import TagEditor from './TagEditor';

interface BaseTagListProps {
  className?: string;
  puzzle: PuzzleType;
  tags: TagType[];
  onCreateTag?: (tagName: string) => void; // if provided, will show UI for adding a new tag
  onRemoveTag?: (tagId: string) => void; // callback if user wants to remove a tag
  linkToSearch: boolean;
  showControls?: boolean;
  emptyMessage?: string;
}

interface DoNotPopoverRelatedProps {
  popoverRelated: false;
}

interface PopoverRelatedProps {
  popoverRelated: true;
  allPuzzles: PuzzleType[];
  allTags: TagType[];
}

type TagListProps = BaseTagListProps & (DoNotPopoverRelatedProps | PopoverRelatedProps);

const soloTagInterestingness = (tag: TagType) => {
  if (tag.name === 'is:metameta') {
    return -6;
  } else if (tag.name === 'is:meta') {
    return -5;
  } else if (tag.name.lastIndexOf('meta-for:', 0) === 0) {
    return -4;
  } else if (tag.name.lastIndexOf('group:', 0) === 0) {
    return -3;
  } else if (tag.name.lastIndexOf('needs:', 0) === 0) {
    return -2;
  } else if (tag.name.lastIndexOf('priority:', 0) === 0) {
    return -1;
  } else {
    return 0;
  }
};

const sortedTagsForSinglePuzzle = (tags: TagType[]) => {
  // The sort order for tags should probably be:
  // * "is:metameta" first
  // * then "is:meta"
  // * "meta:*" comes next (sorted alphabetically, if multiple are present)
  // * all other tags, sorted alphabetically
  const sortedTags = tags.slice(0);

  sortedTags.sort((a, b) => {
    const ia = soloTagInterestingness(a);
    const ib = soloTagInterestingness(b);
    if (ia !== ib) {
      return ia - ib;
    } else {
      return a.name.localeCompare(b.name);
    }
  });

  return sortedTags;
};

const TagList = React.memo((props: TagListProps) => {
  const [editing, setEditing] = useState<boolean>(false);
  const [removing, setRemoving] = useState<boolean>(false);

  const { onCreateTag, onRemoveTag } = props;

  const submitTag = useCallback((newTagName: string) => {
    // TODO: submitTag should use the value passed in from the child, which may have done some
    // autocomplete matching that this component doesn't know about.
    if (onCreateTag) {
      onCreateTag(newTagName);
    }
    setEditing(false);
  }, [onCreateTag]);

  const startEditing = useCallback(() => {
    setEditing(true);
  }, []);

  const stopEditing = useCallback(() => {
    setEditing(false);
  }, []);

  const startRemoving = useCallback(() => {
    setRemoving(true);
  }, []);

  const stopRemoving = useCallback(() => {
    setRemoving(false);
  }, []);

  const removeTag = useCallback((tagIdToRemove: string) => {
    if (onRemoveTag) {
      onRemoveTag(tagIdToRemove);
    }
  }, [onRemoveTag]);

  const showControls = props.showControls ?? true;
  const emptyMessage = props.emptyMessage ?? '';

  const tags = sortedTagsForSinglePuzzle(props.tags);
  const components = [];
  for (let i = 0; i < tags.length; i++) {
    components.push(
      <Tag
        key={tags[i]._id}
        tag={tags[i]}
        onRemove={removing ? removeTag : undefined}
        linkToSearch={props.linkToSearch}
        popoverRelated={props.popoverRelated}
        allPuzzles={props.popoverRelated ? props.allPuzzles : []}
        allTags={props.popoverRelated ? props.allTags : []}
      />
    );
  }

  if (tags.length === 0 && emptyMessage) {
    components.push(
      <span className="tag-list-empty-label" key="noTagLabel">{emptyMessage}</span>
    );
  }

  if (editing) {
    components.push(
      <TagEditor
        key="tagEditor"
        puzzle={props.puzzle}
        onSubmit={submitTag}
        onCancel={stopEditing}
      />
    );
  } else if (removing) {
    components.push(
      <Button
        key="stopRemoving"
        className="tag-modify-button"
        onClick={stopRemoving}
      >
        Done removing
      </Button>
    );
  } else if (showControls && (onCreateTag || onRemoveTag)) {
    components.push(
      <ButtonGroup key="editRemoveGroup">
        {onCreateTag && (
          <Button
            variant="secondary"
            title="Add tag..."
            key="startEditing"
            className="tag-modify-button"
            onClick={startEditing}
          >
            <FontAwesomeIcon fixedWidth icon={faPlus} />
          </Button>
        )}
        {onRemoveTag && tags.length > 0 && (
          <Button
            variant="secondary"
            title="Remove tag..."
            key="startRemoving"
            className="tag-modify-button"
            onClick={startRemoving}
          >
            <FontAwesomeIcon fixedWidth icon={faMinus} />
          </Button>
        )}
      </ButtonGroup>
    );
  }

  return (
    <div className={`tag-list ${props.className}`}>
      {components}
    </div>
  );
});

export default TagList;
