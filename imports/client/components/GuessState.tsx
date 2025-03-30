import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faBan } from "@fortawesome/free-solid-svg-icons/faBan";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons/faCheckCircle";
import { faClock } from "@fortawesome/free-solid-svg-icons/faClock";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faQuestionCircle } from "@fortawesome/free-solid-svg-icons/faQuestionCircle";
import { faTimesCircle } from "@fortawesome/free-solid-svg-icons/faTimesCircle";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
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
  id,
  state,
  short = false,
}: {
  id: string;
  state: GuessType["state"];
  short?: boolean;
}) => {
  const theme = useTheme();
  const iconColor = (state: GuessType["state"]) => {
    switch (state) {
      case "correct":
        return theme.colors.guessColorCorrectIcon;
      case "intermediate":
        return theme.colors.guessColorIntermediateIcon;
      case "incorrect":
        return theme.colors.guessColorIncorrectIcon;
      case "rejected":
        return theme.colors.guessColorRejectedIcon;
      case "pending":
        return theme.colors.guessColorPendingIcon;
      default:
        return "#fff";
    }
  };

  if (!short) {
    return (
      <>
        <FontAwesomeIcon
          icon={iconLookupTable[state] ?? faQuestionCircle}
          color={iconColor(state)}
          fixedWidth
        />{" "}
        {stateDescriptionTable[state] ?? "unknown"}
      </>
    );
  }

  const tooltip = (
    <Tooltip id={`${id}-tooltip`}>
      {stateDescriptionTable[state] ?? "unknown"}
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
