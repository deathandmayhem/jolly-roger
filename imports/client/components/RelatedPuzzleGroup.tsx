import { faCaretDown } from '@fortawesome/free-solid-svg-icons/faCaretDown';
import { faCaretRight } from '@fortawesome/free-solid-svg-icons/faCaretRight';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useCallback, useState } from 'react';
import { TagType } from '../../lib/schemas/tag';
import RelatedPuzzleList from './RelatedPuzzleList';
import Tag from './Tag';
import { PuzzleGroup } from './puzzle-sort-and-group';

interface RelatedPuzzleGroupProps {
  group: PuzzleGroup;
  // noSharedTagLabel is used to label the group only if sharedTag is undefined.
  noSharedTagLabel?: String;
  allTags: TagType[];
  includeCount?: boolean;
  layout: 'grid' | 'table';
  canUpdate: boolean;
  suppressedTagIds: string[];
}

const RelatedPuzzleGroup = (props: RelatedPuzzleGroupProps) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const toggleCollapse = useCallback(() => {
    setCollapsed((prevCollapsed) => {
      return !prevCollapsed;
    });
  }, []);

  const relatedPuzzles = props.group.puzzles;
  const sharedTag = props.group.sharedTag;
  const puzzlePlural = relatedPuzzles.length === 1 ? 'puzzle' : 'puzzles';
  const countString = `(${relatedPuzzles.length} other ${puzzlePlural})`;
  const suppressedTagIds = [...props.suppressedTagIds];
  const noSharedTagLabel = props.noSharedTagLabel || '(no tag)';
  if (sharedTag) {
    suppressedTagIds.push(sharedTag._id);
  }
  return (
    <div className="puzzle-group">
      <div className="puzzle-group-header" onClick={toggleCollapse}>
        <FontAwesomeIcon fixedWidth icon={collapsed ? faCaretRight : faCaretDown} />
        {sharedTag ? (
          <Tag tag={sharedTag} linkToSearch={false} popoverRelated={false} />
        ) : (
          <div className="tag tag-none">{noSharedTagLabel}</div>
        )}
        {props.includeCount && <span>{countString}</span>}
      </div>
      {collapsed ? null : (
        <div className="puzzle-list-wrapper">
          <RelatedPuzzleList
            relatedPuzzles={relatedPuzzles}
            allTags={props.allTags}
            layout={props.layout}
            canUpdate={props.canUpdate}
            sharedTag={sharedTag}
            suppressedTagIds={suppressedTagIds}
          />
          {props.group.subgroups.map((subgroup) => {
            const subgroupSuppressedTagIds = [...suppressedTagIds];
            if (subgroup.sharedTag) {
              subgroupSuppressedTagIds.push(subgroup.sharedTag._id);
            }
            return (
              <RelatedPuzzleGroup
                key={subgroup.sharedTag ? subgroup.sharedTag._id : 'ungrouped'}
                group={subgroup}
                noSharedTagLabel={props.noSharedTagLabel}
                allTags={props.allTags}
                includeCount={props.includeCount}
                layout={props.layout}
                canUpdate={props.canUpdate}
                suppressedTagIds={subgroupSuppressedTagIds}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RelatedPuzzleGroup;
