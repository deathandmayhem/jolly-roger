import React, {
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { PuzzleType } from "../../lib/models/Puzzles";
import type { TagType } from "../../lib/models/Tags";
import Loading from "./Loading";
import type { ModalFormHandle } from "./ModalForm";
import ModalForm from "./ModalForm";
import type { PuzzleModalFormSubmitPayload } from "./PuzzleFormHelpers";
import { usePuzzleForm } from "./PuzzleFormHelpers";

export type { PuzzleModalFormSubmitPayload };

export type PuzzleModalFormHandle = {
  reset: () => void;
  show: () => void;
};

export interface PuzzleModalFormProps {
  huntId: string;
  puzzle?: PuzzleType;
  // All known tags for this hunt
  tags: TagType[];
  onSubmit: (
    payload: PuzzleModalFormSubmitPayload,
    callback: (error?: Error) => void,
  ) => void;
  showOnMount?: boolean;
  ref?: React.Ref<PuzzleModalFormHandle>;
}

const PuzzleModalForm = ({
  huntId,
  puzzle,
  tags,
  onSubmit,
  showOnMount,
  ref,
}: PuzzleModalFormProps) => {
  const formRef = useRef<ModalFormHandle>(null);
  const { title, fields, submit, reset, disabled } = usePuzzleForm({
    huntId,
    tags,
    onSubmit,
    puzzle,
  });

  const show = useCallback(() => {
    formRef.current?.show();
  }, []);

  useImperativeHandle(ref, () => ({
    show,
    reset,
  }));

  useEffect(() => {
    if (showOnMount) {
      show();
    }
  }, [showOnMount, show]);

  return (
    <Suspense
      fallback={
        <div>
          <Loading />
        </div>
      }
    >
      <ModalForm
        ref={formRef}
        title={title}
        onSubmit={submit}
        submitDisabled={disabled}
      >
        {fields}
      </ModalForm>
    </Suspense>
  );
};

export default PuzzleModalForm;
