import { _ } from 'meteor/underscore';
import React from 'react';
import PropTypes from 'prop-types';
import { withTracker } from 'meteor/react-meteor-data';
import Creatable from 'react-select/lib/Creatable';
import TagSchema, { TagType } from '../../lib/schemas/tags';
import Tags from '../../lib/models/tags';
import { PuzzleType } from '../../lib/schemas/puzzles';
import puzzleShape from './puzzleShape';

interface TagEditorContainerProps {
  puzzle: PuzzleType;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

interface TagEditorProps extends TagEditorContainerProps {
  allTags: TagType[];
}

class TagEditor extends React.Component<TagEditorProps> {
  static propTypes = {
    puzzle: PropTypes.shape(puzzleShape).isRequired as React.Validator<PuzzleType>,
    onSubmit: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    allTags: PropTypes.arrayOf(
      PropTypes.shape(
        TagSchema.asReactPropTypes()
      ).isRequired as React.Validator<TagType>
    ).isRequired,
  };

  onBlur = () => {
    // Treat blur as "no I didn't mean to do that".  We may have to change this
    // once we have autocomplete .
    this.props.onCancel();
  };

  render() {
    const options = _.chain(this.props.allTags)
      .map(t => t.name)
      .compact()
      .map((t) => {
        return { value: t, label: t };
      })
      .value();

    return (
      <span style={{ display: 'inline-block', minWidth: '200px' }}>
        <Creatable
          options={options}
          autoFocus
          openMenuOnFocus
          onChange={v => this.props.onSubmit((v as {value: string}).value)}
          onBlur={this.onBlur}
        />
      </span>
    );
  }
}

const TagEditorContainer = withTracker(({ puzzle }: TagEditorContainerProps) => {
  return { allTags: Tags.find({ hunt: puzzle.hunt }).fetch() };
})(TagEditor);

TagEditorContainer.propTypes = {
  puzzle: PropTypes.shape(puzzleShape).isRequired as React.Validator<PuzzleType>,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default TagEditorContainer;
