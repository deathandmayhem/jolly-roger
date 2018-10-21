import { _ } from 'meteor/underscore';
import React from 'react';
import PropTypes from 'prop-types';
import Button from 'react-bootstrap/lib/Button';
import ButtonGroup from 'react-bootstrap/lib/ButtonGroup';
import tagShape from './tagShape.js';
import Tag from './Tag.jsx';
import TagEditor from './TagEditor.jsx';

class TagList extends React.PureComponent {
  static displayName = 'TagList';

  static propTypes = {
    puzzleId: PropTypes.string.isRequired,
    tags: PropTypes.arrayOf(PropTypes.shape(tagShape)).isRequired,
    onCreateTag: PropTypes.func, // if provided, will show UI for adding a new tag
    onRemoveTag: PropTypes.func, // callback if user wants to remove a tag
    linkToSearch: PropTypes.bool.isRequired,
    showControls: PropTypes.bool,
  };

  static defaultProps = { showControls: true };

  state = {
    expanded: false,
    editing: false,
    removing: false,
  };

  submitTag = (newTagName) => {
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

  removeTag = (tagIdToRemove) => {
    if (this.props.onRemoveTag) {
      this.props.onRemoveTag(tagIdToRemove);
    }
  };

  soloTagInterestingness = (tag) => {
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

  sortedTagsForSinglePuzzle = (tags) => {
    // The sort order for tags should probably be:
    // * "is:metameta" first
    // * then "is:meta"
    // * "meta:*" comes next (sorted alphabetically, if multiple are present)
    // * all other tags, sorted alphabetically
    const sortedTags = _.toArray(tags);

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
        />
      );
    }

    if (this.state.editing) {
      components.push(
        <TagEditor
          key="tagEditor"
          puzzleId={this.props.puzzleId}
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
              title="Add tag..."
              key="startEditing"
              className="tag-modify-button"
              onClick={this.startEditing}
            >
              &#10133;
            </Button>
          )}
          {this.props.onRemoveTag && tags.length > 0 && (
            <Button
              title="Remove tag..."
              key="startRemoving"
              className="tag-modify-button"
              onClick={this.startRemoving}
            >
              &#10134;
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
