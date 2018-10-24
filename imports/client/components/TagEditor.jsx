import { _ } from 'meteor/underscore';
import React from 'react';
import PropTypes from 'prop-types';
import { withTracker } from 'meteor/react-meteor-data';
import Creatable from 'react-select/lib/Creatable';
import TagsSchema from '../../lib/schemas/tags.js';
import Puzzles from '../../lib/models/puzzles.js';
import Tags from '../../lib/models/tags.js';

class TagEditor extends React.Component {
  static propTypes = {
    puzzleId: PropTypes.string.isRequired,
    onSubmit: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    allTags: PropTypes.arrayOf(PropTypes.shape(TagsSchema.asReactPropTypes())).isRequired,
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
          onChange={value => this.props.onSubmit(value.value)}
          onBlur={this.onBlur}
        />
      </span>
    );
  }
}

const TagEditorContainer = withTracker(({ puzzleId }) => {
  const puzzle = Puzzles.findOne(puzzleId);
  return { allTags: Tags.find({ hunt: puzzle.hunt }).fetch() };
})(TagEditor);

TagEditorContainer.propTypes = {
  puzzleId: PropTypes.string,
};

export default TagEditorContainer;
