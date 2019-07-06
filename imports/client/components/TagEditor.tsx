import { _ } from 'meteor/underscore';
import * as React from 'react';
import * as PropTypes from 'prop-types';
import { withTracker } from 'meteor/react-meteor-data';
import Creatable from 'react-select/lib/Creatable';
import TagSchema, { TagType } from '../../lib/schemas/tags';
import Puzzles from '../../lib/models/puzzles';
import Tags from '../../lib/models/tags';

interface TagEditorContainerProps {
  puzzleId: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

type TagEditorProps = {
  allTags: TagType[];
} & TagEditorContainerProps

class TagEditor extends React.Component<TagEditorProps> {
  static propTypes = {
    puzzleId: PropTypes.string.isRequired,
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

const TagEditorContainer = withTracker(({ puzzleId }: TagEditorContainerProps) => {
  const puzzle = Puzzles.findOne(puzzleId);
  return { allTags: Tags.find({ hunt: puzzle.hunt }).fetch() };
})(TagEditor);

TagEditorContainer.propTypes = {
  puzzleId: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default TagEditorContainer;
