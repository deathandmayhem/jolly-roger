import { Google } from "meteor/google-oauth";
import { OAuth } from "meteor/oauth";
import { useTracker } from "meteor/react-meteor-data";
import { ServiceConfiguration } from "meteor/service-configuration";
import type { ChangeEvent, ComponentPropsWithRef, FC, FormEvent } from "react";
import React, { useCallback, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { styled } from "styled-components";
import Flags from "../../Flags";

export type GoogleSignInCredentials = {
  token: string;
  secret: string;
};

export enum AccountFormSubmitState {
  IDLE = "idle",
  SUBMITTING = "submitting",
  FAILED = "failed",
  SUCCESS = "success",
}

const StyledFormPage = styled.div`
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

export const useEmailField = ({
  initialValue,
  disabled,
  explanation,
}: {
  initialValue?: string | (() => string);
  disabled: boolean;
  explanation?: string;
}) => {
  const [email, setEmail] = useState<string>(initialValue ?? "");
  const onEmailChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  }, []);
  return {
    email,
    emailField: (
      <Form.Group className="mb-3" controlId="at-field-email">
        <Form.Label>Email</Form.Label>
        <Form.Control
          type="email"
          value={email}
          placeholder="Email"
          autoCapitalize="none"
          autoCorrect="off"
          onChange={onEmailChange}
          disabled={disabled}
        />
        {explanation ? <Form.Text>{explanation}</Form.Text> : undefined}
      </Form.Group>
    ),
  };
};

export const usePasswordField = ({ disabled }: { disabled: boolean }) => {
  const [password, setPassword] = useState<string>("");
  const onPasswordChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  }, []);
  return {
    password,
    passwordField: (
      <Form.Group className="mb-3" controlId="at-field-password">
        <Form.Label>Password</Form.Label>
        <Form.Control
          type="password"
          value={password}
          placeholder="Password"
          autoCapitalize="none"
          autoCorrect="off"
          onChange={onPasswordChange}
          disabled={disabled}
        />
      </Form.Group>
    ),
  };
};

const GoogleSignInButton: FC<ComponentPropsWithRef<typeof Button>> = styled(
  Button,
)`
  background-image: url("/google-signin.svg");
  width: 175px;
  height: 40px;
`;

export const useGoogleSignInCredentialsField = ({
  disabled,
  onCredentialsSet,
}: {
  disabled: boolean;
  onCredentialsSet?: (credentials: { token: string; secret: string }) => void;
}) => {
  const config = useTracker(
    () => ServiceConfiguration.configurations.findOne({ service: "google" }),
    [],
  );
  const googleDisabled = useTracker(() => Flags.active("disable.google"), []);
  const [googleSignInCredentials, setGoogleSignInCredentials] = useState<
    GoogleSignInCredentials | undefined
  >(undefined);
  const [submitState, setSubmitState] = useState<AccountFormSubmitState>(
    AccountFormSubmitState.IDLE,
  );
  const submitting = submitState === AccountFormSubmitState.SUBMITTING;

  const requestComplete = useCallback(
    (token: string) => {
      const secret = OAuth._retrieveCredentialSecret(token);
      if (!secret) {
        setSubmitState(AccountFormSubmitState.IDLE);
        return;
      }
      setSubmitState(AccountFormSubmitState.IDLE);
      setGoogleSignInCredentials({
        token,
        secret,
      });
      onCredentialsSet?.({ token, secret });
    },
    [onCredentialsSet],
  );

  const onClick = useCallback(() => {
    setSubmitState(AccountFormSubmitState.SUBMITTING);
    Google.requestCredential(requestComplete);
  }, [requestComplete]);

  const googleSignInCredentialsField =
    !googleDisabled && googleSignInCredentials === undefined ? (
      <GoogleSignInButton
        variant="outline-secondary"
        onClick={onClick}
        disabled={disabled || submitting}
      />
    ) : undefined;

  return {
    googleAvailable: config !== undefined && !googleDisabled,
    googleSignInCredentials,
    googleSignInCredentialsField,
    googleSignInSubmitState: submitState,
  };
};

export const useDisplayNameField = ({ disabled }: { disabled: boolean }) => {
  const [displayName, setDisplayName] = useState<string>("");
  const onDisplayNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setDisplayName(e.target.value);
    },
    [],
  );
  return {
    displayName,
    displayNameField: (
      <Form.Group className="mb-3" controlId="at-field-displayname">
        <Form.Label>Full name</Form.Label>
        <Form.Control
          type="text"
          placeholder="Ben Bitdiddle"
          autoCapitalize="none"
          autoCorrect="off"
          value={displayName}
          onChange={onDisplayNameChange}
          disabled={disabled}
        />
        <Form.Text>For use in chat</Form.Text>
      </Form.Group>
    ),
  };
};

export const usePhoneNumberField = ({ disabled }: { disabled: boolean }) => {
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const onPhoneNumberChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setPhoneNumber(e.target.value);
    },
    [],
  );
  return {
    phoneNumber,
    phoneNumberField: (
      <Form.Group className="mb-3" controlId="at-field-phonenumber">
        <Form.Label>Phone Number</Form.Label>
        <Form.Control
          type="tel"
          placeholder="+16173244699"
          value={phoneNumber}
          onChange={onPhoneNumberChange}
          disabled={disabled}
        />
        <Form.Text>
          Optional, but helpful if HQ needs to reach you while you&apos;re on a
          runaround or at an event puzzle.
        </Form.Text>
      </Form.Group>
    ),
  };
};

export const AccountFormFrame = ({
  children,
  title,
  state,
  successMessage,
  errorMessage,
  infoMessage,
  onSubmitForm,
}: {
  children: React.ReactNode;
  title: string;
  state: AccountFormSubmitState;
  successMessage?: string;
  errorMessage?: string;
  infoMessage?: string;
  onSubmitForm: (e: FormEvent<HTMLFormElement>) => void;
}) => {
  return (
    <StyledFormPage>
      <StyledTitle>{title}</StyledTitle>
      <div>
        <form noValidate action="#" method="POST" onSubmit={onSubmitForm}>
          <fieldset>
            {state === AccountFormSubmitState.FAILED ? (
              <Alert variant="danger">{errorMessage}</Alert>
            ) : null}
            {infoMessage ? <Alert variant="info">{infoMessage}</Alert> : null}
            {state === AccountFormSubmitState.SUCCESS ? (
              <Alert variant="success">{successMessage}</Alert>
            ) : null}
            {children}
          </fieldset>
        </form>
      </div>
    </StyledFormPage>
  );
};
