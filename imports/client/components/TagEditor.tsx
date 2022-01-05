import { useTracker } from 'meteor/react-meteor-data';
import React, { Suspense, useCallback } from 'react';
import Tags from '../../lib/models/tags';
import { PuzzleType } from '../../lib/schemas/puzzle';
import { TagType } from '../../lib/schemas/tag';
import Loading from './Loading';

// Casting away the React.lazy because otherwise we lose access to the generic parameter
const Creatable = React.lazy(() => import('react-select/creatable')) as typeof import('react-select/creatable').default;

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

  const { onCancel } = props;
  const onBlur = useCallback(() => {
    // Treat blur as "no I didn't mean to do that".  We may have to change this
    // once we have autocomplete .
    onCancel();
  }, [onCancel]);

  const options = tracker.allTags
    .map((t) => t.name)
    .filter(Boolean)
    .map((t) => {
      return { value: t, label: t };
    });

  return (
    <Suspense fallback={<Loading inline />}>
      <span className="tag-editor">
        <Creatable
          options={options}
          autoFocus
          openMenuOnFocus
          onChange={(v) => v && props.onSubmit(v.value)}
          onBlur={onBlur}
        />
      </span>
    </Suspense>
  );
};

export default TagEditor;
