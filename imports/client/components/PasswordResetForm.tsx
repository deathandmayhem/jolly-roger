import React from "react";
import { useParams } from "react-router-dom";
import AccountForm, { AccountFormFormat } from "./AccountForm";

const PasswordResetForm = () => {
  const token = useParams<"token">().token!;
  return <AccountForm format={AccountFormFormat.RESET_PWD} token={token} />;
};

export default PasswordResetForm;
