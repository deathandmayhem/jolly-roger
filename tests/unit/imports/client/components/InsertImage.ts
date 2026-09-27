import { assert } from "chai";
import {
  convertImageToPng,
  IMAGE_SIZE_LIMIT_ERROR,
  InvalidImage,
  isDirectlySupported,
  MAX_IMAGE_SIZE,
  validateImageSize,
} from "../../../../../imports/client/components/InsertImage";

describe("InsertImage", () => {
  describe("validateImageSize", () => {
    it("allows images up to 20 MiB", () => {
      const smallFile = new File(["small content"], "small.png", {
        type: "image/png",
      });
      assert.doesNotThrow(() => validateImageSize(smallFile));

      const exactLimitFile = new File([], "limit.png", { type: "image/png" });
      Object.defineProperty(exactLimitFile, "size", { value: MAX_IMAGE_SIZE });
      assert.doesNotThrow(() => validateImageSize(exactLimitFile));
    });

    it("throws InvalidImage for images larger than 20 MiB", () => {
      const largeFile = new File([], "large.png", { type: "image/png" });
      Object.defineProperty(largeFile, "size", { value: MAX_IMAGE_SIZE + 1 });

      assert.throws(
        () => validateImageSize(largeFile),
        InvalidImage,
        IMAGE_SIZE_LIMIT_ERROR,
      );
    });
  });

  describe("isDirectlySupported", () => {
    it("recognizes directly supported image formats", () => {
      assert.isTrue(
        isDirectlySupported(new File([""], "photo.png", { type: "image/png" })),
      );
      assert.isTrue(
        isDirectlySupported(
          new File([""], "photo.jpg", { type: "image/jpeg" }),
        ),
      );
      assert.isTrue(
        isDirectlySupported(
          new File([""], "photo.jpeg", { type: "image/jpeg" }),
        ),
      );
      assert.isTrue(
        isDirectlySupported(new File([""], "photo.gif", { type: "image/gif" })),
      );
    });

    it("accepts directly supported extensions even if MIME type is missing", () => {
      assert.isTrue(isDirectlySupported(new File([""], "photo.png")));
      assert.isTrue(isDirectlySupported(new File([""], "photo.jpg")));
      assert.isTrue(isDirectlySupported(new File([""], "photo.jpeg")));
      assert.isTrue(isDirectlySupported(new File([""], "photo.gif")));
    });

    it("identifies formats that require conversion", () => {
      assert.isFalse(
        isDirectlySupported(
          new File([""], "photo.webp", { type: "image/webp" }),
        ),
      );
      assert.isFalse(
        isDirectlySupported(
          new File([""], "photo.avif", { type: "image/avif" }),
        ),
      );
      assert.isFalse(
        isDirectlySupported(new File([""], "photo.bmp", { type: "image/bmp" })),
      );
      assert.isFalse(
        isDirectlySupported(
          new File([""], "photo.svg", { type: "image/svg+xml" }),
        ),
      );
    });
  });

  describe("convertImageToPng", () => {
    it("throws InvalidImage for invalid image data", async () => {
      if (
        typeof window === "undefined" ||
        typeof Image === "undefined" ||
        typeof URL === "undefined" ||
        typeof URL.createObjectURL !== "function"
      ) {
        return;
      }

      const invalidFile = new File(["not an image"], "test.webp", {
        type: "image/webp",
      });

      try {
        await convertImageToPng(invalidFile);
        assert.fail("Should have thrown InvalidImage");
      } catch (err) {
        assert.instanceOf(err, InvalidImage);
      }
    });

    it("converts an SVG to PNG with updated filename and MIME type", async () => {
      if (
        typeof window === "undefined" ||
        typeof Image === "undefined" ||
        typeof URL === "undefined" ||
        typeof URL.createObjectURL !== "function"
      ) {
        return;
      }

      const svgContent =
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="blue"/></svg>';
      const svgFile = new File([svgContent], "vector.svg", {
        type: "image/svg+xml",
      });

      const converted = await convertImageToPng(svgFile);
      assert.equal(converted.type, "image/png");
      assert.equal(converted.name, "vector.png");
    });
  });
});
