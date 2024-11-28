import React, { useCallback, useEffect, useMemo, useState } from "react";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Row from "react-bootstrap/Row";
import Tooltip from "react-bootstrap/Tooltip";
import { createRoot } from "react-dom/client";
import type { ActionMeta } from "react-select";
import Creatable from "react-select/creatable";
import type { GdriveMimeTypesType, Hunt, Puzzle } from "./api";
import { HttpError, JollyRogerClient } from "./api";
import {
  storedOptions,
  storedRecentTags,
  storedSelectedHuntId,
} from "./storage";

import "bootstrap/dist/css/bootstrap.min.css";

type TagSelectOption = { value: string; label: string };

/* Either the ID of the created puzzle, or an error for any failures. */
type Status = string | Error | undefined;

interface RecentTagButtonProps {
  tag: string;
  onTagClicked: (tag: string) => void;
}

const RecentTagButton = ({ tag, onTagClicked }: RecentTagButtonProps) => {
  const onClick = useCallback(() => {
    onTagClicked(tag);
  }, [tag, onTagClicked]);

  return (
    <Button variant="link" size="sm" onClick={onClick}>
      {tag}
    </Button>
  );
};

const Popup = () => {
  const [jollyRogerInstance, setJollyRogerInstance] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [recentTags, setRecentTags] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(true);

  // Load configuration / saved state from extension storage.
  useEffect(() => {
    void (async () => {
      const options = await storedOptions.get();
      setApiKey(options.apiKey);
      setJollyRogerInstance(options.jollyRogerInstance);
      setRecentTags(await storedRecentTags.get());
      setLoadingOptions(false);
    })();
  }, []);

  const [hunts, setHunts] = useState<Hunt[]>([]);
  const [loadingHunts, setLoadingHunts] = useState<boolean>(false);
  const [hunt, setHunt] = useState<string>("");

  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState<boolean>(false);
  const [tags, setTags] = useState<string[]>([]);

  const [loadingPageDetails, setLoadingPageDetails] = useState<boolean>(true);
  const [title, setTitle] = useState<string>("");
  const [currentURL, setCurrentURL] = useState<string>("");

  const [allowDuplicateUrls, setAllowDuplicateUrls] = useState<boolean>(false);
  const [docType, setDocType] = useState<GdriveMimeTypesType>("spreadsheet");
  const [expectedAnswerCount, setExpectedAnswerCount] = useState<number>(1);

  const [status, setStatus] = useState<Status>();
  const [saving, setSaving] = useState<boolean>(false);

  const loading = loadingOptions || loadingHunts || loadingPageDetails;
  const disableForm = loadingTags || saving;

  const jollyRogerClient = useMemo(() => {
    if (!jollyRogerInstance || !apiKey) {
      return undefined;
    }
    return new JollyRogerClient(jollyRogerInstance, apiKey);
  }, [jollyRogerInstance, apiKey]);

  // Load the list of hunts from Jolly Roger, preselecting the last used hunt (if any).
  useEffect(() => {
    if (!jollyRogerClient) {
      setLoadingHunts(false);
      return;
    }
    setLoadingHunts(true);
    void (async () => {
      let huntList: Hunt[];
      try {
        huntList = await jollyRogerClient.getHunts();
      } catch (error) {
        let errorMsg: string;
        if (error instanceof HttpError) {
          errorMsg = `Unable to load hunts from Jolly Roger: ${error.message}.`;
        } else {
          errorMsg = `Unable to load hunts from Jolly Roger.`;
        }
        setStatus(new Error(errorMsg));
        setLoadingHunts(false);
        return;
      }
      const selectedHuntId = await storedSelectedHuntId.get();
      setHunts(huntList);
      if (huntList.find((huntElement) => huntElement._id === selectedHuntId)) {
        setHunt(selectedHuntId);
      } else if (huntList.length > 0) {
        setHunt(huntList[0]._id);
      } else {
        setStatus(new Error("No hunts are available"));
      }
      setLoadingHunts(false);
    })();
  }, [jollyRogerClient]);

  // Whenever a new hunt is selected, fetch the tags for that hunt for autocomplete.
  useEffect(() => {
    if (!jollyRogerClient || !hunt) {
      return;
    }
    setLoadingTags(true);
    void (async () => {
      let huntTags: string[];
      try {
        huntTags = await jollyRogerClient.getTagsForHunt(hunt);
      } catch (error) {
        let errorMsg: string;
        if (error instanceof HttpError) {
          errorMsg = `Unable to load tags from Jolly Roger: ${error.message}.`;
        } else {
          errorMsg = `Unable to load tags from Jolly Roger.`;
        }
        setStatus(new Error(errorMsg));
        setLoadingTags(false);
        return;
      }

      setAvailableTags(huntTags);
      setLoadingTags(false);
    })();
  }, [jollyRogerClient, hunt]);

  const selectOptions: TagSelectOption[] = availableTags
    .filter(Boolean)
    .map((t) => {
      return { value: t, label: t };
    });

  // Read the URL and title from the current page.
  useEffect(() => {
    setLoadingPageDetails(true);
    void (async () => {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tabTitle = tabs[0].title ?? "";
      const tabUrl = tabs[0].url ?? "";

      setCurrentURL(tabUrl);

      // TODO: Provide a way to customize title extraction per hunt.
      if (
        tabUrl.includes("pandamagazine.com/island") &&
        tabTitle.includes(" | ")
      ) {
        // Puzzle Boats
        setTitle(tabTitle.substring(tabTitle.indexOf(" | ") + 3));
      } else if (
        tabUrl.includes("puzzlehunt.azurewebsites.net") &&
        tabTitle.includes(" - ")
      ) {
        // Microsoft Puzzle Server
        setTitle(tabTitle.substring(0, tabTitle.lastIndexOf(" - ")));
      } else {
        setTitle(tabTitle);
      }

      setLoadingPageDetails(false);
    })();
  }, []);

  const onHuntChange: React.ChangeEventHandler<HTMLSelectElement> = useCallback(
    (event) => {
      void (async () => {
        // Save the most recently selected hunt so it can be selected by default next time.
        await storedSelectedHuntId.put(event.target.value);
      })();
      setHunt(event.target.value);
    },
    [],
  );

  const onTitleChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      setTitle(event.target.value);
    },
    [],
  );

  const onAllowDuplicateUrlsChange: React.ChangeEventHandler<HTMLInputElement> =
    useCallback((event) => {
      setAllowDuplicateUrls(event.target.checked);
    }, []);

  const onTagsChange = useCallback(
    (
      value: readonly TagSelectOption[],
      action: ActionMeta<TagSelectOption>,
    ) => {
      let newTags = [];
      switch (action.action) {
        case "clear":
        case "create-option":
        case "deselect-option":
        case "pop-value":
        case "remove-value":
        case "select-option":
          newTags = value.map((v) => v.value);
          break;
        default:
          return;
      }

      setTags(newTags);
    },
    [],
  );

  const addTag = useCallback(
    (tag: string) => {
      const newTags = [...tags];
      newTags.push(tag);
      setTags(newTags);
    },
    [tags],
  );

  const onDocTypeChange: React.ChangeEventHandler<HTMLSelectElement> =
    useCallback((event) => {
      setDocType(event.currentTarget.value as GdriveMimeTypesType);
    }, []);

  const onExpectedAnswerCountChange: React.ChangeEventHandler<HTMLInputElement> =
    useCallback((event) => {
      const string = event.currentTarget.value;
      const value = Number(string);
      setExpectedAnswerCount(value);
    }, []);

  const addPuzzle: React.FormEventHandler = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!jollyRogerClient) {
        // Should be impossible, as we hide the form until configuration is complete.
        setStatus("Jolly Roger is not configured");
        return;
      }
      setSaving(true);
      const puzzle: Puzzle = {
        title,
        url: currentURL,
        tags,
        expectedAnswerCount,
        docType,
        allowDuplicateUrls,
      };
      void (async () => {
        let puzzleId: string;
        try {
          puzzleId = await jollyRogerClient.addPuzzle(hunt, puzzle);
        } catch (error) {
          let errorMsg: string;
          if (error instanceof HttpError) {
            if (error.getStatus() === 409) {
              errorMsg =
                "A puzzle already exists with this URL - did someone else already add this " +
                'puzzle? To force creation anyway, check the "Allow puzzles with identical URLs" ' +
                "box and try again.";
            } else {
              errorMsg = `Unable to create puzzle: ${error.message}.`;
            }
          } else {
            errorMsg = `Unable to create puzzle.`;
          }
          setStatus(new Error(errorMsg));
          setSaving(false);
          return;
        }

        const newTags = await storedRecentTags.put(tags);
        setRecentTags(newTags);
        setStatus(puzzleId);
        setSaving(false);
      })();
    },
    [
      jollyRogerClient,
      hunt,
      title,
      currentURL,
      tags,
      expectedAnswerCount,
      docType,
      allowDuplicateUrls,
    ],
  );

  const onCloseStatusDialog = useCallback(() => {
    // If the creation was successful, close the extension.
    if (typeof status === "string") {
      window.close();
    }
    setStatus(undefined);
  }, [status]);

  const statusMessage = useMemo(() => {
    if (!status) {
      return <>Unknown error</>;
    } else if (status instanceof Error) {
      return (
        <>
          <strong>Error:</strong> {status.message}
        </>
      );
    } else {
      // status is the created puzzle ID
      const puzzleUrl = new URL(
        `/hunts/${hunt}/puzzles/${status}`,
        jollyRogerInstance,
      );
      return (
        <>
          Puzzle successfully created:{" "}
          <a href={puzzleUrl.href} target="_blank" rel="noreferrer">
            {title}
          </a>
        </>
      );
    }
  }, [jollyRogerInstance, status, hunt, title]);

  const onConfigureLinkClicked = useCallback(() => {
    void (async () => {
      await chrome.runtime.openOptionsPage();
    })();
  }, []);

  const form = (
    <Form onSubmit={addPuzzle}>
      <Form.Group as={Row} className="mb-3">
        <Form.Label column xs={3} htmlFor="jr-hunt">
          Hunt
        </Form.Label>
        <Col xs={9}>
          <Form.Select
            id="jr-hunt"
            value={hunt}
            onChange={onHuntChange}
            disabled={disableForm}
          >
            {hunts.map((huntItem) => {
              return (
                <option key={huntItem._id} value={huntItem._id}>
                  {huntItem.name}
                </option>
              );
            })}
          </Form.Select>
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3">
        <Form.Label column xs={3} htmlFor="jr-title">
          Title
        </Form.Label>
        <Col xs={9}>
          <Form.Control
            id="jr-title"
            type="text"
            onChange={onTitleChange}
            defaultValue={title}
            disabled={disableForm}
          />
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3">
        <Form.Label column xs={3} htmlFor="jr-url">
          URL
        </Form.Label>
        <Col xs={9}>
          <Form.Control
            id="jr-url"
            type="text"
            disabled
            readOnly
            defaultValue={currentURL}
          />
          <Form.Check
            label="Allow puzzles with identical URLs"
            type="checkbox"
            className="mt-1"
            onChange={onAllowDuplicateUrlsChange}
            disabled={disableForm}
          />
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3">
        <Form.Label column xs={3} htmlFor="jr-tags">
          Tags
        </Form.Label>
        <Col xs={9}>
          <Creatable
            id="jr-tags"
            options={selectOptions}
            isMulti
            isDisabled={disableForm}
            onChange={onTagsChange}
            value={tags.map((tag) => {
              return { label: tag, value: tag };
            })}
          />
          {recentTags.map((recentTag) => {
            return (
              <RecentTagButton
                key={recentTag}
                tag={recentTag}
                onTagClicked={addTag}
              />
            );
          })}
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3">
        <Form.Label column xs={3} htmlFor="jr-doc-type">
          Document type{" "}
          <OverlayTrigger
            overlay={
              <Tooltip>
                This can&apos;t be changed once a puzzle has been created.
                Unless you&apos;re absolutely sure, use a spreadsheet. We only
                expect to use documents for administrivia.
              </Tooltip>
            }
          >
            <span>(?)</span>
          </OverlayTrigger>
        </Form.Label>
        <Col xs={9}>
          <Form.Select
            name="jr-doc-type"
            defaultValue={docType}
            onChange={onDocTypeChange}
            disabled={disableForm}
          >
            <option value="spreadsheet">Spreadsheet</option>
            <option value="document">Document</option>
          </Form.Select>
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3">
        <Form.Label column xs={3} htmlFor="jr-expected-answer-count">
          Expected # of answers
        </Form.Label>
        <Col xs={9}>
          <Form.Control
            id="jr-expected-answer-count"
            type="number"
            disabled={disableForm}
            onChange={onExpectedAnswerCountChange}
            value={expectedAnswerCount}
            min={0}
            step={1}
          />
        </Col>
      </Form.Group>
      <Form.Group className="mt-3 text-end">
        <Button variant="light" onClick={window.close} disabled={disableForm}>
          Close
        </Button>
        <Button type="submit" className="ms-2" disabled={disableForm}>
          Save
        </Button>
      </Form.Group>
    </Form>
  );

  const contents =
    jollyRogerInstance !== "" && apiKey !== "" ? (
      form
    ) : (
      <Button variant="link" onClick={onConfigureLinkClicked}>
        Configure Jolly Roger extension
      </Button>
    );

  return (
    <div className="p-3" style={{ minWidth: "500px" }}>
      {loading ? <div>loading...</div> : contents}
      <Modal show={status !== undefined} onHide={onCloseStatusDialog} centered>
        <Modal.Body>{statusMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onCloseStatusDialog}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);
