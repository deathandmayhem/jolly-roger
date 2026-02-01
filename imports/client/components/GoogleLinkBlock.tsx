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
import { Trans, useTranslation } from "react-i18next";
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
      ? t("profile.google.linkDifferent", "Link a different Google account")
      : t("profile.google.link", "Link your Google account");

    return (
      <Button variant="primary" onClick={onLink}>
        {text}
      </Button>
    );
  };

  const { t } = useTranslation();

  if (!config) {
    return <div />;
  }

  return (
    <FormGroup className="mb-3">
      <FormLabel>{t("profile.google.account", "Google Account")}</FormLabel>
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
            {t("profile.google.unlink")}
          </Button>
        ) : undefined}
      </div>
      <FormText>
        <Trans
          i18nKey="profile.google.help"
          t={t}
          defaults={`Linking your Google account isn't required, but this will
                    let other  people see who you are on puzzles' Google
                    Spreadsheet docs (instead of being an
                    <anonymousLink>anonymous animal</anonymousLink>), and we'll
                    use it to give you access to our practice puzzles. (You can
                    only have one Google account linked, so linking a new one
                    will cause us to forget the old one).`}
          components={{
            anonymousLink: (
              // biome-ignore lint/a11y/useAnchorContent: this link won't really be empty
              <a
                href="https://support.google.com/docs/answer/2494888?visit_id=1-636184745566842981-35709989&hl=en&rd=1"
                rel="noopener noreferrer"
                target="_blank"
              />
            ),
          }}
        />
      </FormText>
    </FormGroup>
  );
};

export default GoogleLinkBlock;
