import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { detectOverflow } from '@popperjs/core';
import type { ModifierArguments, Modifier, Padding } from '@popperjs/core';
import classnames from 'classnames';
import React from 'react';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import { Link } from 'react-router-dom';
import { PuzzleType } from '../../lib/schemas/puzzles';
import { TagType } from '../../lib/schemas/tags';
import RelatedPuzzleList from './RelatedPuzzleList';

const PopoverPadding = {
  top: 10,
  bottom: 10,
  left: 5,
  right: 5,
};

// Calculate the tag name to use when determining related puzzles
// There may be more cases here in the future
function getRelatedPuzzlesSharedTagName(name: string) {
  if (name.lastIndexOf('meta-for:', 0) === 0) {
    return `group:${name.slice('meta-for:'.length)}`;
  }
  return name;
}

type PopperScreenFitOptions = {padding: Padding}

const PopperScreenFit : Modifier<'screenFit', PopperScreenFitOptions> = {
  name: 'screenFit',
  enabled: true,
  phase: 'beforeWrite',
  requiresIfExists: ['offset', 'preventOverflow'],
  fn({ state, options } : ModifierArguments<PopperScreenFitOptions>) {
    // Default to using preventOverflow's options to enforce consistent padding
    const preventOverflowMod = state.orderedModifiers.find((m) => m.name === 'preventOverflow');
    const padding = options.padding || preventOverflowMod?.options?.padding || {};
    const overflow = detectOverflow(state, { padding });
    const { height, width } = state.rects.popper;
    const placementEdge = state.placement.split('-')[0];
    // detectOverflow isn't aware of preventOverflow's shift, so overflow can appear on either side
    // Have to work in terms of max because narrowing width might result in increasing height
    let maxWidth;
    let maxHeight;
    if (placementEdge === 'top' || placementEdge === 'bottom') {
      maxWidth = width - overflow.right - overflow.left;
      maxHeight = height - overflow[placementEdge];
    } else if (placementEdge === 'left' || placementEdge === 'right') {
      maxHeight = height - overflow.top - overflow.bottom;
      maxWidth = width - overflow[placementEdge];
    } else {
      return;
    }
    state.styles.popper.maxHeight = `${maxHeight}px`; // eslint-disable-line no-param-reassign
    state.styles.popper.maxWidth = `${maxWidth}px`; // eslint-disable-line no-param-reassign
  },
};

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

interface TagState {
  showPopover: boolean;
}

class Tag extends React.Component<TagProps, TagState> {
  static displayName = 'Tag';

  constructor(props: TagProps) {
    super(props);
    this.state = {
      showPopover: false,
    };
  }

  componentDidMount() {
    window.addEventListener('blur', this.onWindowBlur);
  }

  componentWillUnmount() {
    window.removeEventListener('blur', this.onWindowBlur);
  }

  // Necessary to ensure popover close when entering the iframe on devices that don't support hover
  onWindowBlur = () => {
    this.setState({ showPopover: false });
  };

  onRemove = () => {
    if (this.props.onRemove) {
      this.props.onRemove(this.props.tag._id);
    }
  };

  onOverlayTriggerToggle = (nextShow: boolean) => {
    this.setState({ showPopover: nextShow });
  }

  onPopoverMouseEnter = () => {
    this.setState({ showPopover: true });
  }

  onPopoverMouseLeave = () => {
    this.setState({ showPopover: false });
  }

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
      this.state.showPopover ? 'tag-popover-open' : null,
      isAdministrivia ? 'tag-administrivia' : null,
      isMeta ? 'tag-meta' : null,
      isGroup ? 'tag-group' : null,
      isMetaFor ? 'tag-meta-for' : null,
      isNeeds ? 'tag-needs' : null,
      isPriority ? 'tag-priority' : null);

    // Browsers won't word-break on hyphens, so suggest
    // Use wbr instead of zero-width space to make copy-paste reasonable
    const nameWithBreaks:(String|JSX.Element)[] = [];
    name.split(':').forEach((part, i, arr) => {
      const withColon = i < arr.length - 1;
      nameWithBreaks.push(`${part}${withColon ? ':' : ''}`);
      if (withColon) {
        // eslint-disable-next-line react/no-array-index-key
        nameWithBreaks.push(<wbr key={`wbr-${i}-${part}`} />);
      }
    });
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
          {nameWithBreaks}
        </Link>
      );
    } else {
      title = nameWithBreaks;
    }

    const tagElement = (
      <div className={classNames}>
        {title}
        {this.props.onRemove && (
          <Button className="tag-remove-button" variant="danger" onClick={this.onRemove}>
            <FontAwesomeIcon icon={faTimes} />
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
        <Popover
          id={`tag-${this.props.tag._id}`}
          className="related-puzzle-popover"
          onMouseEnter={this.onPopoverMouseEnter}
          onMouseLeave={this.onPopoverMouseLeave}
        >
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
        <OverlayTrigger
          placement="bottom"
          overlay={popover}
          trigger={['hover', 'click']}
          onToggle={this.onOverlayTriggerToggle}
          show={this.state.showPopover}
          popperConfig={
            {
              modifiers: [
                { name: 'preventOverflow', options: { padding: PopoverPadding } },
                PopperScreenFit,
              ],
            }
          }
        >
          {tagElement}
        </OverlayTrigger>
      );
    } else {
      return tagElement;
    }
  }
}

export default Tag;
