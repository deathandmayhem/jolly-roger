/* eslint-disable react/destructuring-assignment */
import { Accounts } from "meteor/accounts-base";
import { Google } from "meteor/google-oauth";
import { Meteor } from "meteor/meteor";
import { OAuth } from "meteor/oauth";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import { ServiceConfiguration } from "meteor/service-configuration";
import React, {
  type ComponentPropsWithRef,
  type FC,
  useCallback,
  useState,
} from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import styled from "styled-components";
import Flags from "../../Flags";
import type { LoginOptions } from "../../lib/loginOptions";
import updateProfile from "../../methods/updateProfile";
import TeamName from "../TeamName";

export enum AccountFormFormat {
  LOGIN = "login",
  REQUEST_PW_RESET = "requestPwReset",
  ENROLL = "enroll",
  RESET_PWD = "resetPwd",
  INVITATION_WELCOME = "invitationWelcome",
}

// Styles originally taken from https://git.io/vupVU

const StyledForm = styled.div`
  float: none;
  margin: auto;
  overflow: auto;
  margin-top: 20px;
  margin-bottom: 20px;
  border-radius: 10px;
  padding: 15px;
`;

const StyledTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 18px;
  font-weight: 800;
  text-align: center;
`;

const StyledModeSwitchLink = styled.div`
  margin-top: 20px;
  margin-bottom: 30px;
  text-align: center;
`;

const NoPaddingLinkButton: FC<ComponentPropsWithRef<typeof Button>> = styled(
  Button,
)`
  padding: 0;
  vertical-align: baseline;
`;

const GoogleSignInButton: FC<ComponentPropsWithRef<typeof Button>> = styled(
  Button,
)`
  background-image: url("/google-signin.svg");
  width: 175px;
  height: 40px;
`;

type SignInWithGoogleButtonProperties = {
  submitting: boolean;
  onStarted: () => void;
  onSucceeded: (token: string, secret: string) => void;
  onCanceled: () => void;
};

const SignInWithGoogleButton = (props: SignInWithGoogleButtonProperties) => {
  const config = useTracker(
    () => ServiceConfiguration.configurations.findOne({ service: "google" }),
    [],
  );
  const googleDisabled = useTracker(() => Flags.active("disable.google"), []);

  const requestComplete = useCallback(
    (token: string) => {
      const secret = OAuth._retrieveCredentialSecret(token);
      if (!secret) {
        props.onCanceled();
        return;
      }
      props.onSucceeded(token, secret);
    },
    [props],
  );

  const trySignInWithGoogle = useCallback(() => {
    props.onStarted();
    Google.requestCredential(requestComplete);
  }, [props, requestComplete]);

  if (!config || googleDisabled) {
    return null;
  }
  return (
    <GoogleSignInButton
      variant="outline-secondary"
      onClick={trySignInWithGoogle}
      disabled={props.submitting}
    />
  );
};

export enum InvitationEnrollmentMode {
  NEW_USER = "newUser",
  EXISTING_USER = "existingUser",
}

type AccountFormProps =
  | {
      format: AccountFormFormat.LOGIN | AccountFormFormat.REQUEST_PW_RESET;
      onFormatChange: () => void;
    }
  | {
      format: AccountFormFormat.RESET_PWD;
      token: string;
    }
  | {
      format: AccountFormFormat.ENROLL;
      // One of token or huntInvitationCode must be present.
      token?: string;
      huntInvitationCode?: string;
    }
  | {
      format: AccountFormFormat.INVITATION_WELCOME;
      huntInvitationCode: string;
      onModeSelected: (mode: InvitationEnrollmentMode) => void;
    };

enum AccountFormSubmitState {
  IDLE = "idle",
  SUBMITTING = "submitting",
  FAILED = "failed",
  SUCCESS = "success",
}

type GoogleSignInCredentials = {
  token: string;
  secret: string;
};

const AccountForm = (props: AccountFormProps) => {
  const loading = useSubscribe("teamName");
  const teamName = useTracker(() => {
    return TeamName.findOne("teamName")?.name ?? "Default Team Name";
  }, []);

  const [submitState, setSubmitState] = useState<AccountFormSubmitState>(
    AccountFormSubmitState.IDLE,
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  );
  const [successMessage, setSuccessMessage] = useState<string | undefined>(
    undefined,
  );
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [googleSignInCredentials, setGoogleSignInCredentials] = useState<
    GoogleSignInCredentials | undefined
  >(undefined);

  const setEmailCallback = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.currentTarget.value);
    },
    [],
  );
  const setPasswordCallback = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.currentTarget.value);
    },
    [],
  );
  const setDisplayNameCallback = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDisplayName(e.currentTarget.value);
    },
    [],
  );
  const setPhoneNumberCallback = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPhoneNumber(e.currentTarget.value);
    },
    [],
  );
  const toggleWantPasswordReset = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (
        props.format === AccountFormFormat.LOGIN ||
        props.format === AccountFormFormat.REQUEST_PW_RESET
      ) {
        props.onFormatChange();
      }
    },
    [props],
  );
  const onInvitationNewUserSelected = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (props.format === AccountFormFormat.INVITATION_WELCOME) {
        props.onModeSelected(InvitationEnrollmentMode.NEW_USER);
      }
    },
    [props],
  );
  const onInvitationExistingUserSelected = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (props.format === AccountFormFormat.INVITATION_WELCOME) {
        props.onModeSelected(InvitationEnrollmentMode.EXISTING_USER);
      }
    },
    [props],
  );

  const tryLogin = useCallback(() => {
    setSubmitState(AccountFormSubmitState.SUBMITTING);
    Meteor.loginWithPassword(email, password, (error?: Error) => {
      if (error) {
        setSubmitState(AccountFormSubmitState.FAILED);
        setErrorMessage(
          error instanceof Meteor.Error ? error.reason : error.message,
        );
      } else {
        setSubmitState(AccountFormSubmitState.SUCCESS);
        setSuccessMessage("Logged in successfully.");
      }
    });
  }, [email, password]);

  const tryPasswordReset = useCallback(() => {
    setSubmitState(AccountFormSubmitState.SUBMITTING);
    void Accounts.forgotPassword({ email }, (error?: Error) => {
      if (error) {
        setSubmitState(AccountFormSubmitState.FAILED);
        setErrorMessage(
          error instanceof Meteor.Error ? error.reason : error.message,
        );
      } else {
        setSubmitState(AccountFormSubmitState.SUCCESS);
        setSuccessMessage("Password reset email sent.");
      }
    });
  }, [email]);

  const tryCompletePasswordReset = useCallback(
    (token: string) => {
      setSubmitState(AccountFormSubmitState.SUBMITTING);
      void Accounts.resetPassword(token, password, (error?: Error) => {
        if (error) {
          setSubmitState(AccountFormSubmitState.FAILED);
          setErrorMessage(
            error instanceof Meteor.Error ? error.reason : error.message,
          );
        } else {
          setSubmitState(AccountFormSubmitState.SUCCESS);
          setSuccessMessage("Password reset successfully");
        }
      });
    },
    [password],
  );

  const tryEnroll = useCallback(
    (token?: string, huntInvitationCode?: string) => {
      // E-mail is required for users joining via a hunt invitation URL who aren't using their
      // Google sign-in credentials.
      const trimmedEmail = email.trim();
      if (
        huntInvitationCode &&
        googleSignInCredentials === undefined &&
        trimmedEmail === ""
      ) {
        setSubmitState(AccountFormSubmitState.FAILED);
        setErrorMessage("Email cannot be blank.");
        return;
      }

      const trimmedDisplayName = displayName.trim();
      if (trimmedDisplayName === "") {
        setSubmitState(AccountFormSubmitState.FAILED);
        setErrorMessage("Display name cannot be blank.");
        return;
      }

      const onEnrollComplete = (error?: Error) => {
        if (error) {
          setSubmitState(AccountFormSubmitState.FAILED);
          setErrorMessage(
            error instanceof Meteor.Error ? error.reason : error.message,
          );
        } else {
          const newProfile = {
            displayName: trimmedDisplayName,
            phoneNumber: phoneNumber !== "" ? phoneNumber : undefined,
            dingwords: [],
          };
          updateProfile.call(newProfile, (innerError?: Error) => {
            if (innerError) {
              // This user will have to set their profile manually later.  Oh well.
              setSubmitState(AccountFormSubmitState.FAILED);
              setErrorMessage(
                innerError instanceof Meteor.Error
                  ? innerError.reason
                  : innerError.message,
              );
            } else {
              setSubmitState(AccountFormSubmitState.SUCCESS);
              setSuccessMessage("Created account successfully");
            }
          });
        }
      };

      setSubmitState(AccountFormSubmitState.SUBMITTING);

      if (token) {
        // Direct e-mail invitation flow; the user already exists but has no password. Call the
        // forgotten password flow to set one.
        void Accounts.resetPassword(token, password, onEnrollComplete);
      } else if (huntInvitationCode) {
        // Hunt invitation URL flow. Call our custom login flow (see Accounts.registerLoginHandler
        // in imports/server/accounts.ts), which will validate the invitation code, create the new
        // user, and sign in as that user.
        const loginRequest: LoginOptions = {
          isJrLogin: true,
          ...(googleSignInCredentials && {
            googleCredentials: {
              key: googleSignInCredentials.token,
              secret: googleSignInCredentials.secret,
            },
          }),
          newUserRequest: {
            huntInvitationCode,
            ...(!googleSignInCredentials && {
              passwordCredentials: {
                email: trimmedEmail,
                passwordHash: Accounts._hashPassword(password),
              },
            }),
          },
        };
        Accounts.callLoginMethod({
          methodArguments: [loginRequest],
          userCallback: onEnrollComplete,
        });
      }
    },
    [email, displayName, phoneNumber, password, googleSignInCredentials],
  );

  const submitFormCallback = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      switch (props.format) {
        case AccountFormFormat.LOGIN:
          tryLogin();
          break;
        case AccountFormFormat.REQUEST_PW_RESET:
          tryPasswordReset();
          break;
        case AccountFormFormat.ENROLL:
          tryEnroll(props.token, props.huntInvitationCode);
          break;
        case AccountFormFormat.RESET_PWD:
          tryCompletePasswordReset(props.token);
          break;
        default:
      }
    },
    [tryLogin, tryPasswordReset, tryEnroll, tryCompletePasswordReset, props],
  );

  const onGoogleSignInStarted = useCallback(() => {
    setSubmitState(AccountFormSubmitState.SUBMITTING);
  }, []);

  const onGoogleSignInCanceled = useCallback(() => {
    setSubmitState(AccountFormSubmitState.IDLE);
  }, []);

  const onEnrollGoogleSignInSucceeded = useCallback(
    (token: string, secret: string) => {
      setSubmitState(AccountFormSubmitState.IDLE);
      setGoogleSignInCredentials({
        token,
        secret,
      });
    },
    [],
  );

  const onLoginGoogleSignInSucceeded = useCallback(
    (token: string, secret: string) => {
      const loginRequest: LoginOptions = {
        // Set this to true to trigger our custom Google signin hook.
        isJrLogin: true,
        googleCredentials: {
          key: token,
          secret,
        },
      };

      Accounts.callLoginMethod({
        methodArguments: [loginRequest],
        userCallback: (error?: Error) => {
          if (error) {
            setSubmitState(AccountFormSubmitState.FAILED);
            setErrorMessage(
              error instanceof Meteor.Error ? error.reason : error.message,
            );
          } else {
            setSubmitState(AccountFormSubmitState.SUCCESS);
            setSuccessMessage("Logged in successfully.");
          }
        },
      });
    },
    [],
  );

  if (loading()) {
    return <div>loading...</div>;
  }

  // I'm mimicking the DOM used by AccountTemplates for this form so I can reuse their CSS.  It
  // would probably be good to refactor this to use ReactBootstrap/additional styles directly and
  // drop AccountTemplates entirely.
  const submitting = submitState === AccountFormSubmitState.SUBMITTING;
  const title = {
    [AccountFormFormat.LOGIN]: `Jolly Roger: ${teamName} Virtual HQ`,
    [AccountFormFormat.ENROLL]: "Create an Account",
    [AccountFormFormat.REQUEST_PW_RESET]: "Reset your password",
    [AccountFormFormat.RESET_PWD]: "Reset your password",
    [AccountFormFormat.INVITATION_WELCOME]: `You have been invited to a hunt with ${teamName}`,
  }[props.format];

  const buttonText = {
    [AccountFormFormat.LOGIN]: "Sign In",
    [AccountFormFormat.ENROLL]: "Register",
    [AccountFormFormat.REQUEST_PW_RESET]: "Email Reset Link",
    [AccountFormFormat.RESET_PWD]: "Set Password",
    [AccountFormFormat.INVITATION_WELCOME]: undefined,
  }[props.format];

  const emailInput = (
    <Form.Group className="mb-3" controlId="at-field-email">
      <Form.Label>Email</Form.Label>
      <Form.Control
        type="email"
        placeholder="Email"
        autoCapitalize="none"
        autoCorrect="off"
        onChange={setEmailCallback}
        disabled={submitting}
      />
    </Form.Group>
  );
  const pwInput = (
    <Form.Group className="mb-3" controlId="at-field-password">
      <Form.Label>Password</Form.Label>
      <Form.Control
        type="password"
        placeholder="Password"
        autoCapitalize="none"
        autoCorrect="off"
        onChange={setPasswordCallback}
        disabled={submitting}
      />
    </Form.Group>
  );

  const enrollmentFields = [
    <Form.Group className="mb-3" controlId="at-field-displayname">
      <Form.Label>Full name</Form.Label>
      <Form.Control
        type="text"
        placeholder="Ben Bitdiddle"
        autoCapitalize="none"
        autoCorrect="off"
        onChange={setDisplayNameCallback}
        disabled={submitting}
      />
      <Form.Text>For use in chat</Form.Text>
    </Form.Group>,
    <Form.Group className="mb-3" controlId="at-field-phonenumber">
      <Form.Label>Phone Number</Form.Label>
      <Form.Control
        type="tel"
        placeholder="+16173244699"
        onChange={setPhoneNumberCallback}
        disabled={submitting}
      />
      <Form.Text>
        Optional, but helpful if HQ needs to reach you while you&apos;re on a
        runaround or at an event puzzle.
      </Form.Text>
    </Form.Group>,
  ];
  const pwResetOptionComponent =
    props.format === AccountFormFormat.LOGIN ? (
      <div>
        <p>
          <NoPaddingLinkButton variant="link" onClick={toggleWantPasswordReset}>
            Forgot your password?
          </NoPaddingLinkButton>
        </p>
      </div>
    ) : null;
  const backToMainForm =
    props.format === AccountFormFormat.REQUEST_PW_RESET ? (
      <StyledModeSwitchLink>
        <p>
          If you already have an account,{" "}
          <NoPaddingLinkButton variant="link" onClick={toggleWantPasswordReset}>
            sign in
          </NoPaddingLinkButton>
        </p>
      </StyledModeSwitchLink>
    ) : null;
  return (
    <StyledForm>
      <StyledTitle>{title}</StyledTitle>
      <div>
        <form noValidate action="#" method="POST" onSubmit={submitFormCallback}>
          <fieldset>
            {submitState === AccountFormSubmitState.FAILED ? (
              <Alert variant="danger">{errorMessage}</Alert>
            ) : null}
            {submitState === AccountFormSubmitState.SUCCESS &&
            successMessage ? (
              <Alert variant="success">{successMessage}</Alert>
            ) : null}
            {props.format === AccountFormFormat.INVITATION_WELCOME ? (
              <div>
                <p>
                  <b>New user?</b>{" "}
                  <NoPaddingLinkButton
                    variant="link"
                    onClick={onInvitationNewUserSelected}
                  >
                    Create an account
                  </NoPaddingLinkButton>
                  .
                </p>
                <p>
                  <b>Existing user?</b>{" "}
                  <NoPaddingLinkButton
                    variant="link"
                    onClick={onInvitationExistingUserSelected}
                  >
                    Sign in
                  </NoPaddingLinkButton>
                  .
                </p>
              </div>
            ) : null}
            {props.format === AccountFormFormat.LOGIN ||
            props.format === AccountFormFormat.REQUEST_PW_RESET ||
            (props.format === AccountFormFormat.ENROLL &&
              props.huntInvitationCode &&
              googleSignInCredentials === undefined)
              ? emailInput
              : null}
            {props.format === AccountFormFormat.LOGIN ||
            (props.format === AccountFormFormat.ENROLL &&
              googleSignInCredentials === undefined) ||
            props.format === AccountFormFormat.RESET_PWD
              ? pwInput
              : null}
            {props.format === AccountFormFormat.ENROLL &&
            googleSignInCredentials === undefined ? (
              <div className="d-grid gap-2 mt-3 justify-content-center">
                <div>
                  or{" "}
                  <SignInWithGoogleButton
                    submitting={submitting}
                    onStarted={onGoogleSignInStarted}
                    onSucceeded={onEnrollGoogleSignInSucceeded}
                    onCanceled={onGoogleSignInCanceled}
                  />
                </div>
              </div>
            ) : null}
            {pwResetOptionComponent}
            {props.format === AccountFormFormat.ENROLL
              ? enrollmentFields
              : null}
            {buttonText ? (
              <div className="d-grid gap-2">
                <Button
                  size="lg"
                  variant="outline-secondary"
                  type="submit"
                  disabled={submitting}
                >
                  {buttonText}
                </Button>
              </div>
            ) : null}
            {props.format === AccountFormFormat.LOGIN ? (
              <div className="d-grid gap-2 mt-3 justify-content-center">
                <SignInWithGoogleButton
                  submitting={submitting}
                  onStarted={onGoogleSignInStarted}
                  onSucceeded={onLoginGoogleSignInSucceeded}
                  onCanceled={onGoogleSignInCanceled}
                />
              </div>
            ) : null}
            {backToMainForm}
          </fieldset>
        </form>
      </div>
    </StyledForm>
  );
};

export default AccountForm;
