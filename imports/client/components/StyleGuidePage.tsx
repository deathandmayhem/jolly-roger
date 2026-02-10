import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";
import { faCaretRight } from "@fortawesome/free-solid-svg-icons/faCaretRight";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons/faCircleCheck";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons/faCircleInfo";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faPuzzlePiece } from "@fortawesome/free-solid-svg-icons/faPuzzlePiece";
import { faSearch } from "@fortawesome/free-solid-svg-icons/faSearch";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons/faTriangleExclamation";
import { faXmarkCircle } from "@fortawesome/free-solid-svg-icons/faXmarkCircle";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import useTailwindTheme from "../hooks/useTailwindTheme";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const PaletteSwatch = ({
  label,
  className,
}: {
  label: string;
  className: string;
}) => (
  <div
    className={`${className} h-7 rounded flex items-center justify-center text-[10px] font-mono leading-none`}
  >
    {label}
  </div>
);

const PaletteRow = ({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center gap-2">
    <div className="w-20 shrink-0 text-xs font-semibold capitalize text-right">
      {name}
    </div>
    <div className="grid grid-cols-11 gap-0.5 flex-1">{children}</div>
  </div>
);

const ButtonRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center gap-2">
    <div className="w-16 shrink-0 text-xs font-semibold text-right">
      {label}
    </div>
    <div className="flex flex-wrap items-center gap-1.5">{children}</div>
  </div>
);

const BadgeRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center gap-2">
    <div className="w-16 shrink-0 text-xs font-semibold text-right">
      {label}
    </div>
    <div className="flex flex-wrap items-center gap-1.5">{children}</div>
  </div>
);

const AnnotatedExample = ({
  title,
  annotation,
  children,
}: {
  title: string;
  annotation: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <h4 className="font-semibold text-sm">{title}</h4>
    <div className="rounded-lg border border-base-300 overflow-hidden">
      <div className="p-4 bg-base-100">{children}</div>
      <div className="bg-base-300 px-3 py-1.5">
        <code className="text-xs font-mono opacity-80">{annotation}</code>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Guide sections (new / rewritten)
// ---------------------------------------------------------------------------

const PageLayoutSection = () => {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold font-display">Page Layout</h2>
      <p className="text-sm opacity-60">
        During the migration, every Tailwind page uses a two-element wrapper: a
        scope root that isolates Tailwind/daisyUI styles from Bootstrap, and a
        child that carries all layout utilities. Utility classes on the scope
        root itself are ignored by{" "}
        <code className="font-mono text-xs">@scope</code>. Post-migration, the{" "}
        <code className="font-mono text-xs">.tailwind-page</code> wrapper goes
        away.
      </p>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body py-4 space-y-2">
          <div className="border-2 border-dashed border-primary/30 rounded-lg p-3">
            <div className="text-[10px] font-mono text-primary opacity-70 mb-2">
              .tailwind-page (scope root &mdash; scoping only)
            </div>
            <div className="border border-dashed border-secondary/30 rounded bg-base-200 p-3">
              <div className="text-[10px] font-mono text-secondary opacity-70 mb-2">
                font-body min-h-screen bg-base-200 p-4 pb-16
              </div>
              <div className="border border-dashed border-accent/30 rounded bg-base-100 p-3 max-w-xs mx-auto">
                <div className="text-[10px] font-mono text-accent opacity-70 mb-1">
                  max-w-4xl mx-auto space-y-8
                </div>
                <div className="text-sm opacity-40 text-center">
                  Page content
                </div>
              </div>
            </div>
          </div>
          <code className="block text-xs font-mono opacity-60">
            {'<div className="tailwind-page" data-theme={theme}>'}
            <br />
            {
              '  <main className="font-body min-h-screen bg-base-200 p-4 pb-16">'
            }
            <br />
            {'    <div className="max-w-4xl mx-auto space-y-8">...'}
          </code>
        </div>
      </div>
    </section>
  );
};

const TypographySection = () => {
  const roles: {
    role: string;
    classes: string;
    example: string;
    render: React.ReactNode;
  }[] = [
    {
      role: "Page title",
      classes: "text-2xl font-bold font-display",
      example: "Profile",
      render: <span className="text-2xl font-bold font-display">Profile</span>,
    },
    {
      role: "Hero / display",
      classes: "text-4xl font-bold font-display",
      example: "Hunt hero card",
      render: (
        <span className="text-4xl font-bold font-display leading-tight">
          Mystery Hunt
        </span>
      ),
    },
    {
      role: "Section title",
      classes: "text-lg font-semibold",
      example: "Settings section",
      render: <span className="text-lg font-semibold">Audio Settings</span>,
    },
    {
      role: "Card title",
      classes: "text-lg font-semibold",
      example: "Puzzle card",
      render: <span className="text-lg font-semibold">Star Charts</span>,
    },
    {
      role: "Subsection / group",
      classes: "font-semibold",
      example: "Inline header",
      render: <span className="font-semibold">Round 1</span>,
    },
    {
      role: "Form label",
      classes: "font-medium",
      example: "Input label",
      render: <span className="font-medium">Display Name</span>,
    },
    {
      role: "Body",
      classes: "(inherited from font-body)",
      example: "Paragraph text",
      render: (
        <span className="font-body">The quick brown fox jumps over...</span>
      ),
    },
    {
      role: "Secondary / hint",
      classes: "text-sm opacity-60",
      example: "Hint, timestamp",
      render: (
        <span className="text-sm opacity-60">Visible to other solvers</span>
      ),
    },
    {
      role: "Badge / tag",
      classes: "text-xs font-semibold",
      example: "Status badges",
      render: <span className="text-xs font-semibold uppercase">Solved</span>,
    },
    {
      role: "Mono / code",
      classes: "font-mono text-sm",
      example: "Answers, URLs",
      render: (
        <span className="font-mono text-sm tracking-wider">CONSTELLATION</span>
      ),
    },
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold font-display">Typography</h2>
      <p className="text-sm opacity-60">
        Role-based type scale. Pick classes by the role text plays in the UI,
        not by HTML heading level. Still use semantic elements (
        <code className="font-mono text-xs">h1</code>,{" "}
        <code className="font-mono text-xs">h2</code>, etc.) for the underlying
        markup.
      </p>

      <div className="card bg-base-100 shadow-sm overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Classes</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(({ role, classes, render }) => (
              <tr key={role}>
                <td className="text-sm font-medium whitespace-nowrap">
                  {role}
                </td>
                <td>
                  <code className="text-xs font-mono bg-base-200 px-1.5 py-0.5 rounded">
                    {classes}
                  </code>
                </td>
                <td className="text-base">{render}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const TextHierarchySection = () => {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold font-display">Text Hierarchy</h2>
      <p className="text-sm opacity-60">
        daisyUI component classes handle most text hierarchy automatically.
        Prefer these over manual opacity utilities.
      </p>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body space-y-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">daisyUI defaults</h3>
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <code className="text-xs font-mono w-32 shrink-0">.label</code>
                <fieldset className="fieldset p-0">
                  <p className="label p-0 m-0">
                    Muted text at 60% &mdash; hints, metadata
                  </p>
                </fieldset>
              </div>
              <div className="flex items-baseline gap-3">
                <code className="text-xs font-mono w-32 shrink-0">
                  text-success
                </code>
                <span className="text-success text-sm">Saved</span>
              </div>
              <div className="flex items-baseline gap-3">
                <code className="text-xs font-mono w-32 shrink-0">
                  text-error
                </code>
                <span className="text-error text-sm">Save failed</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">
              Fallback for custom layouts
            </h3>
            <p className="text-sm opacity-60">
              Outside daisyUI components (data rows, empty states), explicit
              opacity replicates the same effect.
            </p>
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <code className="text-xs font-mono w-32 shrink-0">
                  opacity-60
                </code>
                <span className="opacity-60">Secondary text, timestamps</span>
              </div>
              <div className="flex items-baseline gap-3">
                <code className="text-xs font-mono w-32 shrink-0">
                  opacity-30
                </code>
                <span className="opacity-30">
                  Decorative icons, empty-state illustrations
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const CommonPatternsSection = () => {
  const [listOpen, setListOpen] = useState(true);

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold font-display">Common Patterns</h2>
      <p className="text-sm opacity-60">
        Realistic mini-compositions showing how the building blocks combine.
      </p>

      <div className="space-y-6">
        <AnnotatedExample
          title="Settings section"
          annotation="details.collapse.collapse-arrow > summary.collapse-title.bg-base-300 + div.collapse-content"
        >
          <details
            className="collapse collapse-arrow bg-base-100 border border-base-300"
            open
          >
            <summary className="collapse-title font-semibold bg-base-300 min-h-0 py-2 text-sm">
              Audio Settings
              <span className="badge badge-sm badge-ghost ml-2">3 items</span>
            </summary>
            <div className="collapse-content">
              <div className="pt-3 text-sm opacity-60">
                Microphone, speaker, and noise-gate options.
              </div>
            </div>
          </details>
        </AnnotatedExample>

        <AnnotatedExample
          title="List with chevron toggle"
          annotation="button + rotating caret icon + conditional children"
        >
          <div>
            <button
              type="button"
              className="flex items-center gap-2 font-semibold text-sm"
              onClick={() => setListOpen(!listOpen)}
            >
              <FontAwesomeIcon
                icon={listOpen ? faCaretDown : faCaretRight}
                className="w-3"
              />
              Round 1 Puzzles
              <span className="badge badge-sm badge-ghost">3</span>
            </button>
            {listOpen && (
              <ul className="mt-2 ml-5 space-y-1 text-sm">
                <li>Star Charts</li>
                <li>Word Salad</li>
                <li>Final Runaround</li>
              </ul>
            )}
          </div>
        </AnnotatedExample>

        <AnnotatedExample
          title="Form field with status"
          annotation="fieldset.fieldset > div.label (font-medium + text-success status) + input + p.label (hint)"
        >
          <fieldset className="fieldset">
            <div className="label flex justify-between">
              <span className="font-medium">Display Name</span>
              <span className="flex items-center gap-1 text-success text-xs">
                <FontAwesomeIcon icon={faCircleCheck} size="xs" />
                Saved
              </span>
            </div>
            <input
              type="text"
              className="input w-full"
              defaultValue="Alice"
              readOnly
            />
            <p className="label whitespace-normal">
              Visible to other solvers in this hunt.
            </p>
          </fieldset>
        </AnnotatedExample>

        <AnnotatedExample
          title="Empty state"
          annotation="flex flex-col items-center text-center + opacity-30 icon + opacity-60 hint"
        >
          <div className="flex flex-col items-center justify-center text-center py-8">
            <FontAwesomeIcon
              icon={faPuzzlePiece}
              className="text-3xl opacity-30 mb-3"
            />
            <p className="font-semibold">No puzzles yet</p>
            <p className="text-sm opacity-60 mt-1">
              Add a puzzle to get started.
            </p>
            <button type="button" className="btn btn-primary btn-sm mt-3">
              <FontAwesomeIcon icon={faPlus} />
              Add Puzzle
            </button>
          </div>
        </AnnotatedExample>

        <AnnotatedExample
          title="Skeleton loading"
          annotation="skeleton h-* w-* classes for shimmer placeholders"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="skeleton h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-3 w-48" />
              </div>
            </div>
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-5/6" />
            <div className="skeleton h-3 w-4/6" />
          </div>
        </AnnotatedExample>
      </div>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Component reference sections (existing, kept intact)
// ---------------------------------------------------------------------------

const ColorsSection = () => {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold font-display">Colors</h2>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Semantic</h3>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          <div className="bg-primary text-primary-content rounded h-12 flex items-center justify-center text-xs font-medium">
            primary
          </div>
          <div className="bg-secondary text-secondary-content rounded h-12 flex items-center justify-center text-xs font-medium">
            secondary
          </div>
          <div className="bg-accent text-accent-content rounded h-12 flex items-center justify-center text-xs font-medium">
            accent
          </div>
          <div className="bg-success text-success-content rounded h-12 flex items-center justify-center text-xs font-medium">
            success
          </div>
          <div className="bg-info text-info-content rounded h-12 flex items-center justify-center text-xs font-medium">
            info
          </div>
          <div className="bg-warning text-warning-content rounded h-12 flex items-center justify-center text-xs font-medium">
            warning
          </div>
          <div className="bg-error text-error-content rounded h-12 flex items-center justify-center text-xs font-medium">
            error
          </div>
          <div className="bg-neutral text-neutral-content rounded h-12 flex items-center justify-center text-xs font-medium">
            neutral
          </div>
        </div>

        <h3 className="text-sm font-semibold">Base / Surface</h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-base-100 rounded h-10 flex items-center justify-center text-base-content border border-base-300 text-xs font-medium">
            base-100
          </div>
          <div className="bg-base-200 rounded h-10 flex items-center justify-center text-base-content border border-base-300 text-xs font-medium">
            base-200
          </div>
          <div className="bg-base-300 rounded h-10 flex items-center justify-center text-base-content border border-base-300 text-xs font-medium">
            base-300
          </div>
        </div>

        <h3 className="text-sm font-semibold">Palettes</h3>
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body py-3 px-4 space-y-1">
            <PaletteRow name="gonzo">
              <PaletteSwatch
                label="50"
                className="bg-gonzo-50 text-gonzo-950"
              />
              <PaletteSwatch
                label="100"
                className="bg-gonzo-100 text-gonzo-950"
              />
              <PaletteSwatch
                label="200"
                className="bg-gonzo-200 text-gonzo-950"
              />
              <PaletteSwatch
                label="300"
                className="bg-gonzo-300 text-gonzo-950"
              />
              <PaletteSwatch
                label="400"
                className="bg-gonzo-400 text-gonzo-950"
              />
              <PaletteSwatch
                label="500"
                className="bg-gonzo-500 text-gonzo-50"
              />
              <PaletteSwatch
                label="600"
                className="bg-gonzo-600 text-gonzo-50"
              />
              <PaletteSwatch
                label="700"
                className="bg-gonzo-700 text-gonzo-50"
              />
              <PaletteSwatch
                label="800"
                className="bg-gonzo-800 text-gonzo-50"
              />
              <PaletteSwatch
                label="900"
                className="bg-gonzo-900 text-gonzo-50"
              />
              <PaletteSwatch
                label="950"
                className="bg-gonzo-950 text-gonzo-50"
              />
            </PaletteRow>

            <PaletteRow name="fozzie">
              <PaletteSwatch
                label="50"
                className="bg-fozzie-50 text-fozzie-950"
              />
              <PaletteSwatch
                label="100"
                className="bg-fozzie-100 text-fozzie-950"
              />
              <PaletteSwatch
                label="200"
                className="bg-fozzie-200 text-fozzie-950"
              />
              <PaletteSwatch
                label="300"
                className="bg-fozzie-300 text-fozzie-950"
              />
              <PaletteSwatch
                label="400"
                className="bg-fozzie-400 text-fozzie-950"
              />
              <PaletteSwatch
                label="500"
                className="bg-fozzie-500 text-fozzie-50"
              />
              <PaletteSwatch
                label="600"
                className="bg-fozzie-600 text-fozzie-50"
              />
              <PaletteSwatch
                label="700"
                className="bg-fozzie-700 text-fozzie-50"
              />
              <PaletteSwatch
                label="800"
                className="bg-fozzie-800 text-fozzie-50"
              />
              <PaletteSwatch
                label="900"
                className="bg-fozzie-900 text-fozzie-50"
              />
              <PaletteSwatch
                label="950"
                className="bg-fozzie-950 text-fozzie-50"
              />
            </PaletteRow>

            <PaletteRow name="kermit">
              <PaletteSwatch
                label="50"
                className="bg-kermit-50 text-kermit-950"
              />
              <PaletteSwatch
                label="100"
                className="bg-kermit-100 text-kermit-950"
              />
              <PaletteSwatch
                label="200"
                className="bg-kermit-200 text-kermit-950"
              />
              <PaletteSwatch
                label="300"
                className="bg-kermit-300 text-kermit-950"
              />
              <PaletteSwatch
                label="400"
                className="bg-kermit-400 text-kermit-950"
              />
              <PaletteSwatch
                label="500"
                className="bg-kermit-500 text-kermit-50"
              />
              <PaletteSwatch
                label="600"
                className="bg-kermit-600 text-kermit-50"
              />
              <PaletteSwatch
                label="700"
                className="bg-kermit-700 text-kermit-50"
              />
              <PaletteSwatch
                label="800"
                className="bg-kermit-800 text-kermit-50"
              />
              <PaletteSwatch
                label="900"
                className="bg-kermit-900 text-kermit-50"
              />
              <PaletteSwatch
                label="950"
                className="bg-kermit-950 text-kermit-50"
              />
            </PaletteRow>

            <PaletteRow name="oscar">
              <PaletteSwatch
                label="50"
                className="bg-oscar-50 text-oscar-950"
              />
              <PaletteSwatch
                label="100"
                className="bg-oscar-100 text-oscar-950"
              />
              <PaletteSwatch
                label="200"
                className="bg-oscar-200 text-oscar-950"
              />
              <PaletteSwatch
                label="300"
                className="bg-oscar-300 text-oscar-950"
              />
              <PaletteSwatch
                label="400"
                className="bg-oscar-400 text-oscar-950"
              />
              <PaletteSwatch
                label="500"
                className="bg-oscar-500 text-oscar-50"
              />
              <PaletteSwatch
                label="600"
                className="bg-oscar-600 text-oscar-50"
              />
              <PaletteSwatch
                label="700"
                className="bg-oscar-700 text-oscar-50"
              />
              <PaletteSwatch
                label="800"
                className="bg-oscar-800 text-oscar-50"
              />
              <PaletteSwatch
                label="900"
                className="bg-oscar-900 text-oscar-50"
              />
              <PaletteSwatch
                label="950"
                className="bg-oscar-950 text-oscar-50"
              />
            </PaletteRow>

            <PaletteRow name="zoot">
              <PaletteSwatch label="50" className="bg-zoot-50 text-zoot-950" />
              <PaletteSwatch
                label="100"
                className="bg-zoot-100 text-zoot-950"
              />
              <PaletteSwatch
                label="200"
                className="bg-zoot-200 text-zoot-950"
              />
              <PaletteSwatch
                label="300"
                className="bg-zoot-300 text-zoot-950"
              />
              <PaletteSwatch
                label="400"
                className="bg-zoot-400 text-zoot-950"
              />
              <PaletteSwatch label="500" className="bg-zoot-500 text-zoot-50" />
              <PaletteSwatch label="600" className="bg-zoot-600 text-zoot-50" />
              <PaletteSwatch label="700" className="bg-zoot-700 text-zoot-50" />
              <PaletteSwatch label="800" className="bg-zoot-800 text-zoot-50" />
              <PaletteSwatch label="900" className="bg-zoot-900 text-zoot-50" />
              <PaletteSwatch label="950" className="bg-zoot-950 text-zoot-50" />
            </PaletteRow>

            <PaletteRow name="janice">
              <PaletteSwatch
                label="50"
                className="bg-janice-50 text-janice-950"
              />
              <PaletteSwatch
                label="100"
                className="bg-janice-100 text-janice-950"
              />
              <PaletteSwatch
                label="200"
                className="bg-janice-200 text-janice-950"
              />
              <PaletteSwatch
                label="300"
                className="bg-janice-300 text-janice-950"
              />
              <PaletteSwatch
                label="400"
                className="bg-janice-400 text-janice-950"
              />
              <PaletteSwatch
                label="500"
                className="bg-janice-500 text-janice-50"
              />
              <PaletteSwatch
                label="600"
                className="bg-janice-600 text-janice-50"
              />
              <PaletteSwatch
                label="700"
                className="bg-janice-700 text-janice-50"
              />
              <PaletteSwatch
                label="800"
                className="bg-janice-800 text-janice-50"
              />
              <PaletteSwatch
                label="900"
                className="bg-janice-900 text-janice-50"
              />
              <PaletteSwatch
                label="950"
                className="bg-janice-950 text-janice-50"
              />
            </PaletteRow>

            <PaletteRow name="animal">
              <PaletteSwatch
                label="50"
                className="bg-animal-50 text-animal-950"
              />
              <PaletteSwatch
                label="100"
                className="bg-animal-100 text-animal-950"
              />
              <PaletteSwatch
                label="200"
                className="bg-animal-200 text-animal-950"
              />
              <PaletteSwatch
                label="300"
                className="bg-animal-300 text-animal-950"
              />
              <PaletteSwatch
                label="400"
                className="bg-animal-400 text-animal-950"
              />
              <PaletteSwatch
                label="500"
                className="bg-animal-500 text-animal-50"
              />
              <PaletteSwatch
                label="600"
                className="bg-animal-600 text-animal-50"
              />
              <PaletteSwatch
                label="700"
                className="bg-animal-700 text-animal-50"
              />
              <PaletteSwatch
                label="800"
                className="bg-animal-800 text-animal-50"
              />
              <PaletteSwatch
                label="900"
                className="bg-animal-900 text-animal-50"
              />
              <PaletteSwatch
                label="950"
                className="bg-animal-950 text-animal-50"
              />
            </PaletteRow>
          </div>
        </div>
      </div>
    </section>
  );
};

const ButtonsSection = () => {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold font-display">Buttons</h2>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body py-3 px-4 space-y-2">
          <ButtonRow label="Solid">
            <button type="button" className="btn btn-sm btn-neutral">
              Neutral
            </button>
            <button type="button" className="btn btn-sm btn-primary">
              Primary
            </button>
            <button type="button" className="btn btn-sm btn-secondary">
              Secondary
            </button>
            <button type="button" className="btn btn-sm btn-accent">
              Accent
            </button>
            <button type="button" className="btn btn-sm btn-info">
              Info
            </button>
            <button type="button" className="btn btn-sm btn-success">
              Success
            </button>
            <button type="button" className="btn btn-sm btn-warning">
              Warning
            </button>
            <button type="button" className="btn btn-sm btn-error">
              Error
            </button>
          </ButtonRow>

          <ButtonRow label="Outline">
            <button
              type="button"
              className="btn btn-sm btn-outline btn-neutral"
            >
              Neutral
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline btn-primary"
            >
              Primary
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline btn-secondary"
            >
              Secondary
            </button>
            <button type="button" className="btn btn-sm btn-outline btn-accent">
              Accent
            </button>
            <button type="button" className="btn btn-sm btn-outline btn-info">
              Info
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline btn-success"
            >
              Success
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline btn-warning"
            >
              Warning
            </button>
            <button type="button" className="btn btn-sm btn-outline btn-error">
              Error
            </button>
          </ButtonRow>

          <ButtonRow label="Soft">
            <button type="button" className="btn btn-sm btn-soft btn-neutral">
              Neutral
            </button>
            <button type="button" className="btn btn-sm btn-soft btn-primary">
              Primary
            </button>
            <button type="button" className="btn btn-sm btn-soft btn-secondary">
              Secondary
            </button>
            <button type="button" className="btn btn-sm btn-soft btn-accent">
              Accent
            </button>
            <button type="button" className="btn btn-sm btn-soft btn-info">
              Info
            </button>
            <button type="button" className="btn btn-sm btn-soft btn-success">
              Success
            </button>
            <button type="button" className="btn btn-sm btn-soft btn-warning">
              Warning
            </button>
            <button type="button" className="btn btn-sm btn-soft btn-error">
              Error
            </button>
          </ButtonRow>

          <ButtonRow label="Dash">
            <button type="button" className="btn btn-sm btn-dash btn-neutral">
              Neutral
            </button>
            <button type="button" className="btn btn-sm btn-dash btn-primary">
              Primary
            </button>
            <button type="button" className="btn btn-sm btn-dash btn-secondary">
              Secondary
            </button>
            <button type="button" className="btn btn-sm btn-dash btn-accent">
              Accent
            </button>
            <button type="button" className="btn btn-sm btn-dash btn-info">
              Info
            </button>
            <button type="button" className="btn btn-sm btn-dash btn-success">
              Success
            </button>
            <button type="button" className="btn btn-sm btn-dash btn-warning">
              Warning
            </button>
            <button type="button" className="btn btn-sm btn-dash btn-error">
              Error
            </button>
          </ButtonRow>

          <ButtonRow label="Ghost">
            <button type="button" className="btn btn-sm btn-ghost">
              Default
            </button>
            <button type="button" className="btn btn-sm btn-link">
              Link
            </button>
          </ButtonRow>

          <ButtonRow label="Sizes">
            <button type="button" className="btn btn-primary btn-lg">
              Large
            </button>
            <button type="button" className="btn btn-primary">
              Default
            </button>
            <button type="button" className="btn btn-primary btn-sm">
              Small
            </button>
            <button type="button" className="btn btn-primary btn-xs">
              Tiny
            </button>
          </ButtonRow>

          <ButtonRow label="States">
            <button type="button" className="btn btn-sm btn-primary" disabled>
              Disabled
            </button>
            <button type="button" className="btn btn-sm btn-primary">
              <span className="loading loading-spinner loading-xs" />
              Loading
            </button>
          </ButtonRow>
        </div>
      </div>
    </section>
  );
};

const BadgesSection = () => {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold font-display">Badges</h2>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body py-3 px-4 space-y-2">
          <BadgeRow label="Solid">
            <span className="badge badge-primary">primary</span>
            <span className="badge badge-secondary">secondary</span>
            <span className="badge badge-accent">accent</span>
            <span className="badge badge-success">success</span>
            <span className="badge badge-info">info</span>
            <span className="badge badge-warning">warning</span>
            <span className="badge badge-error">error</span>
            <span className="badge badge-neutral">neutral</span>
          </BadgeRow>

          <BadgeRow label="Outline">
            <span className="badge badge-outline badge-primary">primary</span>
            <span className="badge badge-outline badge-secondary">
              secondary
            </span>
            <span className="badge badge-outline badge-accent">accent</span>
            <span className="badge badge-outline badge-success">success</span>
            <span className="badge badge-outline badge-info">info</span>
            <span className="badge badge-outline badge-warning">warning</span>
            <span className="badge badge-outline badge-error">error</span>
            <span className="badge badge-outline badge-neutral">neutral</span>
          </BadgeRow>

          <BadgeRow label="Soft">
            <span className="badge badge-soft badge-primary">primary</span>
            <span className="badge badge-soft badge-secondary">secondary</span>
            <span className="badge badge-soft badge-accent">accent</span>
            <span className="badge badge-soft badge-success">success</span>
            <span className="badge badge-soft badge-info">info</span>
            <span className="badge badge-soft badge-warning">warning</span>
            <span className="badge badge-soft badge-error">error</span>
            <span className="badge badge-soft badge-neutral">neutral</span>
          </BadgeRow>

          <BadgeRow label="Dash">
            <span className="badge badge-dash badge-primary">primary</span>
            <span className="badge badge-dash badge-secondary">secondary</span>
            <span className="badge badge-dash badge-accent">accent</span>
            <span className="badge badge-dash badge-success">success</span>
            <span className="badge badge-dash badge-info">info</span>
            <span className="badge badge-dash badge-warning">warning</span>
            <span className="badge badge-dash badge-error">error</span>
            <span className="badge badge-dash badge-neutral">neutral</span>
          </BadgeRow>

          <BadgeRow label="Sizes">
            <span className="badge badge-primary badge-lg">Large</span>
            <span className="badge badge-primary">Default</span>
            <span className="badge badge-primary badge-sm">Small</span>
            <span className="badge badge-primary badge-xs">Tiny</span>
          </BadgeRow>

          <BadgeRow label="Ghost">
            <span className="badge badge-ghost">untagged</span>
            <span className="badge badge-sm badge-ghost">meta</span>
            <span className="badge badge-sm badge-ghost">group:round-1</span>
          </BadgeRow>
        </div>
      </div>
    </section>
  );
};

const AlertsSection = () => {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold font-display">Alerts</h2>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body py-3 px-4 space-y-3">
          <h3 className="text-sm font-semibold">Default</h3>
          <div className="space-y-2">
            <div className="alert alert-success py-2">
              <FontAwesomeIcon icon={faCircleCheck} />
              <span>Puzzle solved! Great work.</span>
            </div>
            <div className="alert alert-info py-2">
              <FontAwesomeIcon icon={faCircleInfo} />
              <span>A new round has been released.</span>
            </div>
            <div className="alert alert-warning py-2">
              <FontAwesomeIcon icon={faTriangleExclamation} />
              <span>Google integration is disabled.</span>
            </div>
            <div className="alert alert-error py-2">
              <FontAwesomeIcon icon={faXmarkCircle} />
              <span>Failed to save changes.</span>
            </div>
          </div>

          <h3 className="text-sm font-semibold">Outline</h3>
          <div className="space-y-2">
            <div className="alert alert-outline alert-success py-2">
              <FontAwesomeIcon icon={faCircleCheck} />
              <span>Success outline</span>
            </div>
            <div className="alert alert-outline alert-info py-2">
              <FontAwesomeIcon icon={faCircleInfo} />
              <span>Info outline</span>
            </div>
            <div className="alert alert-outline alert-warning py-2">
              <FontAwesomeIcon icon={faTriangleExclamation} />
              <span>Warning outline</span>
            </div>
            <div className="alert alert-outline alert-error py-2">
              <FontAwesomeIcon icon={faXmarkCircle} />
              <span>Error outline</span>
            </div>
          </div>

          <h3 className="text-sm font-semibold">Soft</h3>
          <div className="space-y-2">
            <div className="alert alert-soft alert-success py-2">
              <FontAwesomeIcon icon={faCircleCheck} />
              <span>Success soft</span>
            </div>
            <div className="alert alert-soft alert-info py-2">
              <FontAwesomeIcon icon={faCircleInfo} />
              <span>Info soft</span>
            </div>
            <div className="alert alert-soft alert-warning py-2">
              <FontAwesomeIcon icon={faTriangleExclamation} />
              <span>Warning soft</span>
            </div>
            <div className="alert alert-soft alert-error py-2">
              <FontAwesomeIcon icon={faXmarkCircle} />
              <span>Error soft</span>
            </div>
          </div>

          <h3 className="text-sm font-semibold">Dash</h3>
          <div className="space-y-2">
            <div className="alert alert-dash alert-success py-2">
              <FontAwesomeIcon icon={faCircleCheck} />
              <span>Success dash</span>
            </div>
            <div className="alert alert-dash alert-info py-2">
              <FontAwesomeIcon icon={faCircleInfo} />
              <span>Info dash</span>
            </div>
            <div className="alert alert-dash alert-warning py-2">
              <FontAwesomeIcon icon={faTriangleExclamation} />
              <span>Warning dash</span>
            </div>
            <div className="alert alert-dash alert-error py-2">
              <FontAwesomeIcon icon={faXmarkCircle} />
              <span>Error dash</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const FormControlsSection = () => {
  const [checked, setChecked] = useState(false);
  const [toggled, setToggled] = useState(true);

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold font-display">Form Controls</h2>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body space-y-4">
          <fieldset className="fieldset">
            <div className="label">
              <span className="font-medium">Text Input</span>
            </div>
            <input
              type="text"
              className="input w-full"
              placeholder="Type something..."
            />
            <p className="label text-xs opacity-60">Hint text goes here.</p>
          </fieldset>

          <fieldset className="fieldset">
            <div className="label">
              <span className="font-medium">Search Input</span>
            </div>
            <label className="input w-full flex items-center gap-2">
              <FontAwesomeIcon
                icon={faSearch}
                className="opacity-50"
                size="sm"
              />
              <input type="text" className="grow" placeholder="Search..." />
            </label>
          </fieldset>

          <fieldset className="fieldset">
            <div className="label">
              <span className="font-medium">Select</span>
            </div>
            <select className="select w-full">
              <option>Option A</option>
              <option>Option B</option>
              <option>Option C</option>
            </select>
          </fieldset>

          <fieldset className="fieldset">
            <div className="label">
              <span className="font-medium">Textarea</span>
            </div>
            <textarea
              className="textarea w-full"
              placeholder="Write your message..."
              rows={3}
            />
          </fieldset>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              <span>Checkbox</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="toggle"
                checked={toggled}
                onChange={(e) => setToggled(e.target.checked)}
              />
              <span>Toggle</span>
            </label>
          </div>
        </div>
      </div>
    </section>
  );
};

const CardsSection = () => {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold font-display">Cards</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h3 className="card-title">Basic Card</h3>
            <p>This is a standard card with default padding.</p>
            <div className="card-actions justify-end">
              <button type="button" className="btn btn-primary btn-sm">
                Action
              </button>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm card-compact">
          <div className="card-body">
            <h3 className="card-title text-sm">Compact Card</h3>
            <p className="text-sm">Tighter padding for dense layouts.</p>
            <div className="card-actions justify-end">
              <button type="button" className="btn btn-ghost btn-xs">
                Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const CollapseSection = () => {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold font-display">Collapse</h2>

      <details className="collapse collapse-arrow bg-base-100 shadow-sm" open>
        <summary className="collapse-title font-semibold bg-base-300">
          Open by default
          <span className="badge badge-sm badge-ghost ml-2">3 items</span>
        </summary>
        <div className="collapse-content">
          <div className="pt-4 space-y-2">
            <p>This follows the SettingsSection pattern from OwnProfilePage.</p>
            <p className="text-sm opacity-60">
              Uses the HTML details element for independent open/close state.
            </p>
          </div>
        </div>
      </details>

      <details className="collapse collapse-arrow bg-base-100 shadow-sm">
        <summary className="collapse-title font-semibold bg-base-300">
          Closed by default
        </summary>
        <div className="collapse-content">
          <div className="pt-4">
            <p>Content revealed on click.</p>
          </div>
        </div>
      </details>
    </section>
  );
};

const LoadingStatesSection = () => {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold font-display">Loading States</h2>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body space-y-4">
          <h3 className="font-semibold">Spinners</h3>
          <div className="flex items-center gap-4">
            <span className="loading loading-spinner loading-lg" />
            <span className="loading loading-spinner loading-md" />
            <span className="loading loading-spinner loading-sm" />
            <span className="loading loading-spinner loading-xs" />
          </div>

          <h3 className="font-semibold">Skeleton</h3>
          <div className="space-y-2">
            <div className="skeleton h-6 w-48" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-3/4" />
            <div className="flex gap-4 mt-4">
              <div className="skeleton h-12 w-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-3 w-48" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const MenuSection = () => {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold font-display">Menu</h2>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <ul className="menu bg-base-200 rounded-box w-56">
            <li>
              <span>Item 1</span>
            </li>
            <li>
              <span className="active">Item 2 (active)</span>
            </li>
            <li>
              <span>Item 3</span>
            </li>
            <li className="disabled">
              <span>Disabled</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};

const TableSection = () => {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold font-display">Table</h2>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Puzzle</th>
                  <th>Status</th>
                  <th>Answer</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Star Charts</td>
                  <td>
                    <span className="badge badge-success badge-sm">Solved</span>
                  </td>
                  <td className="font-mono tracking-wider">CONSTELLATION</td>
                </tr>
                <tr>
                  <td>Word Salad</td>
                  <td>
                    <span className="badge badge-warning badge-sm">
                      In progress
                    </span>
                  </td>
                  <td className="font-mono tracking-wider opacity-30">???</td>
                </tr>
                <tr>
                  <td>Final Runaround</td>
                  <td>
                    <span className="badge badge-ghost badge-sm">New</span>
                  </td>
                  <td className="font-mono tracking-wider opacity-30">???</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const StyleGuidePage = () => {
  const theme = useTailwindTheme();

  return (
    <div className="tailwind-page" data-theme={theme}>
      <main className="font-body min-h-screen bg-base-200 p-4 pb-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold font-display">Style Guide</h1>
            <p className="text-sm opacity-60 mt-1">
              Patterns and conventions for the Jolly Roger Tailwind/daisyUI
              migration (theme:{" "}
              <code className="font-mono text-xs">{theme}</code>)
            </p>
          </div>

          <PageLayoutSection />
          <TypographySection />
          <TextHierarchySection />
          <CommonPatternsSection />

          <div className="divider text-sm opacity-40">Component Reference</div>

          <ColorsSection />
          <ButtonsSection />
          <BadgesSection />
          <AlertsSection />
          <FormControlsSection />
          <CardsSection />
          <CollapseSection />
          <LoadingStatesSection />
          <MenuSection />
          <TableSection />
        </div>
      </main>
    </div>
  );
};

export default StyleGuidePage;
