import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faEraser } from "@fortawesome/free-solid-svg-icons/faEraser";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type React from "react";
import type { MouseEvent } from "react";
import {
  useCallback,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import FormText from "react-bootstrap/FormText";
import InputGroup from "react-bootstrap/InputGroup";
import ListGroup from "react-bootstrap/ListGroup";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import Modal from "react-bootstrap/Modal";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { formatDiscordName } from "../../lib/discord";
import isAdmin from "../../lib/isAdmin";
import type { HuntType } from "../../lib/models/Hunts";
import { userIsOperatorForHunt } from "../../lib/permission_stubs";
import clearHuntInvitationCode from "../../methods/clearHuntInvitationCode";
import demoteOperator from "../../methods/demoteOperator";
import generateHuntInvitationCode from "../../methods/generateHuntInvitationCode";
import promoteOperator from "../../methods/promoteOperator";
import syncHuntDiscordRole from "../../methods/syncHuntDiscordRole";
import useFocusRefOnFindHotkey from "../hooks/useFocusRefOnFindHotkey";
import Avatar from "./Avatar";
import { useBootstrapContainer } from "./BootstrapScopeContext";
import CopyToClipboardButton from "./CopyToClipboardButton";

const ProfilesSummary = styled.div`
  text-align: right;
`;

const ListItemContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const ImageBlock = styled.div`
  width: 40px;
  height: 40px;
  flex: none;
  margin-right: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const OperatorBox = styled.div`
  margin-left: auto;
  padding-right: 0.5rem;

  * {
    margin: 0 0.25rem;
  }
`;

const StyledCopyToClipboardButton = styled(CopyToClipboardButton)`
  padding: 0;
  vertical-align: baseline;
`;

type ModalHandle = {
  show(): void;
};

const ConfirmationModal = ({
  title,
  body,
  action,
  performAction,
  variant,
  ref,
}: {
  title: string;
  body: string | React.JSX.Element;
  action: string;
  performAction: (callback: (e?: Error) => void) => void;
  variant?: string;
  ref: React.Ref<ModalHandle>;
}) => {
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState<Error>();
  const clearError = useCallback(() => setError(undefined), []);
  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => {
    clearError();
    setVisible(false);
  }, [clearError]);
  useImperativeHandle(ref, () => ({ show }), [show]);

  const [disabled, setDisabled] = useState(false);

  const onActionClicked = useCallback(() => {
    performAction((e) => {
      setDisabled(false);
      if (e) {
        setError(e);
      } else {
        hide();
      }
    });
    setDisabled(true);
  }, [performAction, hide]);

  const { t } = useTranslation();
  const container = useBootstrapContainer();

  const modal = (
    <Modal show={visible} onHide={hide} container={container}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{body}</p>
        {error && (
          <Alert variant="danger" dismissible onClose={clearError}>
            {error.message}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={hide} disabled={disabled}>
          {t("common.cancel", "Cancel")}
        </Button>
        <Button
          variant={variant ?? "danger"}
          onClick={onActionClicked}
          disabled={disabled}
        >
          {action}
        </Button>
      </Modal.Footer>
    </Modal>
  );

  return modal;
};

const PromoteOperatorModal = ({
  user,
  huntId,
  forwardedRef,
}: {
  user: Meteor.User;
  huntId: string;
  forwardedRef: React.Ref<ModalHandle>;
}) => {
  const performAction = useCallback(
    (callback: (e?: Error) => void) => {
      promoteOperator.call({ targetUserId: user._id, huntId }, callback);
    },
    [huntId, user._id],
  );

  const { t } = useTranslation();

  const body = (
    <Trans
      i18nKey="hunterList.confirmPromote"
      t={t}
      defaults="Are you sure you want to make <strong>{{name}}</strong> an operator?"
      values={{ name: user.displayName }}
      components={{
        strong: <strong />,
      }}
    />
  );

  return (
    <ConfirmationModal
      title={t("hunterList.promoteOperator", "Promote Operator")}
      body={body}
      action={t("hunterList.promoteButton", "Promote")}
      performAction={performAction}
      ref={forwardedRef}
    />
  );
};

const DemoteOperatorModal = ({
  user,
  huntId,
  forwardedRef,
}: {
  user: Meteor.User;
  huntId: string;
  forwardedRef: React.Ref<ModalHandle>;
}) => {
  const performAction = useCallback(
    (callback: (e?: Error) => void) => {
      demoteOperator.call({ targetUserId: user._id, huntId }, callback);
    },
    [huntId, user._id],
  );

  const { t } = useTranslation();

  const body = (
    <Trans
      i18nKey="hunterList.confirmDemote"
      t={t}
      defaults="Are you sure you want to demote <strong>{{name}}</strong>?"
      values={{ name: user.displayName }}
      components={{
        strong: <strong />,
      }}
    />
  );

  return (
    <ConfirmationModal
      title={t("hunterList.demoteOperator", "Demote Operator")}
      body={body}
      action={t("hunterList.demoteButton", "Demote")}
      performAction={performAction}
      ref={forwardedRef}
    />
  );
};

const OperatorControls = ({
  user,
  hunt,
}: {
  user: Meteor.User;
  hunt: HuntType;
}) => {
  const self = useTracker(() => user._id === Meteor.userId(), [user._id]);
  const { userIsOperator, userIsAdmin } = useTracker(() => {
    return {
      userIsOperator: userIsOperatorForHunt(user, hunt),
      userIsAdmin: isAdmin(user),
    };
  }, [user, hunt]);

  const [renderPromoteModal, setRenderPromoteModal] = useState(false);
  const promoteModalRef = useRef<ModalHandle>(null);
  const [renderDemoteModal, setRenderDemoteModal] = useState(false);
  const demoteModalRef = useRef<ModalHandle>(null);

  const showPromoteModal = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      if (renderPromoteModal && promoteModalRef.current) {
        promoteModalRef.current.show();
      } else {
        setRenderPromoteModal(true);
      }
    },
    [renderPromoteModal],
  );
  const showDemoteModal = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      if (renderDemoteModal && demoteModalRef.current) {
        demoteModalRef.current.show();
      } else {
        setRenderDemoteModal(true);
      }
    },
    [renderDemoteModal],
  );

  const preventPropagation = useCallback((e: MouseEvent) => {
    e.preventDefault();
  }, []);

  const { t } = useTranslation();

  return (
    <OperatorBox onClick={preventPropagation}>
      {userIsAdmin && (
        <Badge bg="success">{t("hunterList.admin", "Admin")}</Badge>
      )}
      {userIsOperator && (
        <Badge bg="primary">{t("hunterList.operator", "Operator")}</Badge>
      )}
      {renderPromoteModal && (
        <PromoteOperatorModal
          forwardedRef={promoteModalRef}
          user={user}
          huntId={hunt._id}
        />
      )}
      {renderDemoteModal && (
        <DemoteOperatorModal
          forwardedRef={demoteModalRef}
          user={user}
          huntId={hunt._id}
        />
      )}
      {userIsOperator ? (
        !self && (
          <Button size="sm" variant="warning" onClick={showDemoteModal}>
            {t("hunterList.demoteButton", "Demote")}
          </Button>
        )
      ) : (
        <Button size="sm" variant="warning" onClick={showPromoteModal}>
          {t("hunterList.makeOperator", "Make operator")}
        </Button>
      )}
    </OperatorBox>
  );
};

const GenerateInvitationLinkModal = ({
  huntId,
  isRegenerate,
  forwardedRef,
}: {
  huntId: string;
  isRegenerate: boolean;
  forwardedRef: React.Ref<ModalHandle>;
}) => {
  const performAction = useCallback(
    (callback: (e?: Error) => void) => {
      generateHuntInvitationCode.call({ huntId }, callback);
    },
    [huntId],
  );

  const { t } = useTranslation();

  return (
    <ConfirmationModal
      title={
        isRegenerate
          ? t(
              "hunterList.invitationLink.modal.regenerateTitle",
              "Regenerate Invitation Link",
            )
          : t(
              "hunterList.invitationLink.modal.generateTitle",
              "Generate Invitation Link",
            )
      }
      body={
        isRegenerate
          ? t(
              "hunterList.invitationLink.modal.regenerateBody",
              "Are you sure you want to regenerate the invitation link to this hunt? The current link will no longer be valid.",
            )
          : t(
              "hunterList.invitationLink.modal.generateBody",
              "Generate an invitation link to this hunt? Anyone with access to invite users will see this link, and anyone with the link will be able to join.",
            )
      }
      action={
        isRegenerate
          ? t(
              "hunterList.invitationLink.modal.regenerateButton",
              "Regenerate link",
            )
          : t("hunterList.invitationLink.modal.generateButton", "Generate link")
      }
      performAction={performAction}
      ref={forwardedRef}
      variant={isRegenerate ? "danger" : "primary"}
    />
  );
};

const DisableInvitationLinkModal = ({
  huntId,
  forwardedRef,
}: {
  huntId: string;
  forwardedRef: React.Ref<ModalHandle>;
}) => {
  const performAction = useCallback(
    (callback: (e?: Error) => void) => {
      clearHuntInvitationCode.call({ huntId }, callback);
    },
    [huntId],
  );

  const { t } = useTranslation();

  return (
    <ConfirmationModal
      title={t(
        "hunterList.invitationLink.modal.disableTitle",
        "Disable Invitation Link",
      )}
      body={t(
        "hunterList.invitationLink.modal.disableBody",
        "Are you sure you want to disable the invitation link to this hunt? The current link will no longer be valid.",
      )}
      action={t(
        "hunterList.invitationLink.modal.disableButton",
        "Disable link",
      )}
      performAction={performAction}
      ref={forwardedRef}
    />
  );
};

const ProfileList = ({
  hunt,
  canInvite,
  canSyncDiscord,
  canMakeOperator,
  canUpdateHuntInvitationCode,
  users,
  roles,
  invitationCode,
}: {
  hunt?: HuntType;
  canInvite?: boolean;
  canSyncDiscord?: boolean;
  canMakeOperator?: boolean;
  canUpdateHuntInvitationCode?: boolean;
  users: Meteor.User[];
  roles?: Record<string, string[]>;
  invitationCode?: string;
}) => {
  const [searchString, setSearchString] = useState<string>("");

  const searchBarRef = useRef<HTMLInputElement>(null); // Wrong type but I should fix it
  useFocusRefOnFindHotkey(searchBarRef);

  // The type annotation on FormControl is wrong here - the event is from the
  // input element, not the FormControl React component
  const onSearchStringChange: NonNullable<FormControlProps["onChange"]> =
    useCallback((e) => {
      setSearchString(e.currentTarget.value);
    }, []);

  const matcher = useMemo(() => {
    const searchKeys = searchString.split(" ");
    const toMatch = searchKeys.filter(Boolean).map((s) => s.toLowerCase());

    /* oxlint-disable typescript/prefer-nullish-coalescing -- boolean || chain where false must fall through */
    const isInteresting = (user: Meteor.User) => {
      // A user is interesting if for every search key, that search key matches
      // one of their fields.
      return toMatch.every((searchKey) => {
        return (
          user.displayName?.toLowerCase().includes(searchKey) ||
          user.emails?.some((e) =>
            e.address.toLowerCase().includes(searchKey),
          ) ||
          user.phoneNumber?.toLowerCase().includes(searchKey) ||
          formatDiscordName(user.discordAccount)?.includes(searchKey) ||
          roles?.[user._id]?.some((role) =>
            role.toLowerCase().includes(searchKey),
          )
        );
      });
    };
    /* oxlint-enable typescript/prefer-nullish-coalescing */

    return isInteresting;
  }, [searchString, roles]);

  const clearSearch = useCallback(() => {
    setSearchString("");
  }, []);

  const syncDiscord = useCallback(() => {
    if (!hunt) {
      return;
    }

    syncHuntDiscordRole.call({ huntId: hunt._id });
  }, [hunt]);

  const { t } = useTranslation();

  const syncDiscordButton = useMemo(() => {
    if (!hunt || !canSyncDiscord) {
      return null;
    }

    return (
      <FormGroup className="mb-3">
        <div>
          <Button variant="warning" onClick={syncDiscord}>
            {t(
              "hunterList.discordSync.resync",
              "Sync this hunt's Discord role",
            )}
          </Button>
        </div>
        <FormText>
          {t(
            "hunterList.discordSync.hint",
            "(Click this if people are reporting that they can't access hunt-specific channels)",
          )}
        </FormText>
      </FormGroup>
    );
  }, [hunt, canSyncDiscord, syncDiscord, t]);

  const [
    renderGenerateInvitationLinkModal,
    setRenderGenerateInvitationLinkModal,
  ] = useState(false);
  const generateInvitationLinkModalRef = useRef<ModalHandle>(null);

  const showGenerateInvitationLinkModal = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      if (
        renderGenerateInvitationLinkModal &&
        generateInvitationLinkModalRef.current
      ) {
        generateInvitationLinkModalRef.current.show();
      } else {
        setRenderGenerateInvitationLinkModal(true);
      }
    },
    [renderGenerateInvitationLinkModal],
  );

  const [
    renderDisableInvitationLinkModal,
    setRenderDisableInvitationLinkModal,
  ] = useState(false);
  const disableInvitationLinkModalRef = useRef<ModalHandle>(null);

  const showDisableInvitationLinkModal = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      if (
        renderDisableInvitationLinkModal &&
        disableInvitationLinkModalRef.current
      ) {
        disableInvitationLinkModalRef.current.show();
      } else {
        setRenderDisableInvitationLinkModal(true);
      }
    },
    [renderDisableInvitationLinkModal],
  );

  const invitationLink = useMemo(() => {
    if (!hunt || !canInvite || !invitationCode) {
      return null;
    }

    const invitationUrl = Meteor.absoluteUrl(`/join/${invitationCode}`);

    return (
      <FormGroup>
        <div>
          {t("hunterList.invitationLink.link", "Active invitation link")}:{" "}
          <StyledCopyToClipboardButton
            text={invitationUrl}
            variant="link"
            aria-label="Copy"
          >
            <FontAwesomeIcon icon={faCopy} />
          </StyledCopyToClipboardButton>
          {invitationUrl}
        </div>
      </FormGroup>
    );
  }, [hunt, canInvite, invitationCode, t]);

  const invitationLinkManagement = useMemo(() => {
    if (!hunt || !canUpdateHuntInvitationCode) {
      return null;
    }

    return (
      <FormGroup className="mb-3">
        <h4>{t("hunterList.invitationLink.title", "Invite via link")}</h4>
        {invitationLink}
        {renderGenerateInvitationLinkModal && (
          <GenerateInvitationLinkModal
            forwardedRef={generateInvitationLinkModalRef}
            huntId={hunt._id}
            isRegenerate={invitationCode !== undefined}
          />
        )}
        {renderDisableInvitationLinkModal && (
          <DisableInvitationLinkModal
            forwardedRef={disableInvitationLinkModalRef}
            huntId={hunt._id}
          />
        )}
        <div className="mt-1">
          <Button
            variant={invitationCode ? "warning" : "info"}
            size="sm"
            onClick={showGenerateInvitationLinkModal}
          >
            {invitationCode
              ? t(
                  "hunterList.invitationLink.regenerate",
                  "Regenerate invitation link",
                )
              : t(
                  "hunterList.invitationLink.generate",
                  "Generate invitation link",
                )}
          </Button>
          {invitationCode && (
            <Button
              variant="danger"
              className="ms-1"
              size="sm"
              onClick={showDisableInvitationLinkModal}
            >
              {t(
                "hunterList.invitationLink.disable",
                "Disable invitation link",
              )}
            </Button>
          )}
        </div>
        <FormText>
          {invitationCode
            ? t(
                "hunterList.invitationLink.regenerate.hint",
                "Anyone with this link is able to join this hunt",
              )
            : t(
                "hunterList.invitationLink.generate.hint",
                "Anyone with the link will be able to join this hunt",
              )}
        </FormText>
      </FormGroup>
    );
  }, [
    hunt,
    canUpdateHuntInvitationCode,
    invitationCode,
    invitationLink,
    renderGenerateInvitationLinkModal,
    showGenerateInvitationLinkModal,
    renderDisableInvitationLinkModal,
    showDisableInvitationLinkModal,
    t,
  ]);

  const inviteToHuntItem = useMemo(() => {
    if (!hunt || !canInvite) {
      return null;
    }

    return (
      <ListGroupItem
        action
        as={Link}
        to={`/hunts/${hunt._id}/hunters/invite`}
        className="p-1"
      >
        <ListItemContainer>
          <ImageBlock>
            <FontAwesomeIcon icon={faPlus} />
          </ImageBlock>
          <strong>{t("hunterList.inviteSomeone", "Invite someone")}...</strong>
        </ListItemContainer>
      </ListGroupItem>
    );
  }, [hunt, canInvite, t]);

  const globalInfo = useMemo(() => {
    if (hunt) {
      return null;
    }

    return (
      <Alert variant="info">
        {t(
          "hunterList.alert",
          'This shows everyone registered on Jolly Roger, not just those hunting in this year‘s Mystery Hunt. For that, go to the hunt page and click on "Hunters".',
        )}
      </Alert>
    );
  }, [hunt, t]);

  const searchId = useId();

  const matching = users.filter(matcher);

  return (
    <div>
      <h1>{t("hunterList.title", "List of hunters")}</h1>
      <ProfilesSummary>
        {t("hunterList.totalHunters", "Total hunters")}: {users.length}
      </ProfilesSummary>

      {syncDiscordButton}

      {invitationLinkManagement}

      <FormGroup className="mb-3" controlId={searchId}>
        <FormLabel>{t("common.search", "Search")}</FormLabel>
        <InputGroup>
          <FormControl
            type="text"
            ref={searchBarRef}
            placeholder={t(
              "hunterList.searchBy",
              "search by name, email, phone, Discord...",
            )}
            value={searchString}
            onChange={onSearchStringChange}
          />
          <Button variant="secondary" onClick={clearSearch}>
            <FontAwesomeIcon icon={faEraser} />
          </Button>
        </InputGroup>
      </FormGroup>

      {globalInfo}

      <ListGroup>
        {inviteToHuntItem}
        {matching.map((user) => {
          const name = user.displayName ?? "<no name provided>";
          return (
            <ListGroupItem
              key={user._id}
              action
              as={Link}
              to={
                hunt
                  ? `/hunts/${hunt._id}/hunters/${user._id}`
                  : `/users/${user._id}`
              }
              className="p-1"
            >
              <ListItemContainer>
                <ImageBlock>
                  <Avatar {...user} size={40} />
                </ImageBlock>
                {name}
                {hunt && canMakeOperator && (
                  <OperatorControls hunt={hunt} user={user} />
                )}
              </ListItemContainer>
            </ListGroupItem>
          );
        })}
      </ListGroup>
    </div>
  );
};

export default ProfileList;
