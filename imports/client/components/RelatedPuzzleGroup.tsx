import { faCaretDown } from '@fortawesome/free-solid-svg-icons/faCaretDown';
import { faCaretRight } from '@fortawesome/free-solid-svg-icons/faCaretRight';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { TagType } from '../../lib/schemas/tag';
import RelatedPuzzleList from './RelatedPuzzleList';
import Tag from './Tag';
import { PuzzleGroup } from './puzzle-sort-and-group';

const PuzzleGroupDiv = styled.div`
  &:not(:last-child) {
    margin-bottom: 16px;
  }
`;

const PuzzleGroupHeader = styled.div`
  display: block;
  &:hover {
    cursor: pointer;
  }
  min-height: 32px;
`;

const PuzzleListWrapper = styled.div`
  padding-left: 1.25em;
`;

const NoSharedTagLabel = styled.div`
  display: inline-flex;
  align-items: center;
  line-height: 24px;
  margin: 2px 4px 2px 0;
  padding: 0 6px;
  border-radius: 4px;
  background-color: transparent;
  color: #808080;
`;

const RelatedPuzzleGroup = ({
  group, noSharedTagLabel = '(no tag)', allTags, includeCount, canUpdate, suppressedTagIds,
}: {
  group: PuzzleGroup;
  // noSharedTagLabel is used to label the group only if sharedTag is undefined.
  noSharedTagLabel?: String;
  allTags: TagType[];
  includeCount?: boolean;
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
    <PuzzleGroupDiv>
      <PuzzleGroupHeader onClick={toggleCollapse}>
        <FontAwesomeIcon fixedWidth icon={collapsed ? faCaretRight : faCaretDown} />
        {sharedTag ? (
          <Tag tag={sharedTag} linkToSearch={false} popoverRelated={false} />
        ) : (
          <NoSharedTagLabel>{noSharedTagLabel}</NoSharedTagLabel>
        )}
        {includeCount && <span>{countString}</span>}
      </PuzzleGroupHeader>
      {collapsed ? null : (
        <PuzzleListWrapper>
          <RelatedPuzzleList
            relatedPuzzles={relatedPuzzles}
            allTags={allTags}
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
                canUpdate={canUpdate}
                suppressedTagIds={subgroupSuppressedTagIds}
              />
            );
          })}
        </PuzzleListWrapper>
      )}
    </PuzzleGroupDiv>
  );
};

export default RelatedPuzzleGroup;
