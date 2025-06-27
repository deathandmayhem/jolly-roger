import React, { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Row from "react-bootstrap/Row";
import Tab from "react-bootstrap/Tab";
import Table from "react-bootstrap/Table";
import Tabs from "react-bootstrap/Tabs";
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

const guessTitle = function (url: string, tabTitle: string): string {
  if (!url || !tabTitle) {
    return tabTitle ?? "";
  }

  // Specific site overrides from popup.tsx
  if (url.includes("pandamagazine.com/island") && tabTitle.includes(" | ")) {
    return tabTitle.substring(tabTitle.indexOf(" | ") + 3);
  }
  if (
    url.includes("puzzlehunt.azurewebsites.net") &&
    tabTitle.includes(" - ")
  ) {
    return tabTitle.substring(0, tabTitle.lastIndexOf(" - "));
  }

  // Generic title guessing from PuzzleModalForm.tsx
  try {
    const urlObject = new URL(url);
    const pathname = urlObject.pathname.replace(/^\/|\/$/g, "");
    if (pathname) {
      const pathParts = pathname.split("/");
      const lastPart = pathParts[pathParts.length - 1] ?? "";
      if (lastPart) {
        const decodedLastPart = decodeURI(lastPart);
        return (
          decodedLastPart.includes("_")
            ? decodedLastPart.replace(/_/g, " ")
            : decodedLastPart.replace(/-/g, " ")
        ).replace(
          /\w\S*/g,
          (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
        );
      }
    }
  } catch (e) {
    // Fall through if URL is invalid
  }

  // Fallback to original tab title
  return tabTitle;
};

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

  // State for bulk add tab
  const [pageLinks, setPageLinks] = useState<
    { id: number; url: string; guessedTitle: string; checked: boolean }[]
  >([]);
  const [bulkFilter, setBulkFilter] = useState("");
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [bulkDocType, setBulkDocType] =
    useState<GdriveMimeTypesType>("spreadsheet");
  const [bulkExpectedAnswerCount, setBulkExpectedAnswerCount] =
    useState<number>(1);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

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

  // Read the URL/title from the current page and all links for bulk add.
  useEffect(() => {
    setLoadingPageDetails(true);
    void (async () => {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (activeTab) {
        // --- Logic for "Add Page" tab ---
        const tabTitle = activeTab.title ?? "";
        const tabUrl = activeTab.url ?? "";
        setTitle(guessTitle(tabUrl, tabTitle));
        setCurrentURL(tabUrl);

        // --- Logic for "Bulk Add" tab ---
        if (activeTab.id) {
          try {
            // Note: This requires the "scripting" permission in manifest.json
            const results = await chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              func: () => {
                const links = Array.from(document.querySelectorAll("a"));
                return links
                  .filter((link) => link.href && link.href.startsWith("http"))
                  .map((link) => ({
                    url: link.href,
                    text: link.innerText.trim() || link.href,
                  }));
              },
            });

            if (results && results[0] && results[0].result) {
              const linksFromPage: { url: string; text: string }[] =
                results[0].result;
              setPageLinks(
                linksFromPage.map((link, index) => ({
                  id: index,
                  url: link.url,
                  guessedTitle: guessTitle(link.url, link.text),
                  checked: true,
                })),
              );
            }
          } catch (e) {
            console.error(
              "Failed to get links from page. Ensure 'scripting' permission is granted and host permissions are correct.",
              e,
            );
          }
        }
      }

      setLoadingPageDetails(false);
    })();
  }, []);

  const filteredLinks = useMemo(() => {
    if (!bulkFilter) return pageLinks;
    const lowerFilter = bulkFilter.toLowerCase();
    return pageLinks.filter(
      (l) =>
        l.guessedTitle.toLowerCase().includes(lowerFilter) ||
        l.url?.toLowerCase().includes(lowerFilter),
    );
  }, [pageLinks, bulkFilter]);
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

  // Handlers for bulk add tab
  const onBulkFilterChange: React.ChangeEventHandler<HTMLInputElement> =
    useCallback((event) => {
      setBulkFilter(event.target.value);
    }, []);

  const onBulkTagsChange = useCallback(
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

      setBulkTags(newTags);
    },
    [],
  );

  const onBulkDocTypeChange: React.ChangeEventHandler<HTMLSelectElement> =
    useCallback((event) => {
      setBulkDocType(event.currentTarget.value as GdriveMimeTypesType);
    }, []);

  const onBulkExpectedAnswerCountChange: React.ChangeEventHandler<HTMLInputElement> =
    useCallback((event) => {
      const string = event.currentTarget.value;
      const value = Number(string);
      setBulkExpectedAnswerCount(value);
    }, []);

  const handleBulkTitleChange = useCallback(
    (linkId: number, newTitle: string) => {
      setPageLinks((links) =>
        links.map((l) =>
          l.id === linkId ? { ...l, guessedTitle: newTitle } : l,
        ),
      );
    },
    [],
  );

  const handleBulkCheckChange = useCallback(
    (linkId: number, checked: boolean) => {
      setPageLinks((links) =>
        links.map((l) => (l.id === linkId ? { ...l, checked } : l)),
      );
    },
    [],
  );

  const onBulkAdd: React.FormEventHandler = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!jollyRogerClient) return;

      setBulkSaving(true);
      setBulkStatus(null);

      const puzzlesToCreate = filteredLinks.filter((l) => l.checked && l.url);

      void (async () => {
        const results = await Promise.allSettled(
          puzzlesToCreate.map((link) => {
            const puzzle: Puzzle = {
              title: link.guessedTitle,
              url: link.url,
              tags: bulkTags,
              expectedAnswerCount: bulkExpectedAnswerCount,
              docType: bulkDocType,
              allowDuplicateUrls: true, // Always allow for bulk add
            };
            return jollyRogerClient.addPuzzle(hunt, puzzle);
          }),
        );

        const successCount = results.filter(
          (r) => r.status === "fulfilled",
        ).length;
        const failedCount = results.length - successCount;
        const errors = results
          .filter((r): r is PromiseRejectedResult => r.status === "rejected")
          .map((r) =>
            r.reason instanceof Error ? r.reason.message : String(r.reason),
          );

        setBulkStatus({ success: successCount, failed: failedCount, errors });
        setBulkSaving(false);
      })();
    },
    [
      jollyRogerClient,
      hunt,
      filteredLinks,
      bulkTags,
      bulkDocType,
      bulkExpectedAnswerCount,
    ],
  );

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
        <Form.Label column xs={3} htmlFor="jr-title">
          Title
        </Form.Label>
        <Col xs={9}>
          <Form.Control
            id="jr-title"
            type="text"
            onChange={onTitleChange}
            value={title}
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

  const bulkAddForm = (
    <Form onSubmit={onBulkAdd}>
      <Form.Group as={Row} className="mb-3">
        <Form.Label column xs={3} htmlFor="jr-bulk-tags">
          Tags
        </Form.Label>
        <Col xs={9}>
          <Creatable
            id="jr-bulk-tags"
            options={selectOptions}
            isMulti
            isDisabled={bulkSaving}
            onChange={onBulkTagsChange}
            value={bulkTags.map((tag) => {
              return { label: tag, value: tag };
            })}
          />
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3">
        <Form.Label column xs={3} htmlFor="jr-bulk-doc-type">
          Document type
        </Form.Label>
        <Col xs={9}>
          <Form.Select
            name="jr-bulk-doc-type"
            defaultValue={bulkDocType}
            onChange={onBulkDocTypeChange}
            disabled={bulkSaving}
          >
            <option value="spreadsheet">Spreadsheet</option>
            <option value="document">Document</option>
          </Form.Select>
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3">
        <Form.Label column xs={3} htmlFor="jr-bulk-expected-answer-count">
          Expected # of answers
        </Form.Label>
        <Col xs={9}>
          <Form.Control
            id="jr-bulk-expected-answer-count"
            type="number"
            disabled={bulkSaving}
            onChange={onBulkExpectedAnswerCountChange}
            value={bulkExpectedAnswerCount}
            min={0}
            step={1}
          />
        </Col>
      </Form.Group>
      <hr />
      <Form.Group className="mb-3">
        <Form.Label htmlFor="jr-bulk-filter">Filter links</Form.Label>
        <Form.Control
          id="jr-bulk-filter"
          type="text"
          placeholder="Filter by title or URL"
          onChange={onBulkFilterChange}
          value={bulkFilter}
          disabled={bulkSaving}
        />
      </Form.Group>
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              <th style={{ width: "5%" }}>Add</th>
              <th style={{ width: "45%" }}>Title</th>
              <th style={{ width: "50%" }}>URL</th>
            </tr>
          </thead>
          <tbody>
            {filteredLinks.map((link) => (
              <tr key={link.id}>
                <td className="text-center">
                  <Form.Check
                    type="checkbox"
                    checked={link.checked}
                    disabled={bulkSaving || !link.url}
                    onChange={(e) =>
                      handleBulkCheckChange(link.id, e.target.checked)
                    }
                  />
                </td>
                <td>
                  <Form.Control
                    type="text"
                    size="sm"
                    value={link.guessedTitle}
                    disabled={bulkSaving}
                    onChange={(e) =>
                      handleBulkTitleChange(link.id, e.target.value)
                    }
                  />
                </td>
                <td>
                  <div className="text-truncate" title={link.url}>
                    {link.url}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <Form.Group className="mt-3 text-end">
        <Button variant="light" onClick={window.close} disabled={bulkSaving}>
          Close
        </Button>
        <Button type="submit" className="ms-2" disabled={bulkSaving}>
          Save All Checked
        </Button>
      </Form.Group>
      {bulkStatus && (
        <Alert
          variant={bulkStatus.failed > 0 ? "warning" : "success"}
          className="mt-3"
        >
          <Alert.Heading>Bulk Add Complete</Alert.Heading>
          <p>
            Successfully created {bulkStatus.success} puzzles.
            <br />
            Failed to create {bulkStatus.failed} puzzles.
          </p>
          {bulkStatus.errors.length > 0 && <hr />}
          {bulkStatus.errors.map((err, i) => (
            <div key={i}>
              <small>{err}</small>
            </div>
          ))}
        </Alert>
      )}
    </Form>
  );

  const contents =
    jollyRogerInstance !== "" && apiKey !== "" ? (
      <>
        <Form.Group as={Row} className="mb-3">
          <Form.Label column xs={3} htmlFor="jr-hunt">
            Hunt
          </Form.Label>
          <Col xs={9}>
            <Form.Select
              id="jr-hunt"
              value={hunt}
              onChange={onHuntChange}
              disabled={disableForm || bulkSaving}
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
        <Tabs
          defaultActiveKey="add-page"
          id="popup-tabs"
          className="mb-3"
          mountOnEnter
        >
          <Tab eventKey="add-page" title="Add Page">
            {form}
          </Tab>
          <Tab eventKey="bulk-add" title="Bulk Add">
            {bulkAddForm}
          </Tab>
        </Tabs>
      </>
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
