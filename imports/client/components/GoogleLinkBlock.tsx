import { Google } from "meteor/google-oauth";
import type { Meteor } from "meteor/meteor";
import { OAuth } from "meteor/oauth";
import { useTracker } from "meteor/react-meteor-data";
import { ServiceConfiguration } from "meteor/service-configuration";
import { useCallback, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import FormText from "react-bootstrap/FormText";
import Flags from "../../Flags";
import linkUserGoogleAccount from "../../methods/linkUserGoogleAccount";
import unlinkUserGoogleAccount from "../../methods/unlinkUserGoogleAccount";

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
      {state.state === GoogleLinkBlockLinkState.ERROR ? (
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

export default GoogleLinkBlock;
