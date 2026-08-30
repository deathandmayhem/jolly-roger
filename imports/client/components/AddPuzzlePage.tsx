import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { useCallback, useMemo } from "react";
import Alert from "react-bootstrap/Alert";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import FormSelect from "react-bootstrap/FormSelect";
import Row from "react-bootstrap/Row";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import inferPuzzleTitle from "../../lib/inferPuzzleTitle";
import Hunts from "../../lib/models/Hunts";
import Tags from "../../lib/models/Tags";
import { userMayWritePuzzlesForHunt } from "../../lib/permission_stubs";
import huntsAll from "../../lib/publications/huntsAll";
import tagsForHunt from "../../lib/publications/tagsForHunt";
import createPuzzle from "../../methods/createPuzzle";
import { useBreadcrumb } from "../hooks/breadcrumb";
import { useAddPuzzleLastSelectedHuntId } from "../hooks/persisted-state";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import Loading from "./Loading";
import type { PuzzleModalFormSubmitPayload } from "./PuzzleModalForm";
import PuzzleModalForm from "./PuzzleModalForm";

/**
 * Standalone page for adding a puzzle to a hunt, designed for use with
 * the bookmarklet. Allows selecting the target hunt and prepopulates
 * the title and URL from query parameters.
 */
const AddPuzzlePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlParam = searchParams.get("url") ?? undefined;
  const titleParam = searchParams.get("title") ?? undefined;
  const inferredTitle = useMemo(
    () => inferPuzzleTitle(titleParam, urlParam),
    [titleParam, urlParam],
  );

  const [lastSelectedHuntId, setLastSelectedHuntId] =
    useAddPuzzleLastSelectedHuntId();

  const huntsLoading = useTypedSubscribe(huntsAll);
  const loadingHunts = huntsLoading();

  const user = useTracker(() => Meteor.user(), []);
  const writableHunts = useTracker(() => {
    if (loadingHunts) {
      return [];
    }
    const allHunts = Hunts.find({}, { sort: { createdAt: -1 } }).fetch();
    return allHunts.filter((h) => userMayWritePuzzlesForHunt(user, h));
  }, [loadingHunts, user]);

  const selectedHuntId = useMemo(() => {
    if (
      lastSelectedHuntId &&
      writableHunts.some((h) => h._id === lastSelectedHuntId)
    ) {
      return lastSelectedHuntId;
    }
    return writableHunts[0]?._id;
  }, [lastSelectedHuntId, writableHunts]);

  const onHuntChange = useCallback(
    (newHuntId: string) => {
      setLastSelectedHuntId(newHuntId);
    },
    [setLastSelectedHuntId],
  );

  const tagsLoading = useTypedSubscribe(tagsForHunt, {
    huntId: selectedHuntId ?? "",
  });
  const loadingTags = Boolean(selectedHuntId && tagsLoading());

  const huntTags = useTracker(() => {
    if (!selectedHuntId || loadingTags) {
      return [];
    }
    return Tags.find({ hunt: selectedHuntId }).fetch();
  }, [selectedHuntId, loadingTags]);

  const isPopup = Boolean(window.opener);

  const closePopup = useCallback(() => {
    // Defer closing until the next tick so Meteor's in-flight method queue
    // settles, preventing close.ts from triggering an uncommitted changes alert.
    Meteor.defer(() => {
      window.close();
    });
  }, []);

  const onSubmit = useCallback(
    (
      payload: PuzzleModalFormSubmitPayload,
      callback: (error?: Error) => void,
    ) => {
      const { docType, ...rest } = payload;
      if (!docType) {
        callback(new Error("No docType provided"));
        return;
      }

      createPuzzle.call({ docType, ...rest }, (error) => {
        callback(error);
        if (!error) {
          if (isPopup) {
            closePopup();
          } else if (payload.huntId) {
            void navigate(`/hunts/${payload.huntId}/puzzles`);
          }
        }
      });
    },
    [navigate, isPopup, closePopup],
  );

  const onHide = useCallback(() => {
    if (isPopup) {
      closePopup();
    } else if (window.history.length > 1) {
      void navigate(-1);
    } else if (selectedHuntId) {
      void navigate(`/hunts/${selectedHuntId}/puzzles`);
    } else {
      void navigate("/hunts");
    }
  }, [navigate, selectedHuntId, isPopup, closePopup]);

  useBreadcrumb({
    title: t("puzzle.edit.addPuzzle", "Add puzzle"),
    path: "/hunts/addpuzzle",
  });

  useDocumentTitle(
    `${t("puzzle.edit.addPuzzle", "Add puzzle")} :: Jolly Roger`,
  );

  if (loadingHunts) {
    return <Loading />;
  }

  if (writableHunts.length === 0) {
    return (
      <Container className="p-3">
        <Alert variant="warning">
          {t(
            "addPuzzle.noHuntsAvailable",
            "You do not have permission to add puzzles to any hunts. Please join a hunt or contact an operator.",
          )}
        </Alert>
      </Container>
    );
  }

  if (!selectedHuntId || loadingTags) {
    return <Loading />;
  }

  return (
    <Container className="p-3">
      <PuzzleModalForm
        huntId={selectedHuntId}
        tags={huntTags}
        initialTitle={inferredTitle}
        initialUrl={urlParam}
        onSubmit={onSubmit}
        onHide={onHide}
        inline
      >
        {writableHunts.length > 1 && (
          <FormGroup
            as={Row}
            className="mb-3"
            controlId="add-puzzle-hunt-select"
          >
            <FormLabel column xs={3}>
              {t("puzzle.edit.hunt", "Hunt")}
            </FormLabel>
            <Col xs={9}>
              <FormSelect
                value={selectedHuntId}
                onChange={(e) => onHuntChange(e.currentTarget.value)}
              >
                {writableHunts.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name}
                  </option>
                ))}
              </FormSelect>
            </Col>
          </FormGroup>
        )}
      </PuzzleModalForm>
    </Container>
  );
};

export default AddPuzzlePage;
