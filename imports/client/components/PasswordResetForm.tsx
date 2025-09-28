import { Accounts } from "meteor/accounts-base";
import { Meteor } from "meteor/meteor";
import type { FormEvent } from "react";
import React, { useCallback, useState } from "react";
import Button from "react-bootstrap/Button";
import { useParams } from "react-router-dom";
import {
  AccountFormSubmitState,
  AccountFormFrame,
  usePasswordField,
} from "./AccountFormHelpers";

const PasswordResetForm = () => {
  const token = useParams<"token">().token!;

  const [submitState, setSubmitState] = useState<AccountFormSubmitState>(
    AccountFormSubmitState.IDLE,
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  );
  const [successMessage, setSuccessMessage] = useState<string | undefined>(
    undefined,
  );
  const submitting = submitState === AccountFormSubmitState.SUBMITTING;
  const { password, passwordField } = usePasswordField({
    disabled: submitting,
  });

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (submitState !== AccountFormSubmitState.SUBMITTING) {
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
      }
    },
    [token, password, submitState],
  );

  const submitDisabled = submitting || password.length === 0;

  return (
    <AccountFormFrame
      title="Reset your password"
      onSubmitForm={onSubmit}
      state={submitState}
      errorMessage={errorMessage}
      successMessage={successMessage}
    >
      {passwordField}
      <div className="d-grid gap-2">
        <Button
          size="lg"
          variant={submitDisabled ? "secondary" : "primary"}
          type="submit"
          disabled={submitDisabled}
        >
          Set password
        </Button>
      </div>
    </AccountFormFrame>
  );
};

export default PasswordResetForm;
