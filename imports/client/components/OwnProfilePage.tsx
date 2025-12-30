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
import LabelledRadioGroup from "./LabelledRadioGroup";

enum DiscordLinkBlockLinkState {
  IDLE = "idle",
  LINKING = "linking",
  ERROR = "error",
}

type DiscordLinkBlockState =
  | {
      state: DiscordLinkBlockLinkState.IDLE | DiscordLinkBlockLinkState.LINKING;
    }
  | { state: DiscordLinkBlockLinkState.ERROR; error: Error };

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
        <h3>API Keys</h3>
        <Button disabled={disabled} onClick={createKey}>
          + Create API key
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
      <p>Authorization credentials used to make API calls. Keep them secret!</p>
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
  const [dingwordsMatchOnceFlat, setDingwordsMatchOnceFlat] = useState<string>(
    initialUser.dingwordsMatchOnce
      ? initialUser.dingwordsMatchOnce.join(",")
      : "",
  );
  const [dingwordsOpenMatch, setDingwordsOpenMatch] = useState<boolean>(
    initialUser.dingwordsOpenMatch ?? false,
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

  const handleDingwordsOnceChange: NonNullable<FormControlProps["onChange"]> =
    useCallback((e) => {
      setDingwordsMatchOnceFlat(e.currentTarget.value);
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
    const dingwordsMatchOnce = dingwordsMatchOnceFlat
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
      dingwordsMatchOnce,
    };
    updateProfile.call(newProfile, (error) => {
      if (error) {
        setSubmitError(error.message);
        setSubmitState(OwnProfilePageSubmitState.ERROR);
      } else {
        setSubmitState(OwnProfilePageSubmitState.SUCCESS);
      }
    });
  }, [
    dingwordsFlat,
    dingwordsMatchOnceFlat,
    dingwordsOpenMatch,
    displayName,
    phoneNumber,
  ]);

  const dismissAlert = useCallback(() => {
    setSubmitState(OwnProfilePageSubmitState.IDLE);
  }, []);

  const shouldDisableForm =
    submitState === OwnProfilePageSubmitState.SUBMITTING;

  const idPrefix = useId();

  return (
    <Container>
      <h1>Account information</h1>
      <Avatar {...initialUser} size={64} />
      <FormGroup className="mb-3" controlId={`${idPrefix}-email`}>
        <FormLabel>Email address</FormLabel>
        <FormControl
          type="text"
          value={initialUser.emails![0]!.address}
          disabled
        />
      </FormGroup>

      <GoogleLinkBlock user={initialUser} />

      <DiscordLinkBlock user={initialUser} />

      <FormGroup className="mb-3" controlId={`${idPrefix}-display-name`}>
        <FormLabel>Display name</FormLabel>
        <FormControl
          type="text"
          value={displayName}
          disabled={shouldDisableForm}
          onChange={handleDisplayNameFieldChange}
        />
        <FormText>We suggest your full name, to avoid ambiguity.</FormText>
      </FormGroup>

      <FormGroup className="mb-3" controlId={`${idPrefix}-phone`}>
        <FormLabel>Phone number (optional)</FormLabel>
        <FormControl
          type="text"
          value={phoneNumber}
          disabled={shouldDisableForm}
          onChange={handlePhoneNumberFieldChange}
        />
        <FormText>In case we need to reach you via phone.</FormText>
      </FormGroup>

      <FormGroup className="mb-3" controlId={`${idPrefix}-dingwords`}>
        <FormLabel htmlFor="jr-profile-edit-dingwords">
          Dingwords (comma-separated)
        </FormLabel>
        <FormControl
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

      <FormGroup
        className="mb-3"
        controlId={`${idPrefix}-dingwords-match-once`}
      >
        <FormLabel htmlFor={`${idPrefix}-dingwords-match-once`}>
          Dingwords <strong>once per puzzle</strong> (comma-separated)
        </FormLabel>
        <FormControl
          type="text"
          value={dingwordsMatchOnceFlat}
          disabled={shouldDisableForm}
          onChange={handleDingwordsOnceChange}
          placeholder="e.g. cryptic, akari, REO Speedwagon lyrics"
        />
        <FormText>
          This works the same as the above, but you will be notified at most
          once per puzzle for each word.
        </FormText>
      </FormGroup>

      <FormGroup className="mb-3" controlId={`${idPrefix}-dingwords-open`}>
        <FormLabel htmlFor={`${idPrefix}-dingwords-open`}>
          Dingwords matching mode
        </FormLabel>
        <LabelledRadioGroup
          header=""
          name={`${idPrefix}-dingwords-open`}
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
                  example, the dingword <code>logic</code> would match
                  &quot;logic&quot;, &quot;logician&quot;, and
                  &quot;logical&quot;, but not &quot;illogical&quot;.
                </>
              ),
            },
          ]}
          initialValue={dingwordsOpenMatch ? "open" : "exact"}
          help=""
          onChange={handleDingwordsModeChange}
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

      <section className="mt-3">
        <h2>Advanced</h2>
        <APIKeysSection apiKeys={apiKeys} />
      </section>
    </Container>
  );
};

export default OwnProfilePage;
