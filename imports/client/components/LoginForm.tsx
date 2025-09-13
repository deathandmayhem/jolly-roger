import React, { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import AccountForm, {
  AccountFormFormat,
  InvitationEnrollmentMode,
} from "./AccountForm";

type LoginFormFormat =
  | AccountFormFormat.LOGIN
  | AccountFormFormat.REQUEST_PW_RESET
  | AccountFormFormat.INVITATION_WELCOME
  | AccountFormFormat.ENROLL;

const LoginForm = () => {
  const location = useLocation();

  const [format, setFormat] = useState<LoginFormFormat | undefined>(undefined);

  const [huntInvitationCode, setHuntInvitationCode] = useState<string>("");

  useEffect(() => {
    if (!format) {
      if (location.state?.pathname) {
        const invitationPattern = /^\/join\/(.+)$/;
        const matchResult = invitationPattern.exec(location.state.pathname);
        if (matchResult?.[1]) {
          setHuntInvitationCode(matchResult[1]);
          if (format == null) {
            setFormat(AccountFormFormat.INVITATION_WELCOME);
            return;
          }
        }
      }
      setFormat(AccountFormFormat.LOGIN);
    }
  }, [format, location]);

  const selectInvitationMode = useCallback((mode: InvitationEnrollmentMode) => {
    setFormat(
      mode === InvitationEnrollmentMode.NEW_USER
        ? AccountFormFormat.ENROLL
        : AccountFormFormat.LOGIN,
    );
  }, []);

  const toggleFormat = useCallback(() => {
    setFormat((prevFormat) => {
      const newFormat =
        prevFormat === AccountFormFormat.LOGIN
          ? AccountFormFormat.REQUEST_PW_RESET
          : AccountFormFormat.LOGIN;
      return newFormat;
    });
  }, []);

  if (!format) {
    return <div>loading...</div>;
  }

  return (
    <div>
      <AccountForm
        format={format}
        huntInvitationCode={huntInvitationCode}
        onModeSelected={selectInvitationMode}
        onFormatChange={toggleFormat}
      />
    </div>
  );
};

export default LoginForm;
