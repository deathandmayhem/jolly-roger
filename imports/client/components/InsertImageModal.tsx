import type { ChangeEvent, MouseEvent } from "react";
import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import FormSelect from "react-bootstrap/FormSelect";
import Modal from "react-bootstrap/Modal";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import { createPortal } from "react-dom";
import createDocumentImageUpload from "../../methods/createDocumentImageUpload";
import type { ImageSource } from "../../methods/insertDocumentImage";
import insertDocumentImage from "../../methods/insertDocumentImage";
import type { Sheet } from "../../methods/listDocumentSheets";

export type ImageInsertModalHandle = {
  show: () => void;
};

enum InsertImageSubmitState {
  IDLE,
  SUBMITTING,
  ERROR,
}

class InvalidImage extends Error {}

const validateImageForDirectUpload = async (file: File): Promise<string> => {
  if (file.size > 2 * 1024 * 1024) {
    throw new InvalidImage("Image must be less than 2MB");
  }

  const newFileContents = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      resolve(reader.result as string);
    });
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
  const newImagePixels = await new Promise<number>((resolve) => {
    const image = new Image();
    image.addEventListener("load", () => {
      resolve(image.width * image.height);
    });
    image.src = newFileContents;
  });

  if (newImagePixels > 1000000) {
    throw new InvalidImage(
      "Uploaded images must be less than 1 million pixels in area.",
    );
  }

  return newFileContents;
};

const makeImageSource = async ({
  documentId,
  imageSource,
  file,
  imageUrl,
}: {
  documentId: string;
  imageSource: string;
  file?: File;
  imageUrl: string;
}): Promise<ImageSource> => {
  if (imageSource === "link") {
    return {
      source: "link",
      url: imageUrl,
    };
  }

  if (!file) {
    throw new Error("No file provided");
  }

  const upload = await createDocumentImageUpload.callPromise({
    documentId,
    filename: file.name,
    mimeType: file.type,
  });
  // If we don't get an upload spec back, then S3 isn't configured and we can
  // fall back to blob inserts
  if (!upload) {
    const validatedContents = await validateImageForDirectUpload(file);
    return {
      source: "upload",
      filename: file.name,
      contents: validatedContents,
    };
  }

  const { publicUrl, uploadUrl, fields } = upload;
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  formData.append("file", file);
  await fetch(uploadUrl, {
    method: "POST",
    mode: "no-cors",
    body: formData,
  });

  return {
    source: "link",
    url: publicUrl,
  };
};

const InsertImageModal = React.forwardRef(
  (
    { documentId, sheets }: { documentId: string; sheets: Sheet[] },
    forwardedRef: React.Ref<ImageInsertModalHandle>,
  ) => {
    // Pop up by default when first rendered.
    const [visible, setVisible] = useState(true);
    const show = useCallback(() => setVisible(true), []);
    const hide = useCallback(() => setVisible(false), []);
    useImperativeHandle(forwardedRef, () => ({ show }), [show]);

    const [submitState, setSubmitState] = useState<InsertImageSubmitState>(
      InsertImageSubmitState.IDLE,
    );
    const [submitError, setSubmitError] = useState<string>("");
    const clearError = useCallback(
      () => setSubmitState(InsertImageSubmitState.IDLE),
      [],
    );

    const [sheet, setSheet] = useState<number>(sheets[0]?.id ?? 0);
    const onChangeSheet = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
      setSheet(parseInt(e.target.value, 10));
    }, []);

    const sheetOptions = useMemo(() => {
      return sheets.map((s) => {
        return (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        );
      });
    }, [sheets]);

    const [imageSource, setImageSource] = useState<string>("upload");
    const onSelectTab = useCallback((k: string | null) => {
      if (k) {
        setImageSource(k);
      }
    }, []);

    const fileRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File>();
    const [fileInvalid, setFileInvalid] = useState<boolean>(false);

    const onChangeFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
      const newFile = e.target.files?.[0];
      setFile(newFile);
      setFileInvalid(false);
      e.target.setCustomValidity("");
    }, []);

    const [url, setUrl] = useState<string>("");
    const onChangeUrl = useCallback((e: ChangeEvent<HTMLInputElement>) => {
      setUrl(e.target.value);
    }, []);

    const onSubmit = useCallback(
      (e: MouseEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();

        void (async () => {
          setSubmitState(InsertImageSubmitState.SUBMITTING);
          try {
            const image = await makeImageSource({
              documentId,
              imageSource,
              file,
              imageUrl: url,
            });

            await insertDocumentImage.callPromise({
              documentId,
              sheetId: sheet,
              image,
            });
            setSubmitState(InsertImageSubmitState.IDLE);
            hide();
          } catch (err) {
            if (err instanceof InvalidImage) {
              setFileInvalid(true);
              fileRef.current?.setCustomValidity(err.message);
              fileRef.current?.reportValidity();
              setSubmitState(InsertImageSubmitState.IDLE);
            } else {
              setSubmitState(InsertImageSubmitState.ERROR);
              setSubmitError(
                err instanceof Error ? err.message : "Unknown error",
              );
            }
          }
        })();
      },
      [documentId, imageSource, file, url, sheet, hide],
    );

    const submitDisabled = submitState === InsertImageSubmitState.SUBMITTING;

    const modal = (
      <Modal show={visible} onHide={hide}>
        <Modal.Header closeButton>Insert image</Modal.Header>
        <Form onSubmit={onSubmit}>
          <Modal.Body>
            <FormGroup className="mb-3">
              <FormLabel htmlFor="jr-puzzle-insert-image-sheet">
                Choose a sheet
              </FormLabel>
              <FormSelect
                id="jr-puzzle-insert-image-sheet"
                onChange={onChangeSheet}
                value={sheet}
              >
                {sheetOptions}
              </FormSelect>
            </FormGroup>
            <Tabs
              activeKey={imageSource}
              onSelect={onSelectTab}
              className="mb-3"
            >
              <Tab eventKey="upload" title="Upload">
                <FormControl
                  type="file"
                  onChange={onChangeFile}
                  isInvalid={fileInvalid}
                  required={imageSource === "upload"}
                  ref={fileRef}
                  accept=".png,.jpg,.jpeg,.gif"
                />
              </Tab>
              <Tab eventKey="link" title="Link">
                <FormGroup className="mb-3">
                  <FormLabel htmlFor="jr-puzzle-insert-image-link">
                    Image URL
                  </FormLabel>
                  <FormControl
                    id="jr-puzzle-insert-image-link"
                    type="url"
                    required={imageSource === "link"}
                    onChange={onChangeUrl}
                    value={url}
                  />
                </FormGroup>
              </Tab>
            </Tabs>
          </Modal.Body>
          <Modal.Footer>
            <div className="mb-3">
              <Button variant="primary" type="submit" disabled={submitDisabled}>
                Insert
              </Button>
            </div>
            {submitState === InsertImageSubmitState.ERROR ? (
              <Alert variant="danger" dismissible onClose={clearError}>
                {submitError}
              </Alert>
            ) : null}
          </Modal.Footer>
        </Form>
      </Modal>
    );

    return createPortal(modal, document.body);
  },
);

export default InsertImageModal;
