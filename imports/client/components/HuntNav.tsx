import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { faBullhorn } from "@fortawesome/free-solid-svg-icons/faBullhorn";
import { faFaucet } from "@fortawesome/free-solid-svg-icons/faFaucet";
import { faMap } from "@fortawesome/free-solid-svg-icons/faMap";
import { faReceipt } from "@fortawesome/free-solid-svg-icons/faReceipt";
import { faTags } from "@fortawesome/free-solid-svg-icons/faTags";
import { faUsers } from "@fortawesome/free-solid-svg-icons/faUsers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Nav from "react-bootstrap/Nav";
import { useTranslation } from "react-i18next";
import { NavLink, useParams } from "react-router-dom";
import styled, { css } from "styled-components";
import Hunts from "../../lib/models/Hunts";
import { userMayWritePuzzlesForHunt } from "../../lib/permission_stubs";
import { mediaBreakpointDown } from "./styling/responsive";

const JRLinkList = styled(Nav)`
  margin-right: 8px;
  flex: 1 1 auto;
  display: flex;
  justify-content: flex-end;
  align-items: center;

  ${mediaBreakpointDown(
    "sm",
    css`
      justify-content: space-between;
      align-items: stretch;
      border: 1px solid #0d6efd;
      margin-right: 0;
      padding-right: 0;
    `,
  )}
`;

const StyledPuzzleListLinkAnchor = styled(NavLink)`
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 50px;
  overflow: hidden;
  flex-direction: column;
  padding: 0 12px;
  color: ${({ theme }) => theme.colors.text};

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    text-decoration: none;
    opacity: 0.8;
  }

  ${mediaBreakpointDown(
    "lg",
    css`
      padding: 0 8px;
    `,
  )}

  ${mediaBreakpointDown(
    "sm",
    css`
      flex: 1;
      font-size: 1rem;

      &:hover {
        background: #f0f0f0;
      }
    `,
  )}
`;

const HuntLinkAnchor = styled(StyledPuzzleListLinkAnchor)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  ${mediaBreakpointDown(
    "sm",
    css`
      color: white;
      background: #0d6efd;

      &:hover {
        background: #0a58ca;
        color: white;
      }
    `,
  )}

  ${mediaBreakpointDown(
    "sm",
    css`
      margin-left: 0;
      flex: 1;
      height: 100%;
      padding: 6px 0;

      a {
        border-radius: 0;
        flex: 1;
        height: 100%;
        padding: 4px 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `,
  )}
`;

const StyledPuzzleListLinkLabel = styled.span`
  ${mediaBreakpointDown(
    "lg",
    css`
      margin-left: 0;
      font-size: 0.8rem;
      text-align: center;
    `,
  )}
  ${mediaBreakpointDown(
    "md",
    css`
      display: none;
    `,
  )}
`;

const MenuIcon = styled(FontAwesomeIcon)`
  ${mediaBreakpointDown(
    "md",
    css`
      margin-bottom: 2px;
      padding: 0.2rem;
    `,
  )}
`;

const HuntNav = () => {
  const huntId = useParams<"huntId">().huntId!;
  const hunt = useTracker(() => Hunts.findOne(huntId)!, [huntId]);
  const { canUpdate } = useTracker(() => {
    return {
      canUpdate: userMayWritePuzzlesForHunt(Meteor.user(), hunt),
    };
  }, [hunt]);
  const { t } = useTranslation();

  if (huntId && hunt) {
    const huntLink = hunt.homepageUrl && (
      <HuntLinkAnchor
        to={hunt.homepageUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={t("navigation.huntLinkTitle", "Open the hunt homepage")}
      >
        <MenuIcon icon={faMap} />
        <StyledPuzzleListLinkLabel>
          {t("navigation.huntLinkText", "Hunt")}
        </StyledPuzzleListLinkLabel>
      </HuntLinkAnchor>
    );
    return (
      <JRLinkList>
        <StyledPuzzleListLinkAnchor
          to={`/hunts/${huntId}/announcements`}
          title={t("announcements.navTitle", "Announcements")}
        >
          <MenuIcon icon={faBullhorn} />
          <StyledPuzzleListLinkLabel>
            {t("announcements.navTitle", "Announcements")}
          </StyledPuzzleListLinkLabel>
        </StyledPuzzleListLinkAnchor>

        <StyledPuzzleListLinkAnchor
          to={`/hunts/${huntId}/guesses`}
          title={
            hunt.hasGuessQueue
              ? t("guessQueue.title.guess", "Guesses")
              : t("guessQueue.title.answer", "Answers")
          }
        >
          <MenuIcon icon={faReceipt} />
          <StyledPuzzleListLinkLabel>
            {hunt.hasGuessQueue
              ? t("guessQueue.title.guess", "Guesses")
              : t("guessQueue.title.answer", "Answers")}
          </StyledPuzzleListLinkLabel>
        </StyledPuzzleListLinkAnchor>

        <StyledPuzzleListLinkAnchor
          to={`/hunts/${huntId}/hunters`}
          title={t("hunterList.navTitle", "Hunters")}
        >
          <MenuIcon icon={faUsers} />
          <StyledPuzzleListLinkLabel>
            {t("hunterList.navTitle", "Hunters")}
          </StyledPuzzleListLinkLabel>
        </StyledPuzzleListLinkAnchor>

        <StyledPuzzleListLinkAnchor
          to={`/hunts/${huntId}/tags`}
          title={t("tags.navTitle", "Tags")}
        >
          <MenuIcon icon={faTags} />
          <StyledPuzzleListLinkLabel>
            {t("tags.navTitle", "Tags")}
          </StyledPuzzleListLinkLabel>
        </StyledPuzzleListLinkAnchor>

        {/* Show firehose link only to operators */}
        {canUpdate && (
          <StyledPuzzleListLinkAnchor
            to={`/hunts/${huntId}/firehose`}
            title={t("chat.firehose.title", "Firehose")}
          >
            <MenuIcon icon={faFaucet} />
            <StyledPuzzleListLinkLabel>
              {t("chat.firehose.title", "Firehose")}
            </StyledPuzzleListLinkLabel>
          </StyledPuzzleListLinkAnchor>
        )}
        {huntLink}
      </JRLinkList>
    );
  } else {
    return undefined;
  }
};

export default HuntNav;
