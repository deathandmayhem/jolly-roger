import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import acceptHuntInvitationCode from "../../methods/acceptHuntInvitationCode";
import { useAuthenticated } from "./authentication";

const JoinHunt = () => {
  const [loading, loggedIn] = useAuthenticated();
  const location = useLocation();

  const invitationCode = useParams<"invitationCode">().invitationCode!;
  const [status, setStatus] = useState<string>("loading...");

  const navigate = useNavigate();

  useEffect(() => {
    if (loading) {
      return;
    }
    if (loggedIn) {
      // Accept the invitation and redirect to the hunt page on success.
      acceptHuntInvitationCode.call({ invitationCode }, (error, huntId) => {
        if (error) {
          setStatus(error.reason ?? "Unknown error");
        } else {
          navigate(`/hunts/${huntId}`);
        }
      });
    } else {
      // Redirect to /login with the invitation code present in state.
      // LoginForm will look for it and show the invitation welcome page if present.
      const { pathname, search } = location;
      const state = {
        pathname,
        search,
        invitationCode,
      };
      navigate("/login", { state });
    }
  }, [loading, loggedIn, invitationCode, navigate, location]);

  return <div>{status}</div>;
};

export default JoinHunt;
