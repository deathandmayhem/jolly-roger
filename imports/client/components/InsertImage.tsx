import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import { faImage } from "@fortawesome/free-solid-svg-icons/faImage";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type React from "react";
import type { ChangeEvent, MouseEvent, SubmitEvent } from "react";
import {
  useCallback,
  useId,
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
import { useTranslation } from "react-i18next";
import createDocumentImageUpload from "../../methods/createDocumentImageUpload";
import type { ImageSource } from "../../methods/insertDocumentImage";
import insertDocumentImage from "../../methods/insertDocumentImage";
import type { Sheet } from "../../methods/listDocumentSheets";
import listDocumentSheets from "../../methods/listDocumentSheets";
import GoogleScriptInfo from "../GoogleScriptInfo";

type ImageInsertModalHandle = {
  show: () => void;
};

enum InsertImageSubmitState {
  IDLE,
  SUBMITTING,
  ERROR,
}

export class InvalidImage extends Error {}

const DIRECTLY_SUPPORTED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
]);

const DIRECTLY_SUPPORTED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif"]);

export const isDirectlySupported = (file: File): boolean => {
  if (file.type) {
    return DIRECTLY_SUPPORTED_MIME_TYPES.has(file.type.toLowerCase());
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  return DIRECTLY_SUPPORTED_EXTENSIONS.has(ext ?? "");
};

export const convertImageToPng = async (file: File): Promise<File> => {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", () =>
        reject(
          new InvalidImage(
            "This image format is not supported by your browser for conversion. Please use PNG, JPG, or GIF.",
          ),
        ),
      );
      image.src = url;
    });

    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      throw new InvalidImage("Image dimensions must be greater than zero.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new InvalidImage("Failed to get canvas 2D context.");
    }
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) {
          resolve(b);
        } else {
          reject(new InvalidImage("Failed to convert image to PNG."));
        }
      }, "image/png");
    });

    const baseName = file.name.replace(/\.[^./\\]+$/, "");
    const newFilename = `${baseName}.png`;
    return new File([blob], newFilename, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const validateImageForDirectUpload = async (
  file: File,
): Promise<string> => {
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

  const uploadFile = isDirectlySupported(file)
    ? file
    : await convertImageToPng(file);

  const upload = await createDocumentImageUpload.callPromise({
    documentId,
    filename: uploadFile.name,
    mimeType: uploadFile.type,
  });
  // If we don't get an upload spec back, then S3 isn't configured and we can
  // fall back to blob inserts
  if (!upload) {
    const validatedContents = await validateImageForDirectUpload(uploadFile);
    return {
      source: "upload",
      filename: uploadFile.name,
      contents: validatedContents,
    };
  }

  const { publicUrl, uploadUrl, fields } = upload;
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  formData.append("file", uploadFile);
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

const InsertImageModal = ({
  documentId,
  sheets,
  ref,
}: {
  documentId: string;
  sheets: Sheet[];
  ref: React.Ref<ImageInsertModalHandle>;
}) => {
  // Pop up by default when first rendered.
  const [visible, setVisible] = useState(true);
  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  useImperativeHandle(ref, () => ({ show }), [show]);

  const [submitState, setSubmitState] = useState(InsertImageSubmitState.IDLE);
  const [submitError, setSubmitError] = useState("");
  const clearError = useCallback(
    () => setSubmitState(InsertImageSubmitState.IDLE),
    [],
  );

  const [sheet, setSheet] = useState(sheets[0]?.id ?? 0);
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

  const [imageSource, setImageSource] = useState("upload");
  const onSelectTab = useCallback((k: string | null) => {
    if (k) {
      setImageSource(k);
    }
  }, []);

  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [fileInvalid, setFileInvalid] = useState(false);

  const onChangeFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const newFile = e.target.files?.[0];
    setFile(newFile);
    setFileInvalid(false);
    e.target.setCustomValidity("");
  }, []);

  const [url, setUrl] = useState("");
  const onChangeUrl = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  }, []);

  const onSubmit = useCallback(
    (e: SubmitEvent<HTMLFormElement>) => {
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

  const idPrefix = useId();

  const { t } = useTranslation();

  const modal = (
    <Modal show={visible} onHide={hide}>
      <Modal.Header closeButton>
        {t("puzzle.insertImage.insertImage", "Insert image")}
      </Modal.Header>
      <Form onSubmit={onSubmit}>
        <Modal.Body>
          <FormGroup className="mb-3" controlId={`${idPrefix}-sheet-select`}>
            <FormLabel>
              {t("puzzle.insertImage.chooseSheet", "Choose a sheet")}
            </FormLabel>
            <FormSelect
              id={`${idPrefix}-sheet-select`}
              onChange={onChangeSheet}
              value={sheet}
            >
              {sheetOptions}
            </FormSelect>
          </FormGroup>
          <Tabs activeKey={imageSource} onSelect={onSelectTab} className="mb-3">
            <Tab
              eventKey="upload"
              title={t("puzzle.insertImage.Upload", "Upload")}
            >
              <FormControl
                type="file"
                onChange={onChangeFile}
                isInvalid={fileInvalid}
                required={imageSource === "upload"}
                ref={fileRef}
                accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/bmp,image/svg+xml,.png,.jpg,.jpeg,.gif,.webp,.avif,.bmp,.svg"
              />
            </Tab>
            <Tab eventKey="link" title={t("puzzle.insertImage.link", "Link")}>
              <FormGroup className="mb-3" controlId={`${idPrefix}-image-link`}>
                <FormLabel>
                  {t("puzzle.insertImage.imageUrl", "Image URL")}
                </FormLabel>
                <FormControl
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
              {t("puzzle.insertImage.insert", "Insert")}
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
};

const InsertImage = ({ documentId }: { documentId: string }) => {
  useSubscribe("googleScriptInfo");
  const insertEnabled = useTracker(
    () => !!GoogleScriptInfo.findOne("googleScriptInfo")?.configured,
    [],
  );
  const [loading, setLoading] = useState(false);
  const [documentSheets, setDocumentSheets] = useState<Sheet[]>([]);
  const [renderInsertModal, setRenderInsertModal] = useState(false);
  const insertModalRef = useRef<ImageInsertModalHandle>(null);
  const [listSheetsError, setListSheetsError] = useState<string>();
  const clearListSheetsError = useCallback(
    () => setListSheetsError(undefined),
    [],
  );

  const { t } = useTranslation();

  const onStartInsert = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      setLoading(true);

      listDocumentSheets.call({ documentId }, (err, sheets) => {
        setLoading(false);
        if (err) {
          setListSheetsError(err.message);
        } else if (sheets) {
          setDocumentSheets(sheets);
          if (renderInsertModal && insertModalRef.current) {
            insertModalRef.current.show();
          } else {
            setRenderInsertModal(true);
          }
        }
      });
    },
    [documentId, renderInsertModal],
  );

  if (!insertEnabled) {
    return null;
  }

  const errorModal = (
    <Modal show onHide={clearListSheetsError}>
      <Modal.Header closeButton>
        Error fetching sheets in spreadsheet
      </Modal.Header>
      <Modal.Body>
        <p>
          Something went wrong while fetching the list of sheets in this
          spreadsheet (which we need to be able to insert an image). Please try
          again, or let us know if this keeps happening.
        </p>
        <p>Error message: {listSheetsError}</p>
      </Modal.Body>
    </Modal>
  );

  return (
    <>
      {renderInsertModal && (
        <InsertImageModal
          ref={insertModalRef}
          documentId={documentId}
          sheets={documentSheets}
        />
      )}
      {listSheetsError && createPortal(errorModal, document.body)}
      <Button
        variant="secondary"
        size="sm"
        onClick={onStartInsert}
        disabled={loading}
      >
        <FontAwesomeIcon icon={faImage} />{" "}
        {t("puzzle.insertImage.insertImage", "Insert image")}
        {loading && (
          <>
            {" "}
            <FontAwesomeIcon icon={faSpinner} spin />
          </>
        )}
      </Button>
    </>
  );
};

export default InsertImage;
