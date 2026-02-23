import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { faBullhorn } from "@fortawesome/free-solid-svg-icons/faBullhorn";
import { faFaucet } from "@fortawesome/free-solid-svg-icons/faFaucet";
import { faMap } from "@fortawesome/free-solid-svg-icons/faMap";
import { faReceipt } from "@fortawesome/free-solid-svg-icons/faReceipt";
import { faScrewdriverWrench } from "@fortawesome/free-solid-svg-icons/faScrewdriverWrench";
import { faTags } from "@fortawesome/free-solid-svg-icons/faTags";
import { faUsers } from "@fortawesome/free-solid-svg-icons/faUsers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import Hunts from "../../lib/models/Hunts";
import { userMayWritePuzzlesForHunt } from "../../lib/permission_stubs";

const HuntNav = () => {
  const huntId = useParams<"huntId">().huntId!;
  const hunt = useTracker(() => Hunts.findOne(huntId)!, [huntId]);
  const { canUpdate } = useTracker(() => {
    return {
      canUpdate: userMayWritePuzzlesForHunt(Meteor.user(), hunt),
    };
  }, [hunt]);
  const { t } = useTranslation();

  if (!huntId || !hunt) {
    return undefined;
  }

  return (
    <li>
      <details>
        <summary>
          <FontAwesomeIcon icon={faScrewdriverWrench} />
          <span className="hidden sm:inline">
            {t("navigation.huntTools", "Hunt Tools")}
          </span>
        </summary>
        <ul className="bg-base-100 text-base-content rounded-box z-50 w-52 p-2 shadow right-0">
          <li>
            <Link to={`/hunts/${huntId}/announcements`}>
              <FontAwesomeIcon icon={faBullhorn} />
              {t("announcements.navTitle", "Announcements")}
            </Link>
          </li>
          <li>
            <Link to={`/hunts/${huntId}/guesses`}>
              <FontAwesomeIcon icon={faReceipt} />
              {hunt.hasGuessQueue
                ? t("guessQueue.title.guess", "Guesses")
                : t("guessQueue.title.answer", "Answers")}
            </Link>
          </li>
          <li>
            <Link to={`/hunts/${huntId}/hunters`}>
              <FontAwesomeIcon icon={faUsers} />
              {t("hunterList.navTitle", "Hunters")}
            </Link>
          </li>
          <li>
            <Link to={`/hunts/${huntId}/tags`}>
              <FontAwesomeIcon icon={faTags} />
              {t("tags.navTitle", "Tags")}
            </Link>
          </li>
          {canUpdate && (
            <li>
              <Link to={`/hunts/${huntId}/firehose`}>
                <FontAwesomeIcon icon={faFaucet} />
                {t("chat.firehose.title", "Firehose")}
              </Link>
            </li>
          )}
          {hunt.homepageUrl && (
            <li>
              <a
                href={hunt.homepageUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FontAwesomeIcon icon={faMap} />
                {t("navigation.huntLinkText", "Hunt")}
              </a>
            </li>
          )}
        </ul>
      </details>
    </li>
  );
};

export default HuntNav;
