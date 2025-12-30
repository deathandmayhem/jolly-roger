/**
 * Require that documentation is kept up to date as the referenced files change.
 *
 * To do this, for each file in the docs directory, we look at the set of files
 * listed in the front matter and check when each of them last changed. If any
 * of them is more recent than the last commit to the doc file, then the doc is
 * out of date. (If the files have changed but the documentation doesn't require
 * changing, then you can update the "updated" date in the documentation, which
 * will bring the latest commit to the doc up to date with the changes to the
 * files it documents)
 */
import child from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import matter from "gray-matter";

const execFile = promisify(child.execFile);

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

interface NewerFile {
  file: string;
  commit: string;
}

type DocError =
  | {
      type: "out-of-date";
      doc: string;
      newerFiles: NewerFile[];
    }
  | {
      type: "missing-front-matter";
      doc: string;
    }
  | {
      type: "missing-updated-field";
      doc: string;
    }
  | {
      type: "missing-files";
      doc: string;
    }
  | {
      type: "file-not-found";
      doc: string;
      files: string[];
    };

const checkDoc = async (doc: string): Promise<DocError | undefined> => {
  const docMatter = matter(await fs.readFile(doc));

  if (!docMatter.data.updated) {
    return {
      type: "missing-updated-field",
      doc,
    };
  }

  // First: figure out how recent the documentation is by looking at the last
  // commit to the file.
  const { stdout: fileRevision } = await execFile("git", [
    "rev-list",
    "-1",
    "HEAD",
    "--",
    doc,
  ]);
  const docRevision = fileRevision.trim();

  // If the doc file has no revision, then it's probably a new file being
  // written, which is fine (definitionally newer than antyhing that's been
  // committed)
  if (!docRevision) return undefined;

  // Next: figure out if any of the referenced files are more recent than our
  // doc revision
  const files: string[] = docMatter.data.files;
  if (
    !files ||
    !Array.isArray(files) ||
    !files.every((file) => typeof file === "string")
  ) {
    return {
      type: "missing-files",
      doc,
    };
  }

  // First check that all files exist in the repository
  const fileExistenceChecks = await Promise.all(
    files.map(async (file) => {
      try {
        await execFile("git", ["ls-files", "--error-unmatch", file]);
        return { file, exists: true };
      } catch {
        return { file, exists: false };
      }
    }),
  );
  const missingFiles = fileExistenceChecks.filter((fc) => !fc.exists);
  if (missingFiles.length > 0) {
    return {
      type: "file-not-found",
      doc,
      files: missingFiles.map((mf) => mf.file),
    };
  }

  const fileChecks = await Promise.all(
    files.map(async (file) => {
      const { stdout: updated } = await execFile("git", [
        "rev-list",
        "-1",
        "HEAD",
        `^${docRevision}`,
        "--",
        file,
      ]);
      if (updated.trim().length > 0) {
        return { file, commit: updated.trim() };
      }

      return undefined;
    }),
  );
  const newerFiles = fileChecks.filter(
    (fc): fc is NewerFile => fc !== undefined,
  );
  if (newerFiles.length > 0) {
    return {
      type: "out-of-date",
      doc,
      newerFiles,
    };
  }

  return undefined;
};

const main = async () => {
  const docsDir = path.join(dirname, "..", "docs");
  const docs = await fs.readdir(docsDir);

  const results = await Promise.all(
    docs.map((doc) => checkDoc(path.join(docsDir, doc))),
  );
  const errors = results.filter(
    (result): result is DocError => result !== undefined,
  );

  if (errors.length > 0) {
    process.stderr.write("Documentation errors:\n\n");
    for (const error of errors) {
      switch (error.type) {
        case "out-of-date":
          process.stderr.write(
            `  ${path.basename(error.doc)} is out of date\n`,
          );
          for (const newerFile of error.newerFiles) {
            process.stderr.write(
              `    ${newerFile.file} was updated in ${newerFile.commit}\n`,
            );
          }
          process.stderr.write(
            `  To fix this, either update ${path.basename(
              error.doc,
            )} or, if no changes are needed, change the updated field to today's date.\n`,
          );
          break;
        case "missing-front-matter":
          process.stderr.write(`  ${error.doc} is missing front matter\n`);
          break;
        case "missing-updated-field":
          process.stderr.write(`  ${error.doc} is missing updated field\n`);
          break;
        case "missing-files":
          process.stderr.write(`  ${error.doc} is missing files field\n`);
          break;
        case "file-not-found":
          process.stderr.write(
            `  ${error.doc} references a file that does not exist\n`,
          );
          for (const file of error.files) {
            process.stderr.write(`    Missing file: ${file}\n`);
          }
          break;
        default:
          process.stderr.write(`  unknown error type ${error}\n`);
      }
      process.stderr.write("\n");
    }

    process.exit(1);
  }

  process.exit(0);
};

await main();
