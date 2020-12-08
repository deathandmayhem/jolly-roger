import classnames from 'classnames';
import React from 'react';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import { Link } from 'react-router-dom';
import { PuzzleType } from '../../lib/schemas/puzzles';
import { TagType } from '../../lib/schemas/tags';
import RelatedPuzzleList from './RelatedPuzzleList';

// Calculate the tag name to use when determining related puzzles
// There may be more cases here in the future
function getRelatedPuzzlesSharedTagName(name: string) {
  if (name.lastIndexOf('meta-for:', 0) === 0) {
    return `group:${name.slice('meta-for:'.length)}`;
  }
  return name;
}

interface BaseTagProps {
  tag: TagType;
  // if present, show a dismiss button
  onRemove?: (tagId: string) => void;
  linkToSearch: boolean;
}

interface DoNotPopoverRelatedProps {
  popoverRelated: false;
}

interface PopoverRelatedProps {
  popoverRelated: true;
  allPuzzles: PuzzleType[];
  allTags: TagType[];
}

type TagProps = BaseTagProps & (DoNotPopoverRelatedProps | PopoverRelatedProps);

class Tag extends React.PureComponent<TagProps> {
  static displayName = 'Tag';

  onRemove = () => {
    if (this.props.onRemove) {
      this.props.onRemove(this.props.tag._id);
    }
  };

  render() {
    const name = this.props.tag.name;
    const isAdministrivia = name === 'administrivia';
    const isMeta = name === 'is:meta' || name === 'is:metameta';
    const isGroup = name.lastIndexOf('group:', 0) === 0;
    const isMetaFor = name.lastIndexOf('meta-for:', 0) === 0;
    const isNeeds = name.lastIndexOf('needs:', 0) === 0;
    const isPriority = name.lastIndexOf('priority:', 0) === 0;
    const classNames = classnames('tag',
      this.props.popoverRelated ? 'tag-popover' : null,
      isAdministrivia ? 'tag-administrivia' : null,
      isMeta ? 'tag-meta' : null,
      isGroup ? 'tag-group' : null,
      isMetaFor ? 'tag-meta-for' : null,
      isNeeds ? 'tag-needs' : null,
      isPriority ? 'tag-priority' : null);

    let title;
    if (this.props.linkToSearch) {
      title = (
        <Link
          to={{
            pathname: `/hunts/${this.props.tag.hunt}/puzzles`,
            search: `q=${this.props.tag.name}`,
          }}
          className="tag-link"
        >
          {name}
        </Link>
      );
    } else {
      title = name;
    }

    const tagElement = (
      <div className={classNames}>
        {title}
        {this.props.onRemove && (
          <Button className="tag-remove-button" variant="danger" onClick={this.onRemove}>
            &#10006;
          </Button>
        )}
      </div>
    );

    if (this.props.popoverRelated) {
      const sharedTagName = getRelatedPuzzlesSharedTagName(this.props.tag.name);
      const sharedTag = this.props.allTags.find((t) => t.name === sharedTagName);
      const relatedPuzzles = sharedTag ?
        this.props.allPuzzles.filter((p) => p.tags.indexOf(sharedTag._id) !== -1) :
        [];
      const popover = (
        <Popover id={`tag-${this.props.tag._id}`} className="related-puzzle-popover">
          <Popover.Title>{sharedTagName}</Popover.Title>
          <Popover.Content>
            <RelatedPuzzleList
              relatedPuzzles={relatedPuzzles}
              allTags={this.props.allTags}
              layout="table"
              canUpdate={false}
              sharedTag={this.props.tag}
              suppressSharedTag={false}
            />
          </Popover.Content>
        </Popover>
      );
      return (
        <OverlayTrigger placement="bottom" overlay={popover}>
          {tagElement}
        </OverlayTrigger>
      );
    } else {
      return tagElement;
    }
  }
}

export default Tag;
