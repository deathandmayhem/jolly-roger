import { Google } from "meteor/google-oauth";
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
import InputGroup from "react-bootstrap/InputGroup";
import CopyToClipboard from "react-copy-to-clipboard";
import Flags from "../../Flags";
import { formatDiscordName } from "../../lib/discord";
import linkUserDiscordAccount from "../../methods/linkUserDiscordAccount";
import linkUserGoogleAccount from "../../methods/linkUserGoogleAccount";
import rollAPIKey from "../../methods/rollAPIKey";
import unlinkUserDiscordAccount from "../../methods/unlinkUserDiscordAccount";
import unlinkUserGoogleAccount from "../../methods/unlinkUserGoogleAccount";
import updateProfile from "../../methods/updateProfile";
import TeamName from "../TeamName";
import { requestDiscordCredential } from "../discord";
import ActionButtonRow from "./ActionButtonRow";
import AudioConfig from "./AudioConfig";
import Avatar from "./Avatar";
import { Form } from "react-bootstrap";
import LabelledRadioGroup from "./LabelledRadioGroup";

enum GoogleLinkBlockLinkState {
  IDLE = "idle",
  LINKING = "linking",
  ERROR = "error",
}

type GoogleLinkBlockState =
  | {
      state: GoogleLinkBlockLinkState.IDLE | GoogleLinkBlockLinkState.LINKING;
    }
  | {
      state: GoogleLinkBlockLinkState.ERROR;
      error: Error;
    };

const GoogleLinkBlock = ({ user }: { user: Meteor.User }) => {
  const [state, setState] = useState<GoogleLinkBlockState>({
    state: GoogleLinkBlockLinkState.IDLE,
  });

  const config = useTracker(
    () => ServiceConfiguration.configurations.findOne({ service: "google" }),
    [],
  );
  const googleDisabled = useTracker(() => Flags.active("disable.google"), []);

  const requestComplete = useCallback((token: string) => {
    const secret = OAuth._retrieveCredentialSecret(token);
    if (!secret) {
      setState({ state: GoogleLinkBlockLinkState.IDLE });
      return;
    }

    linkUserGoogleAccount.call({ key: token, secret }, (error) => {
      if (error) {
        setState({ state: GoogleLinkBlockLinkState.ERROR, error });
      } else {
        setState({ state: GoogleLinkBlockLinkState.IDLE });
      }
    });
  }, []);

  const onLink = useCallback(() => {
    setState({ state: GoogleLinkBlockLinkState.LINKING });
    Google.requestCredential(requestComplete);
  }, [requestComplete]);

  const onUnlink = useCallback(() => {
    unlinkUserGoogleAccount.call();
  }, []);

  const dismissAlert = useCallback(() => {
    setState({ state: GoogleLinkBlockLinkState.IDLE });
  }, []);

  const linkButton = () => {
    if (state.state === GoogleLinkBlockLinkState.LINKING) {
      return (
        <Button variant="primary" disabled>
          Linking...
        </Button>
      );
    }

    if (googleDisabled) {
      return (
        <Button variant="primary" disabled>
          Google integration currently disabled
        </Button>
      );
    }

    const text = user.googleAccount
      ? "Link a different Google account"
      : "Link your Google account";

    return (
      <Button variant="primary" onClick={onLink}>
        {text}
      </Button>
    );
  };

  if (!config) {
    return <div />;
  }

  return (
    <FormGroup className="mb-3">
      <FormLabel>Google Account</FormLabel>
      {state.state === "error" ? (
        <Alert variant="danger" dismissible onClose={dismissAlert}>
          Linking Google account failed: {state.error.message}
        </Alert>
      ) : undefined}
      <div>
        {user.googleAccount ? (
          <div>Currently linked to {user.googleAccount}</div>
        ) : undefined}
        {linkButton()}{" "}
        {user.googleAccount ? (
          <Button variant="danger" onClick={onUnlink}>
            Unlink
          </Button>
        ) : undefined}
      </div>
      <FormText>
        Linking your Google account isn&apos;t required, but this will let other
        people see who you are on puzzles&apos; Google Spreadsheet docs (instead
        of being an{" "}
        <a
          href="https://support.google.com/docs/answer/2494888?visit_id=1-636184745566842981-35709989&hl=en&rd=1"
          rel="noopener noreferrer"
          target="_blank"
        >
          anonymous animal
        </a>
        ), and we&apos;ll use it to give you access to our practice puzzles.
        (You can only have one Google account linked, so linking a new one will
        cause us to forget the old one).
      </FormText>
    </FormGroup>
  );
};

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

const OwnProfilePage = ({
  initialUser,
  initialAPIKey,
}: {
  initialUser: Meteor.User;
  initialAPIKey?: string;
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
  const [dingwordsOpenMatch, setDingwordsOpenMatch] = useState<boolean>(
    initialUser.dingwordsOpenMatch ?? false,
  );
  const [submitState, setSubmitState] = useState<OwnProfilePageSubmitState>(
    OwnProfilePageSubmitState.IDLE,
  );
  const [submitError, setSubmitError] = useState<string>("");
  const [showAPIKey, setShowAPIKey] = useState<boolean>(false);
  const [regeneratingAPIKey, setRegeneratingAPIKey] = useState<boolean>(false);
  const [APIKeyError, setAPIKeyError] = useState<string>();

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

  const handleDingwordsModeChange = useCallback((newMode: string) => {
    setDingwordsOpenMatch(newMode === "open");
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
      dingwordsOpenMatch,
    };
    updateProfile.call(newProfile, (error) => {
      if (error) {
        setSubmitError(error.message);
        setSubmitState(OwnProfilePageSubmitState.ERROR);
      } else {
        setSubmitState(OwnProfilePageSubmitState.SUCCESS);
      }
    });
  }, [dingwordsFlat, dingwordsOpenMatch, displayName, phoneNumber]);

  const dismissAlert = useCallback(() => {
    setSubmitState(OwnProfilePageSubmitState.IDLE);
  }, []);

  const toggleShowAPIKey = useCallback(() => {
    setShowAPIKey(!showAPIKey);
  }, [showAPIKey]);

  const regenerateAPIKey = useCallback(() => {
    setRegeneratingAPIKey(true);
    setAPIKeyError("");
    rollAPIKey.call({}, (error) => {
      if (error) {
        setAPIKeyError(error.message);
      } else {
        setAPIKeyError("");
      }
      setRegeneratingAPIKey(false);
    });
  }, []);

  const dismissAPIKeyAlert = useCallback(() => {
    setAPIKeyError("");
  }, []);

  const shouldDisableForm = submitState === "submitting";

  const linkGoogleAlert = !initialUser.googleAccount ? (
    <Alert variant="danger">
      Please link your Google account below for full functionality.
    </Alert>
  ) : null;

  const discordConfig = useTracker(
    () => ServiceConfiguration.configurations.findOne({ service: "discord" }),
    [],
  );
  const discordDisabled = useTracker(() => Flags.active("disable.discord"), []);

  const linkDiscordAlert =
    discordConfig && !discordDisabled && !initialUser.discordAccount ? (
      <Alert variant="danger">
        Please link your Discord account below for full functionality.
      </Alert>
    ) : null;

  return (
    <Container>
      {linkGoogleAlert}
      {linkDiscordAlert}
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

      <GoogleLinkBlock user={initialUser} />

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
          Dingwords (comma-separated)
        </FormLabel>
        <FormControl
          id="jr-profile-edit-dingwords"
          type="text"
          value={dingwordsFlat}
          disabled={shouldDisableForm}
          onChange={handleDingwordsChange}
          placeholder="e.g. cryptic, akari, REO Speedwagon lyrics"
        />
        <FormText>
          If anyone sends a chat message, or adds a tag, that contains one of
          your dingwords, you&apos;ll get a notification. Separate dingwords by
          commas. Spaces are allowed.
        </FormText>
      </FormGroup>

      <FormGroup className="mb-3">
        <FormLabel htmlFor="jr-profile-dingwords-open">
          Dingwords matching mode
        </FormLabel>
        <LabelledRadioGroup
          header=""
          name="jr-new-puzzle-doc-type"
          options={[
            {
              value: "exact",
              label: (
                <>
                  <strong>Match precisely:</strong> dingwords and -phrases must
                  match the typed text <em>exactly</em> in order to trigger an
                  alert.
                </>
              ),
            },
            {
              value: "open",
              label: (
                <>
                  <strong>Match start:</strong> dingwords and -phrases only need
                  to match the <em>start</em> of a typed word or phrase. For
                  example, the dingword <code>logic</code> would match "logic",
                  "logician", and "logical", but not "illogical".
                </>
              ),
            },
          ]}
          initialValue={dingwordsOpenMatch ? "open" : "exact"}
          help=""
          onChange={handleDingwordsModeChange}
        />
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

      <section className="advanced-section mt-3">
        <h2>Advanced</h2>
        <FormGroup className="mb-3">
          <FormLabel htmlFor="jr-profile-api-key">API key</FormLabel>
          <InputGroup>
            <FormControl
              id="jr-profile-api-key"
              type={showAPIKey ? "text" : "password"}
              readOnly
              disabled
              value={initialAPIKey}
            />
            <CopyToClipboard text={initialAPIKey ?? ""}>
              <Button variant="outline-secondary" disabled={regeneratingAPIKey}>
                Copy
              </Button>
            </CopyToClipboard>
            <Button
              variant="outline-secondary"
              onClick={toggleShowAPIKey}
              disabled={regeneratingAPIKey}
            >
              {showAPIKey ? "Hide" : "Show"}
            </Button>
            <Button
              variant="outline-secondary"
              onClick={regenerateAPIKey}
              disabled={regeneratingAPIKey}
            >
              {regeneratingAPIKey || (initialAPIKey?.length ?? 0) > 0
                ? "Regenerate"
                : "Generate"}
            </Button>
          </InputGroup>
          <FormText>
            Authorization credential used to make API calls. Keep this secret!
          </FormText>
          {APIKeyError ? (
            <Alert variant="danger" dismissible onClose={dismissAPIKeyAlert}>
              Key generation failed: {APIKeyError}
            </Alert>
          ) : null}
        </FormGroup>
      </section>
    </Container>
  );
};

export default OwnProfilePage;
