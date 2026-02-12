import { Accounts } from "meteor/accounts-base";
import { Meteor } from "meteor/meteor";
import type { SubmitEvent } from "react";
import { useCallback, useState } from "react";
import Button from "react-bootstrap/Button";
import { useParams } from "react-router-dom";
import updateProfile from "../../methods/updateProfile";
import {
  AccountFormFrame,
  AccountFormSubmitState,
  useDisplayNameField,
  usePasswordField,
  usePhoneNumberField,
} from "./AccountFormHelpers";

// This form handles the flow where a user is invited by their email to a hunt,
// and receives a link like `/enroll/:token`. By the time we have generated that
// link, there is an incomplete User in the users collection with an email
// address but no password set.
//
// It is worth noting that this form is only used when the email that the invite
// is sent to is not already associated with an account; otherwise we simply add
// the user with that email address to the hunt (though maybe we should require
// confirmation/consent from the user before making JR support multi-team
// instances).
//
// This form is not used for the InvitationCode flow; that flow is handled by
// JoinHunt instead.
const EnrollForm = () => {
  const token = useParams<"token">().token;
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
  const { displayName, displayNameField } = useDisplayNameField({
    disabled: submitting,
  });
  const { phoneNumber, phoneNumberField } = usePhoneNumberField({
    disabled: submitting,
  });

  const trimmedDisplayName = displayName.trim();
  const formIsValid = password.length > 0 && trimmedDisplayName.length > 0;

  const onSubmit = useCallback(
    (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (
        submitState !== AccountFormSubmitState.SUBMITTING &&
        token &&
        formIsValid
      ) {
        setSubmitState(AccountFormSubmitState.SUBMITTING);
        // Set the profile first, while the enrollment token is still valid.
        // This way, if Accounts.resetPassword succeeds but the response is
        // lost (e.g. spotty connectivity) and Meteor retries it, the profile
        // is already saved even though the retry will fail.
        const newProfile = {
          displayName: trimmedDisplayName,
          phoneNumber: phoneNumber !== "" ? phoneNumber : undefined,
          dingwords: [],
          enrollmentToken: token,
        };
        updateProfile.call(newProfile, (profileError?: Error) => {
          if (profileError) {
            setSubmitState(AccountFormSubmitState.FAILED);
            setErrorMessage(
              profileError instanceof Meteor.Error
                ? profileError.reason
                : profileError.message,
            );
            return;
          }

          void Accounts.resetPassword(token, password, (error?: Error) => {
            if (error) {
              setSubmitState(AccountFormSubmitState.FAILED);
              setErrorMessage(
                error instanceof Meteor.Error ? error.reason : error.message,
              );
            } else {
              setSubmitState(AccountFormSubmitState.SUCCESS);
              setSuccessMessage("Created account successfully");
            }
          });
        });
      }
    },
    [
      submitState,
      formIsValid,
      token,
      password,
      trimmedDisplayName,
      phoneNumber,
    ],
  );

  return (
    <AccountFormFrame
      title="Create an account"
      onSubmitForm={onSubmit}
      state={submitState}
      errorMessage={errorMessage}
      successMessage={successMessage}
    >
      {passwordField}
      {displayNameField}
      {phoneNumberField}
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
  );
};

export default EnrollForm;
