import { Accounts } from "meteor/accounts-base";
import { Meteor } from "meteor/meteor";
import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import Button from "react-bootstrap/Button";
import { Link, useLocation } from "react-router-dom";
import type { LoginOptions } from "../../lib/loginOptions";
import useTeamName from "../hooks/useTeamName";
import {
  AccountFormFrame,
  AccountFormSubmitState,
  useEmailField,
  useGoogleSignInCredentialsField,
  usePasswordField,
} from "./AccountFormHelpers";

const LoginForm = () => {
  const location = useLocation();
  const { state } = location;
  const { teamName, teamNameLoading } = useTeamName();

  const [submitState, setSubmitState] = useState<AccountFormSubmitState>(
    AccountFormSubmitState.IDLE,
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  );
  const onGoogleCredentials = useCallback(
    ({ token, secret }: { token: string; secret: string }) => {
      setSubmitState(AccountFormSubmitState.SUBMITTING);
      const loginRequest: LoginOptions = {
        isJrLogin: true,
        googleCredentials: {
          key: token,
          secret,
        },
      };
      Accounts.callLoginMethod({
        methodArguments: [loginRequest],
        userCallback: (err?: Error) => {
          if (err) {
            setErrorMessage(
              err instanceof Meteor.Error ? err.reason : err.message,
            );
            setSubmitState(AccountFormSubmitState.FAILED);
          } else {
            setSubmitState(AccountFormSubmitState.SUCCESS);
          }
        },
      });
    },
    [],
  );
  const {
    googleAvailable,
    googleSignInCredentialsField,
    googleSignInSubmitState,
  } = useGoogleSignInCredentialsField({
    disabled: submitState === AccountFormSubmitState.SUBMITTING,
    onCredentialsSet: onGoogleCredentials,
  });
  const submitting =
    submitState === AccountFormSubmitState.SUBMITTING ||
    googleSignInSubmitState === AccountFormSubmitState.SUBMITTING;
  const { email, emailField } = useEmailField({
    disabled: submitting,
    initialValue: () => {
      return state?.email ?? "";
    },
  });
  const { password, passwordField } = usePasswordField({
    disabled: submitting,
  });
  const formIsValid = email.length > 0 && password.length > 0;

  const onSubmitForm = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (formIsValid && !submitting) {
        setSubmitState(AccountFormSubmitState.SUBMITTING);
        Meteor.loginWithPassword(email, password, (err?: Error) => {
          if (err) {
            setErrorMessage(
              err instanceof Meteor.Error ? err.reason : err.message,
            );
            setSubmitState(AccountFormSubmitState.FAILED);
          } else {
            setSubmitState(AccountFormSubmitState.IDLE);
          }
        });
      }
    },
    [formIsValid, submitting, email, password],
  );

  if (teamNameLoading()) {
    return <div>loading...</div>;
  }

  return (
    <AccountFormFrame
      title={`Jolly Roger: ${teamName} Virtual HQ`}
      state={submitState}
      errorMessage={errorMessage}
      onSubmitForm={onSubmitForm}
    >
      {emailField}
      {passwordField}
      <div>
        <p>
          <Link to="/forgot-password" state={{ email }}>
            Forgot your password?
          </Link>
        </p>
      </div>
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
      {googleAvailable ? (
        <div className="d-grid gap-2 mt-3 justify-content-center">
          {googleSignInCredentialsField}
        </div>
      ) : undefined}
    </AccountFormFrame>
  );
};

export default LoginForm;
