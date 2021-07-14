import { useTracker } from 'meteor/react-meteor-data';
import React, { useCallback } from 'react';
import Creatable from 'react-select/creatable';
import Tags from '../../lib/models/tags';
import { PuzzleType } from '../../lib/schemas/puzzles';
import { TagType } from '../../lib/schemas/tags';

interface TagEditorProps {
  puzzle: PuzzleType;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

interface TagEditorTracker {
  allTags: TagType[];
}

const TagEditor = (props: TagEditorProps) => {
  const tracker = useTracker<TagEditorTracker>(() => {
    return {
      allTags: Tags.find({ hunt: props.puzzle.hunt }).fetch(),
    };
  }, [props.puzzle.hunt]);

  const onBlur = useCallback(() => {
    // Treat blur as "no I didn't mean to do that".  We may have to change this
    // once we have autocomplete .
    props.onCancel();
  }, [props.onCancel]);

  const options = tracker.allTags
    .map((t) => t.name)
    .filter(Boolean)
    .map((t) => {
      return { value: t, label: t };
    });

  return (
    <span className="tag-editor">
      <Creatable
        options={options}
        autoFocus
        openMenuOnFocus
        onChange={(v) => props.onSubmit((v as {value: string}).value)}
        onBlur={onBlur}
      />
    </span>
  );
};

export default TagEditor;
