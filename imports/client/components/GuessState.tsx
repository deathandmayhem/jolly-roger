import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faBan } from "@fortawesome/free-solid-svg-icons/faBan";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons/faCheckCircle";
import { faClock } from "@fortawesome/free-solid-svg-icons/faClock";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faQuestionCircle } from "@fortawesome/free-solid-svg-icons/faQuestionCircle";
import { faTimesCircle } from "@fortawesome/free-solid-svg-icons/faTimesCircle";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useId } from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import type { GuessType } from "../../lib/models/Guesses";

const iconLookupTable: Record<GuessType["state"], IconProp> = {
  correct: faCheckCircle,
  intermediate: faExclamationCircle,
  incorrect: faTimesCircle,
  rejected: faBan,
  pending: faClock,
};

const stateDescriptionTable: Record<GuessType["state"], string> = {
  correct: "Correct",
  intermediate: "Intermediate answer",
  incorrect: "Incorrect",
  rejected: "Rejected",
  pending: "Pending",
};

const GuessState = ({
  state,
  short = false,
}: {
  state: GuessType["state"];
  short?: boolean;
}) => {
  const theme = useTheme();
  const iconColor = (state: GuessType["state"]) => {
    return theme.colors.guess[state].icon;
  };

  const tooltipId = useId();

  const { t } = useTranslation();

  if (!short) {
    return (
      <>
        <FontAwesomeIcon
          icon={iconLookupTable[state] ?? faQuestionCircle}
          color={iconColor(state)}
          fixedWidth
        />{" "}
        {t(
          `puzzle.answerOrGuess.guessState.${state}`,
          stateDescriptionTable[state],
        ) ?? t("puzzle.answerOrGuess.guessState.unknown", "unknown")}
      </>
    );
  }

  const tooltip = (
    <Tooltip id={tooltipId}>
      {t(
        `puzzle.answerOrGuess.guessState.${state}`,
        stateDescriptionTable[state],
      ) ?? t("puzzle.answerOrGuess.guessState.unknown", "unknown")}
    </Tooltip>
  );
  return (
    <OverlayTrigger placement="top" overlay={tooltip}>
      <FontAwesomeIcon
        icon={iconLookupTable[state] ?? faQuestionCircle}
        color={iconColor(state)}
        fixedWidth
      />
    </OverlayTrigger>
  );
};

export default GuessState;
