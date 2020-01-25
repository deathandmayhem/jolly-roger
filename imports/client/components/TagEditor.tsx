import { withTracker } from 'meteor/react-meteor-data';
import React from 'react';
import Creatable from 'react-select/lib/Creatable';
import Tags from '../../lib/models/tags';
import { PuzzleType } from '../../lib/schemas/puzzles';
import { TagType } from '../../lib/schemas/tags';

interface TagEditorParams {
  puzzle: PuzzleType;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

interface TagEditorProps extends TagEditorParams {
  allTags: TagType[];
}

class TagEditor extends React.Component<TagEditorProps> {
  onBlur = () => {
    // Treat blur as "no I didn't mean to do that".  We may have to change this
    // once we have autocomplete .
    this.props.onCancel();
  };

  render() {
    const options = this.props.allTags
      .map((t) => t.name)
      .filter(Boolean)
      .map((t) => {
        return { value: t, label: t };
      });

    return (
      <span style={{ display: 'inline-block', minWidth: '200px' }}>
        <Creatable
          options={options}
          autoFocus
          openMenuOnFocus
          onChange={(v) => this.props.onSubmit((v as {value: string}).value)}
          onBlur={this.onBlur}
        />
      </span>
    );
  }
}

const TagEditorContainer = withTracker(({ puzzle }: TagEditorParams) => {
  return { allTags: Tags.find({ hunt: puzzle.hunt }).fetch() };
})(TagEditor);

export default TagEditorContainer;
