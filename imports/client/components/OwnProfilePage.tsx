import type { Meteor } from "meteor/meteor";
import { OAuth } from "meteor/oauth";
import { useTracker } from "meteor/react-meteor-data";
import { ServiceConfiguration } from "meteor/service-configuration";
import { useCallback, useId, useMemo, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import FormText from "react-bootstrap/FormText";
import { useTranslation } from "react-i18next";
import Flags from "../../Flags";
import { formatDiscordName } from "../../lib/discord";
import type { APIKeyType } from "../../lib/models/APIKeys";
import createAPIKey from "../../methods/createAPIKey";
import linkUserDiscordAccount from "../../methods/linkUserDiscordAccount";
import unlinkUserDiscordAccount from "../../methods/unlinkUserDiscordAccount";
import updateProfile from "../../methods/updateProfile";
import { requestDiscordCredential } from "../discord";
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

const OwnProfilePage = ({
  initialUser,
  apiKeys,
}: {
  initialUser: Meteor.User;
  apiKeys?: APIKeyType[];
}) => {
  const [displayName, setDisplayName] = useState<string>(
    initialUser.displayName ?? "",
  );
  const [phoneNumber, setPhoneNumber] = useState<string>(
    initialUser.phoneNumber ?? "",
  );
  const [dingwordsFlat, setDingwordsFlat] = useState<string>(
    initialUser.dingwords ? initialUser.dingwords.join(",") : "",
  );
  const [submitState, setSubmitState] = useState<OwnProfilePageSubmitState>(
    OwnProfilePageSubmitState.IDLE,
  );
  const [submitError, setSubmitError] = useState<string>("");

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
      <Avatar {...initialUser} size={64} />
      <FormGroup className="mb-3" controlId={`${idPrefix}-email`}>
        <FormLabel>{t("common.email", "Email address")}</FormLabel>
        <FormControl
          type="text"
          value={initialUser.emails![0]!.address}
          disabled
        />
      </FormGroup>
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
