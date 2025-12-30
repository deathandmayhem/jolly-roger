import { Meteor } from "meteor/meteor";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import type React from "react";
import { useCallback, useId, useMemo, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import Row from "react-bootstrap/Row";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import Hunts from "../../lib/models/Hunts";
import { userMayBulkAddToHunt } from "../../lib/permission_stubs";
import addHuntUser from "../../methods/addHuntUser";
import bulkAddHuntUsers from "../../methods/bulkAddHuntUsers";
import { useBreadcrumb } from "../hooks/breadcrumb";
import MeteorUsers from "../../lib/models/MeteorUsers";
import InvitedUserList from "./InvitedUserList";

const BulkError = styled.p`
  white-space: pre-wrap;
`;

const UserInvitePage = () => {
  const huntId = useParams<"huntId">().huntId!;
  const navigate = useNavigate();
  useBreadcrumb({ title: "Invite", path: `/hunts/${huntId}/hunters/invite` });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<Meteor.Error | undefined>(undefined);
  const [email, setEmail] = useState<string>("");
  const [bulkEmails, setBulkEmails] = useState<string>("");
  const [bulkError, setBulkError] = useState<Meteor.Error | undefined>(
    undefined,
  );

  const canBulkInvite = useTracker(() => {
    return userMayBulkAddToHunt(Meteor.user(), Hunts.findOne(huntId));
  }, [huntId]);

  const onEmailChanged: NonNullable<FormControlProps["onChange"]> = useCallback(
    (e) => {
      setEmail(e.currentTarget.value);
    },
    [],
  );

  const onBulkEmailsChanged: NonNullable<FormControlProps["onChange"]> =
    useCallback((e) => {
      setBulkEmails(e.currentTarget.value);
    }, []);

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSubmitting(true);
      addHuntUser.call({ huntId, email }, (inviteError?) => {
        setSubmitting(false);
        if (inviteError) {
          setError(inviteError);
        } else {
          navigate(`/hunts/${huntId}`);
        }
      });
    },
    [huntId, email, navigate],
  );

  const onBulkSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSubmitting(true);
      setBulkError(undefined);
      const emails = bulkEmails
        .trim()
        .split("\n")
        .map((addr) => addr.trim());
      bulkAddHuntUsers.call({ huntId, emails }, (bulkInviteError) => {
        setSubmitting(false);
        if (bulkInviteError) {
          setBulkError(bulkInviteError);
        } else {
          setBulkEmails("");
        }
      });
    },
    [huntId, bulkEmails],
  );

  const idPrefix = useId();

  const bulkInvite = useMemo(() => {
    return canBulkInvite ? (
      <div>
        <h2>Bulk invite</h2>

        {bulkError ? (
          <Alert variant="danger">
            <BulkError>{bulkError.reason}</BulkError>
          </Alert>
        ) : undefined}

        <form onSubmit={onBulkSubmit} className="form-horizontal">
          <FormGroup className="mb-3" controlId={`${idPrefix}-invite-bulk`}>
            <FormLabel>Email addresses (one per line)</FormLabel>
            <FormControl
              as="textarea"
              rows={10}
              value={bulkEmails}
              onChange={onBulkEmailsChanged}
            />
          </FormGroup>

          <FormGroup className="mb-3">
            <Button type="submit" variant="primary" disabled={submitting}>
              Send bulk invites
            </Button>
          </FormGroup>
        </form>
      </div>
    ) : undefined;
  }, [
    idPrefix,
    canBulkInvite,
    submitting,
    bulkEmails,
    bulkError,
    onBulkSubmit,
    onBulkEmailsChanged,
  ]);

  const invitesLoading = useSubscribe("invitedUsers");

  const loading = invitesLoading();

  const invites = useTracker(() => {
    const invitees = loading
      ? []
      : MeteorUsers.find(
          {
            $and: [
              {
                "services.password.enroll": { $exists: true },
                hunts: huntId,
              },
            ],
          },
          { sort: { createdAt: 1 } },
        ).fetch();

    if (invitees.length === 0) {
      return null;
    }

    return (
      <Row>
        <h2>Invited users</h2>
        <InvitedUserList users={invitees} />
      </Row>
    );
  }, [huntId, loading]);

  return (
    (loading && <div>Loading...</div>) || (
      <div>
        <h1>Send an invite</h1>

        <p>
          Invite someone to join this hunt. They&apos;ll get an email with
          instructions (even if they already have a Jolly Roger account)
        </p>

        <Row>
          <Col md={8}>
            {error ? (
              <Alert variant="danger">
                <p>{error.reason}</p>
              </Alert>
            ) : undefined}

            <form onSubmit={onSubmit} className="form-horizontal">
              <FormGroup as={Row} className="mb-3">
                <FormLabel htmlFor={`${idPrefix}-email`} column md={3}>
                  E-mail address
                </FormLabel>
                <Col md={9}>
                  <FormControl
                    id={`${idPrefix}-email`}
                    type="email"
                    value={email}
                    onChange={onEmailChanged}
                    disabled={submitting}
                  />
                </Col>
              </FormGroup>

              <FormGroup className="mb-3">
                <Col md={{ offset: 3, span: 9 }}>
                  <Button type="submit" variant="primary" disabled={submitting}>
                    Send invite
                  </Button>
                </Col>
              </FormGroup>
            </form>

            {bulkInvite}
          </Col>
        </Row>
        {invites}
      </div>
    )
  );
};

export default UserInvitePage;
