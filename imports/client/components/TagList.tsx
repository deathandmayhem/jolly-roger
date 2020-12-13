import { _ } from 'meteor/underscore';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import { PuzzleType } from '../../lib/schemas/puzzles';
import { TagType } from '../../lib/schemas/tags';
import Tag from './Tag';
import TagEditor from './TagEditor';

interface BaseTagListProps {
  puzzle: PuzzleType;
  tags: TagType[];
  onCreateTag?: (tagName: string) => void; // if provided, will show UI for adding a new tag
  onRemoveTag?: (tagId: string) => void; // callback if user wants to remove a tag
  linkToSearch: boolean;
  showControls?: boolean;
  emptyMessage: string;
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

interface TagListState {
  editing: boolean;
  removing: boolean;
}

class TagList extends React.PureComponent<TagListProps, TagListState> {
  static displayName = 'TagList';

  static defaultProps = {
    showControls: true,
    emptyMessage: '',
  };

  constructor(props: TagListProps) {
    super(props);
    this.state = {
      editing: false,
      removing: false,
    };
  }

  submitTag = (newTagName: string) => {
    // TODO: submitTag should use the value passed in from the child, which may have done some
    // autocomplete matching that this component doesn't know about.
    if (this.props.onCreateTag) {
      this.props.onCreateTag(newTagName);
    }
    this.setState({
      editing: false,
    });
  };

  startEditing = () => {
    this.setState({ editing: true });
  };

  stopEditing = () => {
    this.setState({ editing: false });
  };

  startRemoving = () => {
    this.setState({ removing: true });
  };

  stopRemoving = () => {
    this.setState({ removing: false });
  };

  removeTag = (tagIdToRemove: string) => {
    if (this.props.onRemoveTag) {
      this.props.onRemoveTag(tagIdToRemove);
    }
  };

  soloTagInterestingness = (tag: TagType) => {
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

  sortedTagsForSinglePuzzle = (tags: TagType[]) => {
    // The sort order for tags should probably be:
    // * "is:metameta" first
    // * then "is:meta"
    // * "meta:*" comes next (sorted alphabetically, if multiple are present)
    // * all other tags, sorted alphabetically
    const sortedTags = tags.slice(0);

    sortedTags.sort((a, b) => {
      const ia = this.soloTagInterestingness(a);
      const ib = this.soloTagInterestingness(b);
      if (ia !== ib) {
        return ia - ib;
      } else {
        return a.name.localeCompare(b.name);
      }
    });

    return sortedTags;
  };

  render() {
    const tags = this.sortedTagsForSinglePuzzle(this.props.tags);
    const components = [];
    for (let i = 0; i < tags.length; i++) {
      components.push(
        <Tag
          key={tags[i]._id}
          tag={tags[i]}
          onRemove={this.state.removing ? this.removeTag : undefined}
          linkToSearch={this.props.linkToSearch}
          popoverRelated={this.props.popoverRelated}
          allPuzzles={this.props.popoverRelated ? this.props.allPuzzles : []}
          allTags={this.props.popoverRelated ? this.props.allTags : []}
        />
      );
    }

    if (tags.length === 0 && this.props.emptyMessage) {
      components.push(
        <span className="tag-list-empty-label" key="noTagLabel">{this.props.emptyMessage}</span>
      );
    }

    if (this.state.editing) {
      components.push(
        <TagEditor
          key="tagEditor"
          puzzle={this.props.puzzle}
          onSubmit={this.submitTag}
          onCancel={this.stopEditing}
        />
      );
    } else if (this.state.removing) {
      components.push(
        <Button
          key="stopRemoving"
          className="tag-modify-button"
          onClick={this.stopRemoving}
        >
          Done removing
        </Button>
      );
    } else if (this.props.showControls && (this.props.onCreateTag || this.props.onRemoveTag)) {
      components.push(
        <ButtonGroup key="editRemoveGroup">
          {this.props.onCreateTag && (
            <Button
              variant="outline-secondary"
              title="Add tag..."
              key="startEditing"
              className="tag-modify-button"
              onClick={this.startEditing}
            >
              <FontAwesomeIcon fixedWidth icon={faPlus} />
            </Button>
          )}
          {this.props.onRemoveTag && tags.length > 0 && (
            <Button
              variant="outline-secondary"
              title="Remove tag..."
              key="startRemoving"
              className="tag-modify-button"
              onClick={this.startRemoving}
            >
              <FontAwesomeIcon fixedWidth icon={faMinus} />
            </Button>
          )}
        </ButtonGroup>
      );
    }

    return (
      <div className="tag-list">
        {components}
      </div>
    );
  }
}

export default TagList;
