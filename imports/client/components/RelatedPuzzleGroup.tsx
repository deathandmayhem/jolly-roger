import { _ } from 'meteor/underscore';
import { faCaretDown, faCaretRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import { TagType } from '../../lib/schemas/tags';
import RelatedPuzzleList from './RelatedPuzzleList';
import Tag from './Tag';
import { PuzzleGroup } from './puzzle-sort-and-group';

interface RelatedPuzzleGroupProps {
  group: PuzzleGroup;
  // noSharedTagLabel is used to label the group only if sharedTag is undefined.
  noSharedTagLabel: String;
  allTags: TagType[];
  includeCount?: boolean;
  layout: 'grid' | 'table';
  canUpdate: boolean;
  suppressedTagIds: string[];
}

interface RelatedPuzzleGroupState {
  collapsed: boolean;
}

class RelatedPuzzleGroup extends React.Component<RelatedPuzzleGroupProps, RelatedPuzzleGroupState> {
  static displayName = 'RelatedPuzzleGroup';

  static defaultProps: Partial<RelatedPuzzleGroupProps> = {
    noSharedTagLabel: '(no tag)',
  };

  constructor(props: RelatedPuzzleGroupProps) {
    super(props);
    this.state = {
      collapsed: false,
    };
  }

  toggleCollapse = () => {
    this.setState((prevState) => ({
      collapsed: !prevState.collapsed,
    }));
  };

  render() {
    const relatedPuzzles = this.props.group.puzzles;
    const sharedTag = this.props.group.sharedTag;
    const puzzlePlural = relatedPuzzles.length === 1 ? 'puzzle' : 'puzzles';
    const countString = `(${relatedPuzzles.length} other ${puzzlePlural})`;
    const suppressedTagIds = [...this.props.suppressedTagIds];
    if (sharedTag) {
      suppressedTagIds.push(sharedTag._id);
    }
    return (
      <div className="puzzle-group">
        <div className="puzzle-group-header" onClick={this.toggleCollapse}>
          <FontAwesomeIcon fixedWidth icon={this.state.collapsed ? faCaretRight : faCaretDown} />
          {sharedTag ? (
            <Tag tag={sharedTag} linkToSearch={false} popoverRelated={false} />
          ) : (
            <div className="tag tag-none">{this.props.noSharedTagLabel}</div>
          )}
          {this.props.includeCount && <span>{countString}</span>}
        </div>
        {this.state.collapsed ? null : (
          <div className="puzzle-list-wrapper">
            <RelatedPuzzleList
              relatedPuzzles={relatedPuzzles}
              allTags={this.props.allTags}
              layout={this.props.layout}
              canUpdate={this.props.canUpdate}
              sharedTag={sharedTag}
              suppressedTagIds={suppressedTagIds}
            />
            {this.props.group.subgroups.map((subgroup) => {
              const subgroupSuppressedTagIds = [...suppressedTagIds];
              if (subgroup.sharedTag) {
                subgroupSuppressedTagIds.push(subgroup.sharedTag._id);
              }
              return (
                <RelatedPuzzleGroup
                  key={subgroup.sharedTag ? subgroup.sharedTag._id : 'ungrouped'}
                  group={subgroup}
                  noSharedTagLabel={this.props.noSharedTagLabel}
                  allTags={this.props.allTags}
                  includeCount={this.props.includeCount}
                  layout={this.props.layout}
                  canUpdate={this.props.canUpdate}
                  suppressedTagIds={subgroupSuppressedTagIds}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }
}

export default RelatedPuzzleGroup;
