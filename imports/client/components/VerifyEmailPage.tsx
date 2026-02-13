import { Accounts } from "meteor/accounts-base";
import { Meteor } from "meteor/meteor";
import { useEffect, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

const VerifyEmailPage = () => {
  const { t } = useTranslation();
  const token = useParams<"token">().token!;
  const navigate = useNavigate();
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    Accounts.verifyEmail(token, (err?: Error) => {
      if (err) {
        setError(
          err instanceof Meteor.Error
            ? (err.reason ?? err.message)
            : err.message,
        );
      } else {
        navigate("/", { replace: true });
      }
    });
  }, [token, navigate]);

  if (error) {
    return (
      <Container>
        <Alert variant="danger">
          {t("verifyEmail.failed", "Email verification failed: {{error}}", {
            error,
          })}
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <span>{t("verifyEmail.verifying", "Verifying email...")}</span>
    </Container>
  );
};

export default VerifyEmailPage;
