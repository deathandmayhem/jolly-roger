import { _ } from 'meteor/underscore';
import { faCaretDown, faCaretRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import { PuzzleType } from '../../lib/schemas/puzzles';
import { TagType } from '../../lib/schemas/tags';
import RelatedPuzzleList from './RelatedPuzzleList';
import Tag from './Tag';

interface RelatedPuzzleGroupProps {
  sharedTag: TagType | undefined;
  // noSharedTagLabel is used to label the group only if sharedTag is undefined.
  noSharedTagLabel: String;
  relatedPuzzles: PuzzleType[];
  allTags: TagType[];
  includeCount?: boolean;
  layout: 'grid' | 'table';
  canUpdate: boolean;
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
    const puzzlePlural = this.props.relatedPuzzles.length === 1 ? 'puzzle' : 'puzzles';
    const countString = `(${this.props.relatedPuzzles.length} other ${puzzlePlural})`;
    return (
      <div className="puzzle-group">
        <div className="puzzle-group-header" onClick={this.toggleCollapse}>
          <FontAwesomeIcon fixedWidth icon={this.state.collapsed ? faCaretRight : faCaretDown} />
          {this.props.sharedTag ? (
            <Tag tag={this.props.sharedTag} linkToSearch={false} popoverRelated={false} />
          ) : (
            <div className="tag tag-none">{this.props.noSharedTagLabel}</div>
          )}
          {this.props.includeCount && <span>{countString}</span>}
        </div>
        {this.state.collapsed ? null : (
          <div className="puzzle-list-wrapper">
            <RelatedPuzzleList
              relatedPuzzles={this.props.relatedPuzzles}
              allTags={this.props.allTags}
              layout={this.props.layout}
              canUpdate={this.props.canUpdate}
              sharedTag={this.props.sharedTag}
              suppressSharedTag
            />
          </div>
        )}
      </div>
    );
  }
}

export default RelatedPuzzleGroup;
