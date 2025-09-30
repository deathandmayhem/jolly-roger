import { Accounts } from "meteor/accounts-base";
import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import type { FormEvent } from "react";
import React, { useCallback, useEffect, useState } from "react";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { LoginOptions } from "../../lib/loginOptions";
import Hunts from "../../lib/models/Hunts";
import InvitationCodes from "../../lib/models/InvitationCodes";
import huntForInvitationCode from "../../lib/publications/huntForInvitationCode";
import acceptHuntInvitationCode from "../../methods/acceptHuntInvitationCode";
import userLoginOptions from "../../methods/userLoginOptions";
import useTeamName from "../hooks/useTeamName";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import {
  AccountFormFrame,
  AccountFormSubmitState,
  useEmailField,
  usePasswordField,
  useGoogleSignInCredentialsField,
} from "./AccountFormHelpers";
import SplashPage from "./SplashPage";
import { useAuthenticated } from "./authentication";

type LoginOptionsResult = { exists: boolean; loginMethods?: string[] };

// This page handles what to do when we are presented with an invitation code.
// If the user is logged out, we'll prompt them to either log in or create an
// account (depending on the account status of the email address they provide).
// If the user is logged in and not yet part of the hunt, we'll present them
// with a big clickable button to join the hunt.
// If they're already in the hunt, we'll just redirect them to the hunt page.
const JoinHunt = () => {
  const [authLoading, loggedIn] = useAuthenticated();

  const { teamName: teamNameFromHook, teamNameLoading } = useTeamName();
  const teamName = teamNameLoading() ? "(loading team name)" : teamNameFromHook;

  const invitationCode = useParams<"invitationCode">().invitationCode!;
  const huntLoadingFunc = useTypedSubscribe(huntForInvitationCode, {
    invitationCode,
  });
  const huntLoading = huntLoadingFunc();
  const hunt = useTracker(() => {
    if (huntLoading) return undefined;
    const code = InvitationCodes.findOne({ code: invitationCode });
    return code ? Hunts.findOne({ _id: code.hunt }) : undefined;
  }, [huntLoading, invitationCode]);
  const huntId = hunt?._id;
  const huntName = hunt?.name ?? "(loading name)";

  const user = useTracker(() => {
    return Meteor.user();
  }, []);
  const ownHunts = user?.hunts ?? [];
  const isAlreadyInHunt = hunt && ownHunts.includes(hunt._id);

  const [submitState, setSubmitState] = useState<AccountFormSubmitState>(
    AccountFormSubmitState.IDLE,
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  );
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [infoMessage, setInfoMessage] = useState<string | undefined>(undefined);

  const navigate = useNavigate();

  const onAcceptInvitation = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (submitState !== AccountFormSubmitState.SUBMITTING) {
        setSubmitState(AccountFormSubmitState.SUBMITTING);
        // Accept the invitation and redirect to the hunt page on success.
        acceptHuntInvitationCode.call(
          { invitationCode },
          (err, acceptedHuntId) => {
            if (err) {
              setErrorMessage(err.reason ?? "Unknown error");
              setSubmitState(AccountFormSubmitState.FAILED);
            } else {
              navigate(`/hunts/${acceptedHuntId}`);
            }
          },
        );
      }
    },
    [submitState, invitationCode, navigate],
  );

  const [loginOptionsResult, setLoginOptionsResult] = useState<
    LoginOptionsResult | undefined
  >(undefined);

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- we actually want to test the chained booleans
  const loading = authLoading || huntLoading;

  const onGoogleLoginCompleted = useCallback(
    ({ token, secret }: { token: string; secret: string }) => {
      const loginRequest: LoginOptions = {
        isJrLogin: true,
        googleCredentials: {
          key: token,
          secret,
        },
        allowAutoProvision: {
          huntInvitationCode: invitationCode,
        },
      };
      setInfoMessage(undefined);
      setErrorMessage(undefined);
      setSuccessMessage("Logging in with Google...");
      setSubmitState(AccountFormSubmitState.SUBMITTING);
      Accounts.callLoginMethod({
        methodArguments: [loginRequest],
        userCallback: (error?: Error) => {
          if (error) {
            setSubmitState(AccountFormSubmitState.FAILED);
            setErrorMessage(
              error instanceof Meteor.Error ? error.reason : error.message,
            );
          } else {
            setSubmitState(AccountFormSubmitState.IDLE);
            setInfoMessage(undefined);
          }
        },
      });
    },
    [invitationCode],
  );

  const {
    googleAvailable,
    googleSignInCredentials,
    googleSignInCredentialsField,
    googleSignInSubmitState,
  } = useGoogleSignInCredentialsField({
    disabled: submitState === AccountFormSubmitState.SUBMITTING,
    onCredentialsSet: onGoogleLoginCompleted,
  });
  const submitting =
    submitState === AccountFormSubmitState.SUBMITTING ||
    googleSignInSubmitState === AccountFormSubmitState.SUBMITTING;

  const { email, emailField } = useEmailField({
    disabled: submitting || loginOptionsResult !== undefined,
  });
  const trimmedEmail = email.trim();
  const { password, passwordField } = usePasswordField({
    disabled: submitting,
  });
  const fetchLoginOptions = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (submitState !== AccountFormSubmitState.SUBMITTING) {
        setSubmitState(AccountFormSubmitState.SUBMITTING);
        userLoginOptions.call(
          { email: trimmedEmail, invitationCode },
          (error, loginOptions) => {
            if (error !== undefined) {
              setErrorMessage(error.reason);
              setSubmitState(AccountFormSubmitState.FAILED);
            } else {
              setLoginOptionsResult(loginOptions);
              if (loginOptions) {
                if (!loginOptions.exists) {
                  setInfoMessage(
                    `Sending account creation email to ${trimmedEmail}...`,
                  );

                  // No user exists with the specified email.  Request an invitation to that email, using the invitationCode.
                  acceptHuntInvitationCode.call(
                    {
                      invitationCode,
                      email: trimmedEmail,
                    },
                    (err, _unusedHuntId) => {
                      setInfoMessage(undefined);
                      if (err) {
                        setSubmitState(AccountFormSubmitState.FAILED);
                        setErrorMessage(err.reason);
                      } else {
                        setSuccessMessage(
                          `Sent account creation email to ${trimmedEmail}.  Check your inbox!`,
                        );
                        setSubmitState(AccountFormSubmitState.SUCCESS);
                      }
                    },
                  );
                } else {
                  // user object exists.  Let's guide them to getting into their account.
                  setSubmitState(AccountFormSubmitState.IDLE);
                  if (loginOptions.loginMethods?.length === 0) {
                    // If they have no valid login methods, they can only make progress with a password reset.
                    setInfoMessage(
                      `Account ${trimmedEmail} needs its password reset.  Requesting password reset...`,
                    );
                    void Accounts.forgotPassword(
                      { email: trimmedEmail },
                      (innerError?: Error) => {
                        setInfoMessage(undefined);
                        if (innerError) {
                          setErrorMessage(
                            innerError instanceof Meteor.Error
                              ? innerError.reason
                              : innerError.message,
                          );
                          setSubmitState(AccountFormSubmitState.FAILED);
                        } else {
                          setSubmitState(AccountFormSubmitState.SUCCESS);
                          setSuccessMessage(
                            `Account has no password set.  Sent password reset email to ${trimmedEmail}.`,
                          );
                        }
                      },
                    );
                  }
                  if (
                    loginOptions.loginMethods?.length === 1 &&
                    loginOptions.loginMethods?.includes("password")
                  ) {
                    // If they have a valid password, they can try signing in with it.
                    setInfoMessage(`Please sign in with your password`);
                  } else if (
                    loginOptions.loginMethods?.includes("google") &&
                    googleAvailable
                  ) {
                    setInfoMessage(`Please sign in with your Google account`);
                  } else {
                    setInfoMessage(`Please sign in`);
                  }
                }
              }
            }
          },
        );
      }
    },
    [invitationCode, submitState, trimmedEmail, googleAvailable],
  );

  const attemptLogin = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setInfoMessage(undefined);
      setSubmitState(AccountFormSubmitState.SUBMITTING);
      Meteor.loginWithPassword(trimmedEmail, password, (error?: Error) => {
        if (error) {
          setErrorMessage(
            error instanceof Meteor.Error ? error.reason : error.message,
          );
          setSubmitState(AccountFormSubmitState.FAILED);
        } else {
          setSuccessMessage("Logged in successfully.");
          setSubmitState(AccountFormSubmitState.SUCCESS);
        }
      });
    },
    [trimmedEmail, password],
  );

  useEffect(() => {
    // If we're done loading, and we're logged in, and the Hunt the
    // InvitationCode is for is already in our user's hunt list, just navigate
    // to the hunt page.
    if (loggedIn && isAlreadyInHunt) {
      navigate(`/hunts/${huntId}`);
    }
  }, [loggedIn, isAlreadyInHunt, navigate, huntId]);

  // If we're not done loading, display a loading page.
  if (loading) {
    return <SplashPage>loading...</SplashPage>;
  }

  // If we're done loading, but we didn't get an InvitationCode or Hunt matching the URL, flag that this link must be wrong.
  if (!hunt) {
    return (
      <SplashPage>
        The invitation code in this link isn&apos;t valid. Check your URL?
      </SplashPage>
    );
  }

  if (isAlreadyInHunt) {
    return (
      <SplashPage>
        Already a member of this hunt; redirecting to hunt page...
      </SplashPage>
    );
  }

  // If we're done loading, and logged in, but we're not a member of the Hunt,
  // display some text about the hunt and give a big primary button to make the
  // call to join the hunt.
  if (user) {
    return (
      <SplashPage>
        <AccountFormFrame
          title={`You are invited to join ${teamName} for ${huntName}`}
          state={submitState}
          onSubmitForm={onAcceptInvitation}
          errorMessage={errorMessage}
          successMessage={successMessage}
          infoMessage={infoMessage}
        >
          <p>
            Signed in as{" "}
            <Link to={`/users/${user._id}`}>{user.displayName}</Link>
          </p>
          <div className="d-grid gap-2">
            <Button disabled={submitting} variant="primary" type="submit">
              Join hunt
            </Button>
          </div>
        </AccountFormFrame>
      </SplashPage>
    );
  } else if (
    loginOptionsResult === undefined ||
    !loginOptionsResult.exists ||
    loginOptionsResult.loginMethods?.length === 0
  ) {
    // Render the option of entering an email or (if enabled) Google login.
    const credentialSection = googleSignInCredentials ? (
      <Row className="mb-3">Using Google account</Row>
    ) : (
      <Row className="mb-3 align-items-center justify-content-center">
        <Col>{emailField}</Col>
        {googleAvailable ? (
          <>
            <Col md="auto">or</Col>
            <Col>
              <Form.Group>{googleSignInCredentialsField}</Form.Group>
            </Col>
          </>
        ) : undefined}
      </Row>
    );
    const formIsValid = email.length > 0;
    return (
      <SplashPage>
        <AccountFormFrame
          title={`You are invited to join ${teamName} for ${huntName}`}
          state={submitState}
          onSubmitForm={fetchLoginOptions}
          errorMessage={errorMessage}
          successMessage={successMessage}
          infoMessage={infoMessage}
        >
          {credentialSection}
          <div className="d-grid gap-2">
            <Button
              size="lg"
              variant={formIsValid ? "primary" : "secondary"}
              type="submit"
              disabled={submitting || !formIsValid}
            >
              Register
            </Button>
          </div>
        </AccountFormFrame>
      </SplashPage>
    );
  } else {
    // The account exists.  We should show UI depending on the supported login methods.
    const methods = loginOptionsResult.loginMethods ?? [];
    const columns = [];
    // if password available, show email (locked in) & password fields and "login" button
    if (methods.includes("password")) {
      const formIsValid = password.length > 0;
      columns.push(
        <Col key="email">
          {emailField}
          {passwordField}
          <div className="d-grid gap-2">
            <Button
              size="lg"
              variant={formIsValid ? "primary" : "secondary"}
              type="submit"
              disabled={submitting || !formIsValid}
            >
              Log in
            </Button>
          </div>
        </Col>,
      );
    }
    // if google available, show google button
    if (methods.includes("google")) {
      const googleSection = googleAvailable ? (
        googleSignInCredentialsField
      ) : (
        <div key="google-disabled">
          Google account linked but server admin has disabled Google login.
        </div>
      );
      if (columns.length > 0) {
        columns.push(
          <Col key="separator" md="auto">
            or
          </Col>,
        );
      }
      columns.push(googleSection);
    }

    // if neither available, show note about password reset flow
    if (columns.length === 0) {
      columns.push(
        <div>
          {trimmedEmail} cannot register for {huntName} until a password is set.
          You can request a password reset{" "}
          <Link to="/forgot-password" state={{ email: trimmedEmail }}>
            here
          </Link>
          .
        </div>,
      );
    }

    return (
      <SplashPage>
        <AccountFormFrame
          title={`Log in to join hunt ${huntName}`}
          state={submitState}
          onSubmitForm={attemptLogin}
          successMessage={successMessage}
          errorMessage={errorMessage}
          infoMessage={infoMessage}
        >
          <Row className="mb-3 align-items-center justify-content-center">
            {columns}
          </Row>
        </AccountFormFrame>
      </SplashPage>
    );
  }
};

export default JoinHunt;
