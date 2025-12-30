import type { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { useId } from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import styled from "styled-components";
import { formatDiscordName } from "../../lib/discord";
import { indexedById } from "../../lib/listUtils";
import type { HuntType } from "../../lib/models/Hunts";
import Hunts from "../../lib/models/Hunts";
import huntsAll from "../../lib/publications/huntsAll";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import Avatar from "./Avatar";

const AvatarTooltip = styled(Tooltip)`
  opacity: 1 !important;

  .tooltip-inner {
    max-width: 300px;
  }
`;

const ProfileTable = styled.table`
  td,
  th {
    padding: 0.25rem 0.5rem;
  }
`;

const OthersProfilePage = ({ user }: { user: Meteor.User }) => {
  const showHuntList = (user.hunts?.length ?? 0) > 0;

  // TODO: The current implementation of the "profile" publication that fetches
  // the user will always include the list of hunts, so we don't need to
  // conditionalize this. And we could maybe roll it all into a
  // publishJoinedQuery.
  const huntsLoading = useTypedSubscribe(showHuntList ? huntsAll : undefined);
  const loading = huntsLoading();
  const hunts = useTracker(
    () =>
      loading ? new Map<string, HuntType>() : indexedById(Hunts.find().fetch()),
    [loading],
  );

  const tooltipId = useId();

  return (
    <div>
      <h1>
        <OverlayTrigger
          placement="bottom-start"
          overlay={
            <AvatarTooltip id={tooltipId}>
              <Avatar {...user} size={128} />
            </AvatarTooltip>
          }
        >
          <Avatar {...user} size={64} />
        </OverlayTrigger>{" "}
        {user.displayName ?? "No display name"}
      </h1>

      <ProfileTable>
        <tbody>
          <tr>
            <th>Email</th>
            <td>
              {user.emails?.[0]?.address ? (
                <a
                  href={`mailto:${user.emails[0].address}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {user.emails[0].address}
                </a>
              ) : (
                "(none)"
              )}
            </td>
          </tr>
          <tr>
            <th>Phone</th>
            <td>
              {user.phoneNumber ? (
                <a href={`tel:${user.phoneNumber}`}>{user.phoneNumber}</a>
              ) : (
                "(none)"
              )}
            </td>
          </tr>
          <tr>
            <th>Discord handle</th>
            <td>
              {user.discordAccount ? (
                <a
                  href={`https://discord.com/users/${user.discordAccount.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {formatDiscordName(user.discordAccount)}
                </a>
              ) : (
                "(none)"
              )}
            </td>
          </tr>
          {showHuntList && (
            <tr>
              <th>Hunts in common</th>
              <td>
                {loading
                  ? "loading..."
                  : user.hunts
                      ?.map(
                        (huntId) =>
                          hunts.get(huntId)?.name ?? `Unknown hunt ${huntId}`,
                      )
                      .join(", ")}
              </td>
            </tr>
          )}
        </tbody>
      </ProfileTable>
    </div>
  );
};

export default OthersProfilePage;
