import { useSubscribe, useTracker } from "meteor/react-meteor-data";

import React, {
  Suspense,
  useCallback,
  useId,
  useImperativeHandle,
  useState,
} from "react";
import Button from "react-bootstrap/Button";
import FormCheck from "react-bootstrap/FormCheck";
import Modal from "react-bootstrap/Modal";
import { createPortal } from "react-dom";

import Documents from "../../lib/models/Documents";
import Peers from "../../lib/models/mediasoup/Peers";
import type { PuzzleType } from "../../lib/models/Puzzles";
import Puzzles from "../../lib/models/Puzzles";
import documentsForPuzzleDeleteModal from "../../lib/publications/documentsForPuzzleDeleteModal";
import puzzlesForHunt from "../../lib/publications/puzzlesForHunt";
import destroyPuzzle from "../../methods/destroyPuzzle";
import useSubscribeDisplayNames from "../hooks/useSubscribeDisplayNames";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import indexedDisplayNames from "../indexedDisplayNames";
import { Subscribers } from "../subscribers";
import Loading from "./Loading";

// Casting away the React.lazy because otherwise we lose access to the generic parameter
const Select = React.lazy(
  () => import("react-select"),
) as typeof import("react-select").default;

export type PuzzleDeleteModalHandle = {
  show: () => void;
};

interface PuzzleSelectOption {
  label: string;
  value: string;
}

const PuzzleDeleteModal = React.forwardRef(
  (
    { puzzle }: { puzzle: PuzzleType },
    forwardedRef: React.Ref<PuzzleDeleteModalHandle>,
  ) => {
    const [visible, setVisible] = useState(true);
    const show = useCallback(() => setVisible(true), []);
    const hide = useCallback(() => setVisible(false), []);
    useImperativeHandle(forwardedRef, () => ({ show }), [show]);

    const subscriberTopic = `puzzle:${puzzle._id}`;
    const documentsLoading = useTypedSubscribe(documentsForPuzzleDeleteModal, {
      huntId: puzzle.hunt,
    });
    const puzzlesLoading = useTypedSubscribe(puzzlesForHunt, {
      huntId: puzzle.hunt,
    });
    const viewersLoading = useSubscribe("subscribers.fetch", subscriberTopic);
    const callersLoading = useSubscribe(
      "mediasoup:metadata",
      puzzle.hunt,
      puzzle._id,
    );
    const displayNamesLoading = useSubscribeDisplayNames(puzzle.hunt);
    const loading =
      puzzlesLoading() ||
      viewersLoading() ||
      callersLoading() ||
      documentsLoading() ||
      displayNamesLoading();

    const puzzles = useTracker(
      () =>
        loading
          ? []
          : Puzzles.find({
              hunt: puzzle.hunt,
              _id: { $ne: puzzle._id },
            }).fetch(),
      [loading, puzzle.hunt, puzzle._id],
    );
    const viewers = useTracker(
      () =>
        loading ? [] : Subscribers.find({ name: subscriberTopic }).fetch(),
      [loading, subscriberTopic],
    );
    const callers = useTracker(
      () =>
        loading
          ? []
          : Peers.find({ hunt: puzzle.hunt, puzzle: puzzle._id }).fetch(),
      [loading, puzzle.hunt, puzzle._id],
    );
    const documents = useTracker(
      () => (loading ? [] : Documents.find({ hunt: puzzle.hunt }).fetch()),
      [loading, puzzle.hunt],
    );
    const displayNames = indexedDisplayNames();
    const uniqueViewers = [
      ...new Set([
        ...viewers.map(({ user }) => user),
        ...callers.map(({ createdBy }) => createdBy),
      ]),
    ].map((u) => {
      return { id: u, name: displayNames.get(u) ?? "Unknown viewer" };
    });

    const thisPuzzleHasSheets = documents.some(
      (d) => d.puzzle === puzzle._id && d.value.type === "spreadsheet",
    );

    const [replacementId, setReplacementId] =
      useState<PuzzleSelectOption | null>(null);
    const [replacementHasSheets, setReplacementHasSheets] =
      useState<boolean>(false);

    const setReplacementIdCallback = useCallback(
      (v: PuzzleSelectOption | null) => {
        if (thisPuzzleHasSheets) {
          setReplacementHasSheets(
            v != null &&
              documents.some(
                (d) => d.puzzle === v?.value && d.value.type === "spreadsheet",
              ),
          );
        }
        return setReplacementId(v);
      },
      [thisPuzzleHasSheets, documents],
    );

    const [copySheetsToReplacement, setCopySheetsToReplacement] =
      useState<boolean>(true);
    const onCopySheetsToReplacementChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        setCopySheetsToReplacement(event.currentTarget.checked);
      },
      [],
    );

    const replacementOptions: PuzzleSelectOption[] = [
      ...puzzles.map((p) => ({ label: p.title, value: p._id })),
    ];

    const deletePuzzle = useCallback(() => {
      destroyPuzzle.call({
        puzzleId: puzzle._id,
        replacedBy: replacementId?.value,
        copySheetsToReplacement:
          thisPuzzleHasSheets &&
          replacementHasSheets &&
          copySheetsToReplacement,
      });
      // Hide immediately before the component gets unmounted
      hide();
    }, [
      puzzle._id,
      replacementId?.value,
      hide,
      thisPuzzleHasSheets,
      replacementHasSheets,
      copySheetsToReplacement,
    ]);

    const idPrefix = useId();

    const modal = (
      <Modal show={visible} onHide={hide}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Puzzle</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Suspense
            fallback={
              <div>
                <Loading inline />
              </div>
            }
          >
            <p>
              Are you sure you want to delete this puzzle? Anyone actively
              working on this puzzle will lose the ability to make further edits
              or chat comments.
            </p>
            <p>
              You can optionally specify a replacement to be used instead of
              this puzzle and copy the sheets over (if applicable)
            </p>
            <Select
              isClearable
              options={replacementOptions}
              value={replacementId}
              onChange={setReplacementIdCallback}
            />
            {replacementId && thisPuzzleHasSheets && replacementHasSheets && (
              <FormCheck
                id={`${idPrefix}-copy-sheets-to-replacement`}
                label="Copy the sheets to the replacement puzzle"
                type="checkbox"
                defaultChecked
                onChange={onCopySheetsToReplacementChange}
                className="mt-1"
              />
            )}
            <p>
              This puzzle is currently being viewed by {uniqueViewers.length}{" "}
              {uniqueViewers.length === 1 ? "person" : "people"}
              {uniqueViewers.length > 0 && ":"}
            </p>
            <ul>
              {uniqueViewers.map(({ id, name }) => (
                <li key={id}>{name}</li>
              ))}
            </ul>
          </Suspense>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={hide}>
            Cancel
          </Button>
          <Button variant="danger" onClick={deletePuzzle}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    );

    return createPortal(modal, document.body);
  },
);

export default PuzzleDeleteModal;
