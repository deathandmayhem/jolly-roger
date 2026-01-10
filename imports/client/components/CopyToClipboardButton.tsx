import { useCallback, useId, useRef, useState } from "react";
import Button, { type ButtonProps } from "react-bootstrap/Button";
import OverlayTrigger, {
  type OverlayTriggerProps,
} from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

interface CopyToClipboardProps extends ButtonProps {
  tooltipText?: string;
  tooltipPlacement?: OverlayTriggerProps["placement"];
  text: string | (() => string); // the text to copy, or a function that will generate it lazily
}

const CopyToClipboardButton = (props: CopyToClipboardProps) => {
  const { tooltipPlacement, text, tooltipText, children, ...rest } = props;
  const [copied, setCopied] = useState<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const onClick = useCallback(() => {
    const flatText: string = typeof text === "function" ? text() : text;
    navigator.clipboard.writeText(flatText).then(
      () => {
        if (timeoutRef.current !== undefined) {
          clearTimeout(timeoutRef.current);
        }
        setCopied(true);
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = undefined;
          setCopied(false);
        }, 3000);
      },
      (error) => {
        // biome-ignore lint/suspicious/noConsole: migration from eslint
        console.error("could not copy to clipboard:", error.message);
      },
    );
  }, [text]);
  const tooltipId = useId();

  const copyTooltip = (
    <Tooltip id={tooltipId}>
      {copied ? "Copied!" : (tooltipText ?? "Copy to clipboard")}
    </Tooltip>
  );

  return (
    <OverlayTrigger
      placement={tooltipPlacement ?? "top-start"}
      overlay={copyTooltip}
    >
      <Button {...rest} onClick={onClick}>
        {children}
      </Button>
    </OverlayTrigger>
  );
};

export default CopyToClipboardButton;
