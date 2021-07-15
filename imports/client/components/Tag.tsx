import { _ } from 'meteor/underscore';
import { faCopy } from '@fortawesome/free-solid-svg-icons/faCopy';
import { faTimes } from '@fortawesome/free-solid-svg-icons/faTimes';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { detectOverflow } from '@popperjs/core';
import type { ModifierArguments, Modifier, Padding } from '@popperjs/core';
import classnames from 'classnames';
import React, { useCallback, useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import { Link } from 'react-router-dom';
import { PuzzleType } from '../../lib/schemas/puzzles';
import { TagType } from '../../lib/schemas/tags';
import { RelatedPuzzleList, sortPuzzlesByRelevanceWithinPuzzleGroup } from './RelatedPuzzleList';

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

const Tag = (props: TagProps) => {
  const [showPopover, setShowPopover] = useState<boolean>(false);

  const onOverlayTriggerToggle = useCallback((nextShow: boolean) => {
    setShowPopover(nextShow);
  }, []);

  const doShowPopover = useCallback(() => {
    setShowPopover(true);
  }, []);

  const doHidePopover = useCallback(() => {
    setShowPopover(false);
  }, []);

  useEffect(() => {
    // Necessary to ensure the popover closes when entering the iframe on
    // devices that don't support hover
    window.addEventListener('blur', doHidePopover);
    return () => {
      window.removeEventListener('blur', doHidePopover);
    };
  }, []);

  const onRemove = useCallback(() => {
    if (props.onRemove) {
      props.onRemove(props.tag._id);
    }
  }, [props.onRemove, props.tag._id]);

  const getRelatedPuzzles = useCallback(() => {
    if (!props.popoverRelated) {
      return [];
    }
    const sharedTagName = getRelatedPuzzlesSharedTagName(props.tag.name);
    const sharedTag = props.allTags.find((t) => t.name === sharedTagName);
    return sharedTag ?
      props.allPuzzles.filter((p) => p.tags.indexOf(sharedTag._id) !== -1) :
      [];
  }, [
    props.popoverRelated,
    props.tag.name,
    (props.popoverRelated ? props.allTags : undefined),
    (props.popoverRelated ? props.allPuzzles : undefined),
  ]);

  const copyRelatedPuzzlesToClipboard = useCallback(() => {
    if (!props.popoverRelated) {
      return;
    }
    const tagIndex = _.indexBy(props.allTags, '_id');
    const sharedTagName = getRelatedPuzzlesSharedTagName(props.tag.name);
    const sharedTag = props.allTags.find((t) => t.name === sharedTagName);
    const relatedPuzzles = sortPuzzlesByRelevanceWithinPuzzleGroup(
      getRelatedPuzzles(),
      sharedTag,
      tagIndex
    );
    const clipboardData = relatedPuzzles.map((puzzle) => {
      const minRowCnt = puzzle.expectedAnswerCount >= 1 ? puzzle.expectedAnswerCount : 1;
      const missingCnt = minRowCnt > puzzle.answers.length ? minRowCnt - puzzle.answers.length : 0;
      const answers = puzzle.answers.concat(Array(missingCnt).fill(''));
      return answers.map((answer) => {
        return `${puzzle.title}\t${answer.toUpperCase()}`;
      }).join('\n');
    }).join('\n');
    navigator.clipboard.writeText(clipboardData);
  }, [
    props.popoverRelated,
    props.tag.name,
    (props.popoverRelated ? props.allTags : undefined),
    getRelatedPuzzles,
  ]);

  const name = props.tag.name;
  const isAdministrivia = name === 'administrivia';
  const isMeta = name === 'is:meta' || name === 'is:metameta';
  const isGroup = name.lastIndexOf('group:', 0) === 0;
  const isMetaFor = name.lastIndexOf('meta-for:', 0) === 0;
  const isNeeds = name.lastIndexOf('needs:', 0) === 0;
  const isPriority = name.lastIndexOf('priority:', 0) === 0;
  const classNames = classnames('tag',
    props.popoverRelated ? 'tag-popover' : null,
    showPopover ? 'tag-popover-open' : null,
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
  if (props.linkToSearch) {
    title = (
      <Link
        to={{
          pathname: `/hunts/${props.tag.hunt}/puzzles`,
          search: `q=${props.tag.name}`,
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
      {props.onRemove && (
        <Button className="tag-remove-button" variant="danger" onClick={onRemove}>
          <FontAwesomeIcon icon={faTimes} />
        </Button>
      )}
    </div>
  );

  if (props.popoverRelated) {
    const sharedTagName = getRelatedPuzzlesSharedTagName(props.tag.name);
    const relatedPuzzles = getRelatedPuzzles();
    const popover = (
      <Popover
        id={`tag-${props.tag._id}`}
        className="related-puzzle-popover"
        onMouseEnter={doShowPopover}
        onMouseLeave={doHidePopover}
      >
        <Popover.Title>
          <div className="related-puzzle-popover-header-inner">
            {sharedTagName}
            <div className="related-puzzle-popover-controls">
              <Button
                className="tag-copy-button"
                variant="secondary"
                size="sm"
                onClick={copyRelatedPuzzlesToClipboard}
              >
                <FontAwesomeIcon icon={faCopy} />
                {'    '}
                Copy
              </Button>
            </div>
          </div>
        </Popover.Title>
        <Popover.Content>
          <RelatedPuzzleList
            relatedPuzzles={relatedPuzzles}
            allTags={props.allTags}
            layout="table"
            canUpdate={false}
            sharedTag={props.tag}
            suppressedTagIds={[]}
          />
        </Popover.Content>
      </Popover>
    );
    return (
      <OverlayTrigger
        placement="bottom"
        overlay={popover}
        trigger={['hover', 'click']}
        onToggle={onOverlayTriggerToggle}
        show={showPopover}
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
};

export default Tag;
