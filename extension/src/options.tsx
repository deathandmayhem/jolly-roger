import React, { useCallback, useEffect, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { createRoot } from "react-dom/client";
import { storedOptions } from "./storage";

import "bootstrap/dist/css/bootstrap.min.css";

const Options = () => {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [jollyRogerInstance, setJollyRogerInstance] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");

  useEffect(() => {
    void (async () => {
      const options = await storedOptions.get();
      setJollyRogerInstance(options.jollyRogerInstance);
      setApiKey(options.apiKey);
      setLoading(false);
    })();
  }, []);

  const saveOptions: React.FormEventHandler = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setStatus("");
      setSaving(true);
      let hostUrl: URL;
      try {
        hostUrl = new URL(jollyRogerInstance);
      } catch (error) {
        setStatus("Invalid instance URL.");
        setSaving(false);
        return;
      }

      const hostPermission = { origins: [`*://${hostUrl.hostname}/*`] };

      void (async () => {
        // NOTE: There must not be any "await" calls above this one. Otherwise, Firefox rejects the
        // request because it does not appear to take place in response to a user action (submitting
        // the form), since the original action is lost in the ensuing stack trace.
        if (!(await chrome.permissions.request(hostPermission))) {
          setStatus("Permission not granted to Jolly Roger instance.");
          setSaving(false);
          return;
        }
        await storedOptions.put({
          jollyRogerInstance,
          apiKey,
        });
        setStatus("Settings saved.");
        setSaving(false);
      })();
    },
    [apiKey, jollyRogerInstance],
  );

  const onJollyRogerInstanceChange: React.ChangeEventHandler<HTMLInputElement> =
    useCallback((event) => {
      setJollyRogerInstance(event.target.value);
    }, []);

  const onApiKeyChange: React.ChangeEventHandler<HTMLInputElement> =
    useCallback((event) => {
      setApiKey(event.target.value);
    }, []);

  const form = (
    <Form onSubmit={saveOptions}>
      <Form.Group>
        <Form.Label htmlFor="jr-instance">Jolly Roger instance</Form.Label>
        <Form.Control
          id="jr-instance"
          onChange={onJollyRogerInstanceChange}
          defaultValue={jollyRogerInstance}
          disabled={saving}
        />
        <Form.Text className="text-muted">
          URL of the Jolly Roger instance to connect to.
        </Form.Text>
      </Form.Group>
      <Form.Group className="mt-3">
        <Form.Label htmlFor="jr-api-key">API key</Form.Label>
        <Form.Control
          id="jr-api-key"
          onChange={onApiKeyChange}
          defaultValue={apiKey}
          type="password"
          disabled={saving}
        />
        <Form.Text className="text-muted">
          API key to use for authentication. Generate one on your Jolly Roger
          &quot;My Profile&quot; page, under &quot;Advanced&quot;.
        </Form.Text>
      </Form.Group>
      <Form.Group className="mt-3">
        <Button type="submit" disabled={saving}>
          Save
        </Button>
      </Form.Group>
      <Alert variant="primary" className="mt-3" show={status !== ""}>
        {status}
      </Alert>
    </Form>
  );

  return (
    <div className="p-3">
      <h1>Jolly Roger Browser Extension</h1>
      <hr />
      {loading ? <div>loading...</div> : form}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>,
);
