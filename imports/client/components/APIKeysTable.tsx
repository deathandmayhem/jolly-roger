import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faEye } from "@fortawesome/free-solid-svg-icons/faEye";
import { faEyeSlash } from "@fortawesome/free-solid-svg-icons/faEyeSlash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useCallback, useRef, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import FormControl from "react-bootstrap/FormControl";
import InputGroup from "react-bootstrap/InputGroup";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Table from "react-bootstrap/Table";
import Tooltip from "react-bootstrap/Tooltip";
import { styled } from "styled-components";
import { calendarTimeFormat } from "../../lib/calendarTimeFormat";
import { type APIKeyType } from "../../lib/models/APIKeys";
import destroyAPIKey from "../../methods/destroyAPIKey";
import CopyToClipboardButton from "./CopyToClipboardButton";
import ModalForm, { type ModalFormHandle } from "./ModalForm";
import RelativeTime from "./RelativeTime";

const StyledTable = styled(Table)`
  tbody tr td {
    vertical-align: middle;
  }
`;

const APIKeyRow = ({ apiKey }: { apiKey: APIKeyType }) => {
  const destroyModalRef = useRef<ModalFormHandle>(null);
  const [requestState, setRequestState] = useState<
    "idle" | "in-flight" | "error"
  >("idle");
  const [requestError, setRequestError] = useState<string | undefined>(
    undefined,
  );
  const [keyShown, setKeyShown] = useState<boolean>(false);
  const toggleShown = useCallback(() => {
    setKeyShown((prevState) => {
      return !prevState;
    });
  }, []);
  const disabled = requestState === "in-flight";
  const destroy = useCallback(() => {
    setRequestState("in-flight");
    destroyAPIKey.call({ apiKeyId: apiKey._id }, (error) => {
      if (error) {
        setRequestState("error");
        setRequestError(error.message);
      } else {
        setRequestState("idle");
      }
    });
  }, [apiKey._id]);

  const controlId = `jr-profile-api-key-${apiKey._id}`;

  const lastUsedTooltip = apiKey.lastUsedAt ? (
    <Tooltip id={`api-key-last-used-${apiKey._id}`}>
      {calendarTimeFormat(apiKey.lastUsedAt)}
    </Tooltip>
  ) : (
    <span />
  );

  const onDestroyClicked = useCallback(() => {
    destroyModalRef.current?.show();
  }, []);

  const showHideAction = keyShown ? "Hide" : "Show";
  const showHideOverlay = (
    <Tooltip
      id={`api-key-show-hide-${apiKey._id}`}
      key={`api-key-show-hide-${keyShown}`}
    >
      {showHideAction}
    </Tooltip>
  );

  const contentRow = (
    <tr key={`api-key-${apiKey._id}`}>
      <td>
        <InputGroup>
          <CopyToClipboardButton
            variant="outline-secondary"
            aria-label="Copy to clipboard"
            tooltipId={`api-key-copy-${apiKey._id}`}
            text={apiKey.key}
          >
            <FontAwesomeIcon icon={faCopy} fixedWidth />
          </CopyToClipboardButton>
          <OverlayTrigger placement="top" overlay={showHideOverlay}>
            <Button
              variant="outline-secondary"
              onClick={toggleShown}
              aria-label={showHideAction}
            >
              <FontAwesomeIcon
                icon={keyShown ? faEye : faEyeSlash}
                fixedWidth
              />
            </Button>
          </OverlayTrigger>
          <FormControl
            id={controlId}
            type={keyShown ? "text" : "password"}
            readOnly
            disabled
            value={apiKey.key}
            style={{ width: "200px" }}
          />
        </InputGroup>
      </td>
      <td>{apiKey.createdAt.toISOString()}</td>
      <td>
        {apiKey.lastUsedAt ? (
          <OverlayTrigger placement="top" overlay={lastUsedTooltip}>
            {/* OverlayTrigger injects props that RelativeTime doesn't handle/propagate, so we let this additional span consume them so the popovers work */}
            <span>
              <RelativeTime
                date={apiKey.lastUsedAt}
                minimumUnit="minute"
                maxElements={1}
              />
            </span>
          </OverlayTrigger>
        ) : (
          "never"
        )}
      </td>
      <td>
        <ModalForm
          ref={destroyModalRef}
          onSubmit={destroy}
          title="Destroy API key"
          submitLabel="Destroy"
          submitStyle="danger"
        >
          Are you sure you want to destroy this API key?
        </ModalForm>
        <Button variant="danger" disabled={disabled} onClick={onDestroyClicked}>
          Destroy
        </Button>
      </td>
    </tr>
  );

  if (requestState === "error") {
    return (
      <>
        <tr>
          <td colSpan={4}>
            <Alert
              variant="danger"
              onClose={() => setRequestState("idle")}
              dismissible
            >
              Destroying API key failed: {requestError}
            </Alert>
          </td>
        </tr>
        {contentRow}
      </>
    );
  }

  return contentRow;
};

const APIKeysTable = ({ apiKeys }: { apiKeys?: APIKeyType[] }) => {
  return (
    <StyledTable responsive>
      <thead>
        <tr>
          <th>Key</th>
          <th>Created</th>
          <th>Last used</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {apiKeys ? (
          apiKeys.map((apiKey) => {
            return <APIKeyRow key={apiKey._id} apiKey={apiKey} />;
          })
        ) : (
          <tr>
            <td colSpan={5}>No API keys</td>
          </tr>
        )}
      </tbody>
    </StyledTable>
  );
};

export default APIKeysTable;
