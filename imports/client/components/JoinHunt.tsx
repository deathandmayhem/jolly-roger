import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import acceptHuntInvitationCode from "../../methods/acceptHuntInvitationCode";

const JoinHunt = () => {
  const invitationCode = useParams<"invitationCode">().invitationCode!;
  const [status, setStatus] = useState<string>("loading...");

  const navigate = useNavigate();

  useEffect(() => {
    acceptHuntInvitationCode.call({ invitationCode }, (error, huntId) => {
      if (error) {
        setStatus(error.reason ?? "Unknown error");
      } else {
        navigate(`/hunts/${huntId}`);
      }
    });
  }, [invitationCode, navigate]);

  return <div>{status}</div>;
};

export default JoinHunt;
