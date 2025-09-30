import { Meteor } from "meteor/meteor";
import React, { useCallback, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import provisionFirstUser from "../../methods/provisionFirstUser";

enum SubmitState {
  IDLE = "idle",
  SUBMITTING = "submitting",
  SUCCESS = "success",
  ERROR = "error",
}

// This form is used strictly for the creation of the first user, who is made an admin.
const FirstUserForm = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.IDLE);
  const [submitError, setSubmitError] = useState<string>("");

  const onEmailChange: NonNullable<FormControlProps["onChange"]> = useCallback(
    (e) => {
      setEmail(e.currentTarget.value);
    },
    [],
  );
  const onPasswordChange: NonNullable<FormControlProps["onChange"]> =
    useCallback((e) => {
      setPassword(e.currentTarget.value);
    }, []);
  const dismissAlert = useCallback(() => {
    setSubmitState(SubmitState.IDLE);
  }, []);

  const onSubmit = useCallback(
    (e: React.FormEvent<any>) => {
      e.preventDefault();

      const trimmedEmail = email.trim();
      if (trimmedEmail.length === 0 || password.length === 0) {
        setSubmitError("Must provide both an email and password");
        setSubmitState(SubmitState.ERROR);
      } else {
        setSubmitState(SubmitState.SUBMITTING);
        provisionFirstUser.call({ email: trimmedEmail, password }, (err) => {
          if (err) {
            setSubmitError(err.message);
            setSubmitState(SubmitState.ERROR);
          } else {
            // Success!  Do login.
            Meteor.loginWithPassword(trimmedEmail, password, (error) => {
              if (error) {
                setSubmitError(error.message);
                setSubmitState(SubmitState.ERROR);
              } else {
                setSubmitState(SubmitState.SUCCESS);
                // We've logged in. We should get redirected to /hunts by the
                // AuthenticatedRoute that's rendering us.
              }
            });
          }
        });
      }
    },
    [email, password],
  );

  const shouldDisableForm = submitState === SubmitState.SUBMITTING;
  return (
    <form onSubmit={onSubmit}>
      <h1>Create first user</h1>
      <p>This user will have server admin and operator privileges.</p>
      {submitState === SubmitState.SUBMITTING ? (
        <Alert variant="info">Creating first user...</Alert>
      ) : null}
      {submitState === SubmitState.SUCCESS ? (
        <Alert variant="success" dismissible onClose={dismissAlert}>
          Created user.
        </Alert>
      ) : null}
      {submitState === SubmitState.ERROR ? (
        <Alert variant="danger" dismissible onClose={dismissAlert}>
          Saving failed: {submitError}
        </Alert>
      ) : null}
      <FormGroup className="mb-3">
        <FormLabel htmlFor="jr-first-user-email">Email</FormLabel>
        <FormControl
          id="jr-first-user-email"
          type="text"
          value={email}
          disabled={shouldDisableForm}
          onChange={onEmailChange}
        />
      </FormGroup>
      <FormGroup className="mb-3">
        <FormLabel htmlFor="jr-first-user-password">Password</FormLabel>
        <FormControl
          id="jr-first-user-password"
          type="password"
          value={password}
          disabled={shouldDisableForm}
          onChange={onPasswordChange}
        />
      </FormGroup>
      <Button
        variant="primary"
        type="submit"
        disabled={shouldDisableForm}
        onSubmit={onSubmit}
      >
        Create first user
      </Button>
    </form>
  );
};

export default FirstUserForm;
