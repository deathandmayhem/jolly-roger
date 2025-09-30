import { Accounts } from "meteor/accounts-base";
import { Meteor } from "meteor/meteor";
import type { FormEvent } from "react";
import React, { useCallback, useState } from "react";
import Button from "react-bootstrap/Button";
import { Link, useLocation } from "react-router-dom";
import { styled } from "styled-components";
import {
  AccountFormFrame,
  AccountFormSubmitState,
  useEmailField,
} from "./AccountFormHelpers";

const StyledModeSwitchLink = styled.div`
  margin-top: 20px;
  margin-bottom: 30px;
  text-align: center;
`;

const ForgotPasswordForm = () => {
  const location = useLocation();
  const { state } = location;
  const [submitState, setSubmitState] = useState<AccountFormSubmitState>(
    AccountFormSubmitState.IDLE,
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  );
  const [successMessage, setSuccessMessage] = useState<string | undefined>(
    undefined,
  );
  const disabled = submitState === AccountFormSubmitState.SUBMITTING;
  const { email, emailField } = useEmailField({
    disabled,
    initialValue: () => {
      return state?.email ?? "";
    },
  });
  const submitDisabled = disabled || email.length === 0;
  const onSubmitForm = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
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
    },
    [email],
  );
  return (
    <AccountFormFrame
      title="Reset your password"
      state={submitState}
      onSubmitForm={onSubmitForm}
      errorMessage={errorMessage}
      successMessage={successMessage}
    >
      {emailField}
      <div className="d-grid gap-2">
        <Button
          size="lg"
          type="submit"
          variant={submitDisabled ? "secondary" : "primary"}
          disabled={submitDisabled}
        >
          Email Reset Link
        </Button>
      </div>
      <StyledModeSwitchLink>
        <p>
          If you know your password,{" "}
          <Link to="/login" state={{ email }}>
            sign in
          </Link>
          .
        </p>
      </StyledModeSwitchLink>
    </AccountFormFrame>
  );
};

export default ForgotPasswordForm;
