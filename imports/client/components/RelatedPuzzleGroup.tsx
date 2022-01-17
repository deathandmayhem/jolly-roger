import { faCaretDown } from '@fortawesome/free-solid-svg-icons/faCaretDown';
import { faCaretRight } from '@fortawesome/free-solid-svg-icons/faCaretRight';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useCallback, useState } from 'react';
import { TagType } from '../../lib/schemas/tag';
import RelatedPuzzleList from './RelatedPuzzleList';
import Tag from './Tag';
import { PuzzleGroup } from './puzzle-sort-and-group';

const RelatedPuzzleGroup = ({
  group, noSharedTagLabel = '(no tag)', allTags, includeCount, layout, canUpdate, suppressedTagIds,
}: {
  group: PuzzleGroup;
  // noSharedTagLabel is used to label the group only if sharedTag is undefined.
  noSharedTagLabel?: String;
  allTags: TagType[];
  includeCount?: boolean;
  layout: 'grid' | 'table';
  canUpdate: boolean;
  suppressedTagIds: string[];
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const toggleCollapse = useCallback(() => {
    setCollapsed((prevCollapsed) => {
      return !prevCollapsed;
    });
  }, []);

  const { puzzles: relatedPuzzles, sharedTag } = group;

  const puzzlePlural = relatedPuzzles.length === 1 ? 'puzzle' : 'puzzles';
  const countString = `(${relatedPuzzles.length} other ${puzzlePlural})`;
  const allSuppressedTagIds = [...suppressedTagIds];
  if (sharedTag) {
    allSuppressedTagIds.push(sharedTag._id);
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
        {includeCount && <span>{countString}</span>}
      </div>
      {collapsed ? null : (
        <div className="puzzle-list-wrapper">
          <RelatedPuzzleList
            relatedPuzzles={relatedPuzzles}
            allTags={allTags}
            layout={layout}
            canUpdate={canUpdate}
            sharedTag={sharedTag}
            suppressedTagIds={allSuppressedTagIds}
          />
          {group.subgroups.map((subgroup) => {
            const subgroupSuppressedTagIds = [...allSuppressedTagIds];
            if (subgroup.sharedTag) {
              subgroupSuppressedTagIds.push(subgroup.sharedTag._id);
            }
            return (
              <RelatedPuzzleGroup
                key={subgroup.sharedTag ? subgroup.sharedTag._id : 'ungrouped'}
                group={subgroup}
                noSharedTagLabel={noSharedTagLabel}
                allTags={allTags}
                includeCount={includeCount}
                layout={layout}
                canUpdate={canUpdate}
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
