import { Meteor } from "meteor/meteor";
import { OAuth } from "meteor/oauth";
import { useTracker } from "meteor/react-meteor-data";
import { ServiceConfiguration } from "meteor/service-configuration";
import { faPencil } from "@fortawesome/free-solid-svg-icons/faPencil";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import FormText from "react-bootstrap/FormText";
import ListGroup from "react-bootstrap/ListGroup";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Flags from "../../Flags";
import { formatDiscordName } from "../../lib/discord";
import type { APIKeyType } from "../../lib/models/APIKeys";
import addUserAccountEmail from "../../methods/addUserAccountEmail";
import createAPIKey from "../../methods/createAPIKey";
import linkUserDiscordAccount from "../../methods/linkUserDiscordAccount";
import makeUserEmailPrimary from "../../methods/makeUserEmailPrimary";
import removeCustomAvatar from "../../methods/removeCustomAvatar";
import removeUserAccountEmail from "../../methods/removeUserAccountEmail";
import sendUserVerificationEmail from "../../methods/sendUserVerificationEmail";
import unlinkUserDiscordAccount from "../../methods/unlinkUserDiscordAccount";
import updateProfile from "../../methods/updateProfile";
import uploadCustomAvatar from "../../methods/uploadCustomAvatar";
import { processAvatarFile } from "../avatarUtils";
import { requestDiscordCredential } from "../discord";
import useS3ImageBucketConfigured from "../hooks/useS3ImageBucketConfigured";
import useTeamName from "../hooks/useTeamName";
import ActionButtonRow from "./ActionButtonRow";
import APIKeysTable from "./APIKeysTable";
import AudioConfig from "./AudioConfig";
import Avatar from "./Avatar";
import GoogleLinkBlock from "./GoogleLinkBlock";

enum DiscordLinkBlockLinkState {
  IDLE = "idle",
  LINKING = "linking",
  ERROR = "error",
}

type DiscordLinkBlockState =
  | {
      state: DiscordLinkBlockLinkState.IDLE | DiscordLinkBlockLinkState.LINKING;
    }
  | {
      state: DiscordLinkBlockLinkState.ERROR;
      error: Error;
    };

const DiscordLinkBlock = ({ user }: { user: Meteor.User }) => {
  const [state, setState] = useState<DiscordLinkBlockState>({
    state: DiscordLinkBlockLinkState.IDLE,
  });

  const config = useTracker(
    () => ServiceConfiguration.configurations.findOne({ service: "discord" }),
    [],
  );
  const discordDisabled = useTracker(() => Flags.active("disable.discord"), []);
  const { teamName } = useTeamName();

  const requestComplete = useCallback((token: string) => {
    const secret = OAuth._retrieveCredentialSecret(token);
    if (!secret) {
      setState({ state: DiscordLinkBlockLinkState.IDLE });
      return;
    }

    linkUserDiscordAccount.call({ key: token, secret }, (error) => {
      if (error) {
        setState({ state: DiscordLinkBlockLinkState.ERROR, error });
      } else {
        setState({ state: DiscordLinkBlockLinkState.IDLE });
      }
    });
  }, []);

  const onLink = useCallback(() => {
    setState({ state: DiscordLinkBlockLinkState.LINKING });
    requestDiscordCredential(requestComplete);
  }, [requestComplete]);

  const onUnlink = useCallback(() => {
    unlinkUserDiscordAccount.call();
  }, []);

  const dismissAlert = useCallback(() => {
    setState({ state: DiscordLinkBlockLinkState.IDLE });
  }, []);

  const { t } = useTranslation();

  const linkButton = useMemo(() => {
    if (state.state === DiscordLinkBlockLinkState.LINKING) {
      return (
        <Button variant="primary" disabled>
          Linking...
        </Button>
      );
    }

    if (discordDisabled) {
      return (
        <Button variant="primary" disabled>
          Discord integration currently disabled
        </Button>
      );
    }

    const text = user.discordAccount
      ? t("profile.discord.linkDifferent", "Link a different Discord account")
      : t("profile.discord.link", "Link your Discord account");

    return (
      <Button variant="primary" onClick={onLink}>
        {text}
      </Button>
    );
  }, [state.state, discordDisabled, user.discordAccount, onLink, t]);

  const unlinkButton = useMemo(() => {
    if (user.discordAccount) {
      return (
        <Button variant="danger" onClick={onUnlink}>
          {t("profile.discord.unlink", "Unlink")}
        </Button>
      );
    }

    return null;
  }, [user.discordAccount, onUnlink, t]);

  const currentAccount = useMemo(() => {
    if (user.discordAccount) {
      const acct = user.discordAccount;
      return <div>Currently linked to {formatDiscordName(acct)}</div>;
    }

    return null;
  }, [user.discordAccount]);

  if (!config) {
    return <div />;
  }

  return (
    <FormGroup className="mb-3">
      <FormLabel>{t("profile.discord.account", "Discord account")}</FormLabel>
      {state.state === DiscordLinkBlockLinkState.ERROR ? (
        <Alert variant="danger" dismissible onClose={dismissAlert}>
          Linking Discord account failed: {state.error.message}
        </Alert>
      ) : undefined}
      <div>
        {currentAccount}
        {linkButton} {unlinkButton}
      </div>
      <FormText>
        {t(
          "profile.discord.help",
          `Linking your Discord account will add you to the {{teamName}}
          Discord server. Additionally, we'll be able to link up your identity
          there and in jolly-roger chat.`,
          { teamName: teamName },
        )}
      </FormText>
    </FormGroup>
  );
};

const EmailSection = ({ user }: { user: Meteor.User }) => {
  const { t } = useTranslation();
  const idPrefix = useId();
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const handleAddEmail = useCallback(() => {
    const trimmed = newEmail.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(undefined);
    addUserAccountEmail.call({ email: trimmed }, (err) => {
      setBusy(false);
      if (err) {
        if (err instanceof Meteor.Error && err.error === 409) {
          setError(
            t(
              "profile.emails.conflict",
              "That email address belongs to another account. If you'd like to merge the accounts, contact an admin.",
            ),
          );
        } else {
          setError(err.reason ?? err.message);
        }
      } else {
        setNewEmail("");
      }
    });
  }, [newEmail, t]);

  const handleRemoveEmail = useCallback((email: string) => {
    setError(undefined);
    removeUserAccountEmail.call({ email }, (err) => {
      if (err) {
        setError(err.reason ?? err.message);
      }
    });
  }, []);

  const handleMakePrimary = useCallback((email: string) => {
    setError(undefined);
    makeUserEmailPrimary.call({ email }, (err) => {
      if (err) {
        setError(err.reason ?? err.message);
      }
    });
  }, []);

  const handleResendVerification = useCallback((email: string) => {
    setError(undefined);
    sendUserVerificationEmail.call({ email }, (err) => {
      if (err) {
        setError(err.reason ?? err.message);
      }
    });
  }, []);

  const emails = user.emails ?? [];

  return (
    <FormGroup className="mb-3">
      <FormLabel>{t("profile.emails.label", "Email addresses")}</FormLabel>
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(undefined)}>
          {error}
        </Alert>
      )}
      <ListGroup className="mb-2">
        {emails.map((entry, index) => (
          <ListGroupItem
            key={entry.address}
            className="d-flex justify-content-between align-items-center"
          >
            <div>
              {entry.address}{" "}
              {index === 0 && (
                <Badge bg="primary">
                  {t("profile.emails.primary", "Primary")}
                </Badge>
              )}{" "}
              {entry.verified ? (
                <Badge bg="success">
                  {t("profile.emails.verified", "Verified")}
                </Badge>
              ) : (
                <Badge bg="warning" text="dark">
                  {t("profile.emails.unverified", "Unverified")}
                </Badge>
              )}
            </div>
            <div>
              {index !== 0 && entry.verified && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="me-1"
                  onClick={() => handleMakePrimary(entry.address)}
                >
                  {t("profile.emails.makePrimary", "Make primary")}
                </Button>
              )}
              {!entry.verified && (
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="me-1"
                  onClick={() => handleResendVerification(entry.address)}
                >
                  {t(
                    "profile.emails.resendVerification",
                    "Resend verification",
                  )}
                </Button>
              )}
              {index !== 0 && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleRemoveEmail(entry.address)}
                >
                  {t("profile.emails.remove", "Remove")}
                </Button>
              )}
            </div>
          </ListGroupItem>
        ))}
      </ListGroup>
      <div className="d-flex gap-2">
        <FormControl
          id={`${idPrefix}-add-email`}
          type="email"
          placeholder={t("profile.emails.addPlaceholder", "Add email address")}
          value={newEmail}
          onChange={(e) => setNewEmail(e.currentTarget.value)}
          disabled={busy}
        />
        <Button
          variant="outline-primary"
          onClick={handleAddEmail}
          disabled={busy || !newEmail.trim()}
          style={{ whiteSpace: "nowrap" }}
        >
          {t("profile.emails.add", "Add")}
        </Button>
      </div>
    </FormGroup>
  );
};

enum OwnProfilePageSubmitState {
  IDLE = "idle",
  SUBMITTING = "submitting",
  SUCCESS = "success",
  ERROR = "error",
}

const APIKeysSection = ({ apiKeys }: { apiKeys?: APIKeyType[] }) => {
  const [createState, setCreateState] = useState<
    "idle" | "requesting" | "success" | "error"
  >("idle");
  const [createError, setCreateError] = useState<string | undefined>(undefined);
  const createKey = useCallback(() => {
    setCreateState("requesting");
    createAPIKey.call({}, (error, _newKey) => {
      if (error) {
        setCreateState("error");
        setCreateError(error.message);
      } else {
        setCreateState("success");
      }
    });
  }, []);
  const disabled = createState === "requesting";
  const { t } = useTranslation();
  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3>{t("profile.apiKeys.label", "API Keys")}</h3>
        <Button disabled={disabled} onClick={createKey}>
          + {t("profile.apiKeys.create", "Create API key")}
        </Button>
      </div>
      {createState === "error" ? (
        <Alert
          variant="danger"
          onClose={() => setCreateState("idle")}
          dismissible
        >
          Creating API key failed: {createError}
        </Alert>
      ) : undefined}
      <p>
        {t(
          "profile.apiKeys.help",
          "Authorization credentials used to make API calls. Keep them secret!",
        )}
      </p>
      <APIKeysTable apiKeys={apiKeys} />
    </>
  );
};

const AvatarButton = styled.button<{ $interactive: boolean }>`
  position: relative;
  display: inline-block;
  padding: 0;
  border: none;
  background: none;
  cursor: ${({ $interactive }) => ($interactive ? "pointer" : "default")};
  line-height: 0;

  &:hover .avatar-overlay,
  &:focus-visible .avatar-overlay {
    opacity: ${({ $interactive }) => ($interactive ? 1 : 0)};
  }
`;

const AvatarOverlay = styled.div<{ $visible?: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgb(0 0 0 / 45%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 0.15s ease-in-out;
  pointer-events: none;
`;

const AvatarSection = ({ initialUser }: { initialUser: Meteor.User }) => {
  const user = useTracker(() => Meteor.user() ?? initialUser, [initialUser]);
  const { configured: s3Configured } = useS3ImageBucketConfigured();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const onUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(undefined);
    void (async () => {
      try {
        const data = await processAvatarFile(file);
        await uploadCustomAvatar.callPromise({ data, mimeType: "image/png" });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to upload avatar",
        );
      } finally {
        setUploading(false);
      }
    })();
  }, []);

  const onRemove = useCallback(() => {
    setUploading(true);
    setError(undefined);
    void (async () => {
      try {
        await removeCustomAvatar.callPromise();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to remove avatar",
        );
      } finally {
        setUploading(false);
      }
    })();
  }, []);

  return (
    <div className="mb-3">
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(undefined)}>
          {error}
        </Alert>
      )}
      <div className="d-flex align-items-center">
        {s3Configured ? (
          <>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/bmp,image/svg+xml,.png,.jpg,.jpeg,.gif,.webp,.avif,.bmp,.svg"
              onChange={onFileChange}
            />
            <AvatarButton
              type="button"
              $interactive={!uploading}
              onClick={uploading ? undefined : onUploadClick}
              disabled={uploading}
              aria-label={t("profile.avatar.upload", "Change avatar")}
              title={t("profile.avatar.upload", "Change avatar")}
            >
              <Avatar {...user} size={64} />
              <AvatarOverlay className="avatar-overlay" $visible={uploading}>
                {uploading ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  <FontAwesomeIcon icon={faPencil} />
                )}
              </AvatarOverlay>
            </AvatarButton>
            {user.customAvatar && (
              <div className="ms-3">
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={onRemove}
                  disabled={uploading}
                >
                  {t("profile.avatar.remove", "Remove custom avatar")}
                </Button>
              </div>
            )}
          </>
        ) : (
          <Avatar {...user} size={64} />
        )}
      </div>
    </div>
  );
};

const OwnProfilePage = ({
  initialUser,
  apiKeys,
}: {
  initialUser: Meteor.User;
  apiKeys?: APIKeyType[];
}) => {
  const [displayName, setDisplayName] = useState(initialUser.displayName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(initialUser.phoneNumber ?? "");
  const [dingwordsFlat, setDingwordsFlat] = useState(
    initialUser.dingwords ? initialUser.dingwords.join(",") : "",
  );
  const [submitState, setSubmitState] = useState(
    OwnProfilePageSubmitState.IDLE,
  );
  const [submitError, setSubmitError] = useState("");

  const handleDisplayNameFieldChange: NonNullable<
    FormControlProps["onChange"]
  > = useCallback((e) => {
    setDisplayName(e.currentTarget.value);
  }, []);

  const handlePhoneNumberFieldChange: NonNullable<
    FormControlProps["onChange"]
  > = useCallback((e) => {
    setPhoneNumber(e.currentTarget.value);
  }, []);

  const handleDingwordsChange: NonNullable<FormControlProps["onChange"]> =
    useCallback((e) => {
      setDingwordsFlat(e.currentTarget.value);
    }, []);

  const handleSaveForm = useCallback(() => {
    const trimmedDisplayName = displayName.trim();
    if (trimmedDisplayName === "") {
      setSubmitError("Display name must not be empty");
      setSubmitState(OwnProfilePageSubmitState.ERROR);
      return;
    }

    setSubmitState(OwnProfilePageSubmitState.SUBMITTING);
    const dingwords = dingwordsFlat
      .split(",")
      .map((x) => {
        return x.trim().toLowerCase();
      })
      .filter((x) => x.length > 0);
    const newProfile = {
      displayName: trimmedDisplayName,
      phoneNumber: phoneNumber !== "" ? phoneNumber : undefined,
      dingwords,
    };
    updateProfile.call(newProfile, (error) => {
      if (error) {
        setSubmitError(error.message);
        setSubmitState(OwnProfilePageSubmitState.ERROR);
      } else {
        setSubmitState(OwnProfilePageSubmitState.SUCCESS);
      }
    });
  }, [dingwordsFlat, displayName, phoneNumber]);

  const dismissAlert = useCallback(() => {
    setSubmitState(OwnProfilePageSubmitState.IDLE);
  }, []);

  const shouldDisableForm =
    submitState === OwnProfilePageSubmitState.SUBMITTING;

  const idPrefix = useId();

  const { t } = useTranslation();

  return (
    <Container>
      <h1>{t("profile.ownProfileTitle", "Account information")}</h1>
      <AvatarSection initialUser={initialUser} />
      <EmailSection user={initialUser} />
      {submitState === OwnProfilePageSubmitState.SUBMITTING ? (
        <Alert variant="info">{t("common.saving", "Saving")}...</Alert>
      ) : null}
      {submitState === OwnProfilePageSubmitState.SUCCESS ? (
        <Alert variant="success" dismissible onClose={dismissAlert}>
          {t("common.saveSuccess", "Saved changes.")}
        </Alert>
      ) : null}
      {submitState === OwnProfilePageSubmitState.ERROR ? (
        <Alert variant="danger" dismissible onClose={dismissAlert}>
          {t("common.saveFailed", "Saving failed")}: {submitError}
        </Alert>
      ) : null}

      <GoogleLinkBlock user={initialUser} />

      <DiscordLinkBlock user={initialUser} />

      <FormGroup className="mb-3" controlId={`${idPrefix}-display-name`}>
        <FormLabel>{t("profile.displayName.label", "Display name")}</FormLabel>
        <FormControl
          type="text"
          value={displayName}
          disabled={shouldDisableForm}
          onChange={handleDisplayNameFieldChange}
        />
        <FormText>
          {t(
            "profile.displayName.help",
            "We suggest your full name, to avoid ambiguity.",
          )}
        </FormText>
      </FormGroup>

      <FormGroup className="mb-3" controlId={`${idPrefix}-phone`}>
        <FormLabel>
          {t("profile.phoneNumber.label", "Phone number (optional)")}
        </FormLabel>
        <FormControl
          type="text"
          value={phoneNumber}
          disabled={shouldDisableForm}
          onChange={handlePhoneNumberFieldChange}
        />
        <FormText>
          {t(
            "profile.phoneNumber.help",
            "In case we need to reach you via phone.",
          )}
        </FormText>
      </FormGroup>

      <FormGroup className="mb-3" controlId={`${idPrefix}-dingwords`}>
        <FormLabel>
          {t("profile.dingwords.label", "Dingwords (experimental)")}
        </FormLabel>
        <FormControl
          type="text"
          value={dingwordsFlat}
          disabled={shouldDisableForm}
          onChange={handleDingwordsChange}
          placeholder="cryptic,biology,chemistry"
        />
        <FormText>
          {t(
            "profile.dingwords.help",
            `Get an in-app notification if anyone sends a chat message
            containing one of your comma-separated, case-insensitive dingwords
            as a substring. This feature is experimental and may be disabled
            without notice.`,
          )}
        </FormText>
      </FormGroup>

      <ActionButtonRow>
        <FormGroup className="mb-3">
          <Button
            type="submit"
            variant="primary"
            disabled={shouldDisableForm}
            onClick={handleSaveForm}
          >
            {t("common.save", "Save")}
          </Button>
        </FormGroup>
      </ActionButtonRow>

      <AudioConfig />

      <section className="mt-3">
        <h2>{t("profile.advanced", "Advanced")}</h2>
        <APIKeysSection apiKeys={apiKeys} />
      </section>
    </Container>
  );
};

export default OwnProfilePage;
