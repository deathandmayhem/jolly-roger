import React from "react";
import { useParams } from "react-router-dom";
import AccountForm, { AccountFormFormat } from "./AccountForm";

const EnrollForm = () => {
  const token = useParams<"token">().token!;
  return <AccountForm format={AccountFormFormat.ENROLL} token={token} />;
};

export default EnrollForm;
