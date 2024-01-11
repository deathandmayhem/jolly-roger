import type { Meteor } from "meteor/meteor";
import { OAuth } from "meteor/oauth";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import { ServiceConfiguration } from "meteor/service-configuration";
import React, { useCallback, useMemo, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import FormText from "react-bootstrap/FormText";
import Flags from "../../Flags";
import { formatDiscordName } from "../../lib/discord";
import linkUserDiscordAccount from "../../methods/linkUserDiscordAccount";
import unlinkUserDiscordAccount from "../../methods/unlinkUserDiscordAccount";
import updateProfile from "../../methods/updateProfile";
import TeamName from "../TeamName";
import { requestDiscordCredential } from "../discord";
import ActionButtonRow from "./ActionButtonRow";
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

  useSubscribe("teamName");

  const config = useTracker(
    () => ServiceConfiguration.configurations.findOne({ service: "discord" }),
    [],
  );
  const discordDisabled = useTracker(() => Flags.active("disable.discord"), []);
  const teamName = useTracker(
    () => TeamName.findOne("teamName")?.name ?? "Default Team Name",
    [],
  );

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
      ? "Link a different Discord account"
      : "Link your Discord account";

    return (
      <Button variant="primary" onClick={onLink}>
        {text}
      </Button>
    );
  }, [state.state, discordDisabled, user.discordAccount, onLink]);

  const unlinkButton = useMemo(() => {
    if (user.discordAccount) {
      return (
        <Button variant="danger" onClick={onUnlink}>
          Unlink
        </Button>
      );
    }

    return null;
  }, [user.discordAccount, onUnlink]);

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
      <FormLabel>Discord account</FormLabel>
      {state.state === "error" ? (
        <Alert variant="danger" dismissible onClose={dismissAlert}>
          Linking Discord account failed: {state.error.message}
        </Alert>
      ) : undefined}
      <div>
        {currentAccount}
        {linkButton} {unlinkButton}
      </div>
      <FormText>
        Linking your Discord account will add you to the {teamName} Discord
        server. Additionally, we&apos;ll be able to link up your identity there
        and in jolly-roger chat.
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

const OwnProfilePage = ({ initialUser }: { initialUser: Meteor.User }) => {
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

  const shouldDisableForm = submitState === "submitting";
  return (
    <Container>
      <h1>Account information</h1>
      <Avatar {...initialUser} size={64} />
      <FormGroup className="mb-3">
        <FormLabel htmlFor="jr-profile-edit-email">Email address</FormLabel>
        <FormControl
          id="jr-profile-edit-email"
          type="text"
          value={initialUser.emails![0]!.address}
          disabled
        />
      </FormGroup>
      {submitState === "submitting" ? (
        <Alert variant="info">Saving...</Alert>
      ) : null}
      {submitState === "success" ? (
        <Alert variant="success" dismissible onClose={dismissAlert}>
          Saved changes.
        </Alert>
      ) : null}
      {submitState === "error" ? (
        <Alert variant="danger" dismissible onClose={dismissAlert}>
          Saving failed: {submitError}
        </Alert>
      ) : null}

      <GoogleLinkBlock currentAccount={initialUser.googleAccount} />

      <DiscordLinkBlock user={initialUser} />

      <FormGroup className="mb-3">
        <FormLabel htmlFor="jr-profile-edit-display-name">
          Display name
        </FormLabel>
        <FormControl
          id="jr-profile-edit-display-name"
          type="text"
          value={displayName}
          disabled={shouldDisableForm}
          onChange={handleDisplayNameFieldChange}
        />
        <FormText>We suggest your full name, to avoid ambiguity.</FormText>
      </FormGroup>

      <FormGroup className="mb-3">
        <FormLabel htmlFor="jr-profile-edit-phone">
          Phone number (optional)
        </FormLabel>
        <FormControl
          id="jr-profile-edit-phone"
          type="text"
          value={phoneNumber}
          disabled={shouldDisableForm}
          onChange={handlePhoneNumberFieldChange}
        />
        <FormText>In case we need to reach you via phone.</FormText>
      </FormGroup>

      <FormGroup className="mb-3">
        <FormLabel htmlFor="jr-profile-edit-dingwords">
          Dingwords (experimental)
        </FormLabel>
        <FormControl
          id="jr-profile-edit-dingwords"
          type="text"
          value={dingwordsFlat}
          disabled={shouldDisableForm}
          onChange={handleDingwordsChange}
          placeholder="cryptic,biology,chemistry"
        />
        <FormText>
          Get an in-app notification if anyone sends a chat message containing
          one of your comma-separated, case-insensitive dingwords as a
          substring. This feature is experimental and may be disabled without
          notice.
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
            Save
          </Button>
        </FormGroup>
      </ActionButtonRow>

      <AudioConfig />
    </Container>
  );
};

export default OwnProfilePage;
