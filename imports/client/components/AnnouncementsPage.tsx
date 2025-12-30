import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import type React from "react";
import { useCallback, useId, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { useParams } from "react-router-dom";
import ReactTextareaAutosize from "react-textarea-autosize";
import styled, { useTheme } from "styled-components";
import Announcements from "../../lib/models/Announcements";
import Hunts from "../../lib/models/Hunts";
import { userMayAddAnnouncementToHunt } from "../../lib/permission_stubs";
import announcementsForAnnouncementsPage from "../../lib/publications/announcementsForAnnouncementsPage";
import postAnnouncement from "../../methods/postAnnouncement";
import { useBreadcrumb } from "../hooks/breadcrumb";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import indexedDisplayNames from "../indexedDisplayNames";
import ActionButtonRow from "./ActionButtonRow";
import AnnouncementToast from "./AnnouncementToast";

enum AnnouncementFormSubmitState {
  IDLE = "idle",
  SUBMITTING = "submitting",
  FAILED = "failed",
}

// Toasts are bounded in width, so the announcement log will only be about this wide.
// Rather than have the input box be much wider than the rest of the page
// content, set the input form width to match.
const BoundedForm = styled(Form)`
  width: ${window
    .getComputedStyle(document.body)
    .getPropertyValue("--bs-toast-max-width")};
`;

const AnnouncementFormInput = ({
  huntId,
  selfDisplayName,
}: {
  huntId: string;
  selfDisplayName: string;
}) => {
  const [message, setMessage] = useState<string>("");
  const [submitState, setSubmitState] = useState<AnnouncementFormSubmitState>(
    AnnouncementFormSubmitState.IDLE,
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  const onMessageChanged = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(event.target.value);
    },
    [],
  );

  const postAnnouncementCb = useCallback(() => {
    if (message) {
      setSubmitState(AnnouncementFormSubmitState.SUBMITTING);
      postAnnouncement.call({ huntId, message }, (error) => {
        if (error) {
          setErrorMessage(error.message);
          setSubmitState(AnnouncementFormSubmitState.FAILED);
        } else {
          setErrorMessage("");
          setMessage("");
          setSubmitState(AnnouncementFormSubmitState.IDLE);
        }
      });
    }
  }, [message, huntId]);

  const disabled = submitState === AnnouncementFormSubmitState.SUBMITTING;
  const id = useId();

  return (
    <BoundedForm>
      {submitState === AnnouncementFormSubmitState.FAILED ? (
        <Alert variant="danger">{errorMessage}</Alert>
      ) : null}
      {message && (
        <AnnouncementToast
          className="mb-2"
          displayName={`${selfDisplayName} (preview)`}
          message={message}
          createdAt={new Date()}
          theme={theme}
        />
      )}
      <Form.Group className="mb-2" controlId={id}>
        <Form.Label>
          Write an announcement: (try to keep it brief and on-point)
        </Form.Label>
        <ReactTextareaAutosize
          id={id}
          minRows={4}
          className="form-control"
          autoFocus
          disabled={disabled}
          value={message}
          onChange={onMessageChanged}
        />
      </Form.Group>
      <ActionButtonRow>
        <Button
          variant="primary"
          size="sm"
          disabled={disabled}
          onClick={postAnnouncementCb}
        >
          Send
        </Button>
      </ActionButtonRow>
    </BoundedForm>
  );
};

const AnnouncementsPage = () => {
  const huntId = useParams<"huntId">().huntId!;
  useBreadcrumb({
    title: "Announcements",
    path: `/hunts/${huntId}/announcements`,
  });

  const announcementsLoading = useTypedSubscribe(
    announcementsForAnnouncementsPage,
    { huntId },
  );
  const loading = announcementsLoading();

  const announcements = useTracker(
    () =>
      loading
        ? []
        : Announcements.find(
            { hunt: huntId },
            { sort: { createdAt: -1 } },
          ).fetch(),
    [loading, huntId],
  );
  const displayNames = useTracker(
    () => (loading ? new Map<string, string>() : indexedDisplayNames()),
    [loading],
  );
  const canCreateAnnouncements = useTracker(() => {
    return userMayAddAnnouncementToHunt(Meteor.user(), Hunts.findOne(huntId));
  }, [huntId]);
  const selfDisplayName = useTracker(
    () => Meteor.user()?.displayName ?? "???",
    [],
  );

  if (loading) {
    return <div>loading...</div>;
  }

  return (
    <div>
      <h1>Announcements</h1>
      {canCreateAnnouncements && (
        <AnnouncementFormInput
          huntId={huntId}
          selfDisplayName={selfDisplayName}
        />
      )}
      {/* ostensibly these should be ul and li, but then I have to deal with overriding
          block/inline and default margins and list style type and meh */}
      <div>
        {announcements.map((announcement) => {
          return (
            <AnnouncementToast
              className="mb-2"
              key={announcement._id}
              createdAt={announcement.createdAt}
              displayName={displayNames.get(announcement.createdBy) ?? "???"}
              message={announcement.message}
            />
          );
        })}
      </div>
    </div>
  );
};

export default AnnouncementsPage;
