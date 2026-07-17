import { useMemo, useState } from "react";

import { PaperDiffPipelineError, runComparison } from "./lib/pipelineClient";
import { initiallyExpanded, statusLabel } from "./lib/presentation";
import type { ComparisonResponse, DimensionDiff, EvidenceSpan, PaperSummary } from "./types";

const DEFAULT_LEFT = "Social media use increases depression.";
const DEFAULT_RIGHT = "Screen time does not increase depression.";

function Mark({ type }: { type: "check" | "arrow" | "branch" }) {
  const paths = {
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <path d="m9 18 6-6-6-6" />,
    branch: <path d="M6 3v6a3 3 0 0 0 3 3h6m0 0-3-3m3 3-3 3" />,
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[type]}
    </svg>
  );
}

function EvidenceChain({ paper, evidence }: { paper: PaperSummary; evidence: EvidenceSpan }) {
  return (
    <div className="chain" aria-label={`Provenance chain for ${paper.label}`}>
      <div className="chain-step">
        <span>Public claim</span>
        <strong>“{paper.public_claim}”</strong>
      </div>
      <Mark type="arrow" />
      <div className="chain-step">
        <span>Paper conclusion</span>
        <strong>{paper.paper_conclusion}</strong>
      </div>
      <Mark type="arrow" />
      <div className="chain-step quote-step">
        <span>Exact supporting passage · {evidence.section}</span>
        <blockquote>“{evidence.quote}”</blockquote>
      </div>
      <div className="chain-meta">
        <span className={`status-dot ${evidence.relationship.status}`} />
        {statusLabel(evidence.relationship.status)} · {Math.round(evidence.relationship.confidence * 100)}%
        relationship confidence
        <a href={evidence.source_url} target="_blank" rel="noreferrer">
          Open source
        </a>
      </div>
    </div>
  );
}

function ClaimCard({ paper }: { paper: PaperSummary }) {
  const evidence = paper.evidence[0];
  return (
    <article className="claim-card">
      <div className="card-kicker">
        <span>{paper.label}</span>
        <span className="verified">
          <Mark type="check" /> Source verified
        </span>
      </div>
      <h2>“{paper.public_claim}”</h2>
      <p className="paper-title">{paper.title}</p>
      <div className="paper-meta">
        <span>{paper.year}</span>
        <span>{evidence.relationship.status === "grounded" ? "Direct support" : "Review needed"}</span>
      </div>
    </article>
  );
}

function DiffRow({
  dimension,
  open,
  onToggle,
  result,
}: {
  dimension: DimensionDiff;
  open: boolean;
  onToggle: () => void;
  result: ComparisonResponse;
}) {
  const leftEvidence = result.left.evidence.find((item) =>
    dimension.left_evidence_ids.includes(item.id),
  );
  const rightEvidence = result.right.evidence.find((item) =>
    dimension.right_evidence_ids.includes(item.id),
  );

  return (
    <section className={`diff-row ${dimension.classification} ${open ? "open" : ""}`}>
      <button className="diff-summary" type="button" onClick={onToggle} aria-expanded={open}>
        <span className="diff-marker" aria-hidden="true" />
        <span className="dimension-name">{dimension.label}</span>
        <span className="left-value">{dimension.left_value}</span>
        <span className="right-value">{dimension.right_value}</span>
        <span className="chevron">
          <Mark type="arrow" />
        </span>
      </button>
      {open && (
        <div className="diff-detail">
          <div className="reason">
            <Mark type="branch" />
            <p>
              <strong>Why it matters</strong>
              {dimension.rationale}
            </p>
          </div>
          <div className="chains-grid">
            {leftEvidence && <EvidenceChain paper={result.left} evidence={leftEvidence} />}
            {rightEvidence && <EvidenceChain paper={result.right} evidence={rightEvidence} />}
          </div>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [leftClaim, setLeftClaim] = useState(DEFAULT_LEFT);
  const [rightClaim, setRightClaim] = useState(DEFAULT_RIGHT);
  const [result, setResult] = useState<ComparisonResponse | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showTrace, setShowTrace] = useState(false);

  const isDefaultPair = leftClaim === DEFAULT_LEFT && rightClaim === DEFAULT_RIGHT;
  const classified = useMemo(
    () => result?.dimensions.filter((dimension) => dimension.classification !== "equivalent").length ?? 0,
    [result],
  );

  async function debugDisagreement() {
    setLoading(true);
    setNotice(null);
    try {
      const response = await runComparison(leftClaim, rightClaim, {
        isDemoPair: isDefaultPair,
        endpoint: import.meta.env.VITE_ROCKETRIDE_PIPELINE_URL,
      });
      setResult(response);
      setExpanded(initiallyExpanded(response.dimensions));
    } catch (error) {
      if (error instanceof PaperDiffPipelineError) {
        setNotice([error.message, error.nextStep].filter(Boolean).join(" "));
      } else {
        setNotice("The comparison could not be completed. Check the pipeline and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function loadFixture() {
    setLeftClaim(DEFAULT_LEFT);
    setRightClaim(DEFAULT_RIGHT);
    setResult(null);
    setNotice("Synthetic demo pair loaded. It is safe for UI work, not for evidence claims.");
  }

  function toggle(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="PaperDiff home">
          <span className="brand-mark">P<span>±</span></span>
          PaperDiff
        </a>
        <nav aria-label="Primary navigation">
          <a className="active" href="#compare">Compare</a>
          <button type="button" disabled title="Challenge mode comes after Compare is stable">
            Challenge <span>stretch</span>
          </button>
        </nav>
        <div className="header-meta">
          <span className="live-dot" /> Compare pipeline ready
        </div>
      </header>

      <main id="top">
        <section className="hero" id="compare">
          <div className="eyebrow">The verification layer after citations</div>
          <h1>Both claims are sourced.<br /><em>Are they saying the same thing?</em></h1>
          <p>
            Find the methodological difference hidden behind contradictory research headlines —
            with every judgment linked to an exact passage.
          </p>
        </section>

        <section className="comparison-input" aria-label="Claims to compare">
          <div className="input-labels">
            <span>Claim A</span>
            <span className="versus">vs.</span>
            <span>Claim B</span>
          </div>
          <div className="input-grid">
            <textarea
              value={leftClaim}
              onChange={(event) => setLeftClaim(event.target.value)}
              aria-label="First claim, paper URL, or DOI"
            />
            <textarea
              value={rightClaim}
              onChange={(event) => setRightClaim(event.target.value)}
              aria-label="Second claim, paper URL, or DOI"
            />
          </div>
          <div className="input-actions">
            <button className="text-button" type="button" onClick={loadFixture}>Load demo pair</button>
            <button
              className="primary-button"
              type="button"
              onClick={debugDisagreement}
              disabled={loading || !leftClaim.trim() || !rightClaim.trim()}
            >
              {loading ? <span className="spinner" /> : <Mark type="branch" />}
              {loading ? "Aligning evidence…" : "Debug disagreement"}
            </button>
          </div>
        </section>

        {notice && <div className="notice" role="status">{notice}</div>}

        {result && (
          <div className="results" aria-live="polite">
            {result.is_demo && (
              <div className="demo-banner">
                Synthetic fixture · interface and validation behavior only · replace before live evidence demo
              </div>
            )}

            <section className="claims-grid" aria-label="Compared claims">
              <ClaimCard paper={result.left} />
              <div className="conflict-pulse" aria-hidden="true">≠</div>
              <ClaimCard paper={result.right} />
            </section>

            <section className="diff-panel">
              <div className="diff-header">
                <div>
                  <span className="section-index">01 / alignment</span>
                  <h2>Same topic <span>≠</span> same research question</h2>
                </div>
                <div className="legend" aria-label="Classification legend">
                  <span className="equivalent">Equivalent</span>
                  <span className="different">Different</span>
                  <span className="incompatible">Incompatible</span>
                </div>
              </div>
              <div className="column-heads">
                <span>Dimension</span><span>Paper A</span><span>Paper B</span><span />
              </div>
              <div className="diff-list">
                {result.dimensions.map((dimension) => (
                  <DiffRow
                    key={dimension.key}
                    dimension={dimension}
                    open={expanded.has(dimension.key)}
                    onToggle={() => toggle(dimension.key)}
                    result={result}
                  />
                ))}
              </div>
              <p className="diff-count">{classified} of {result.dimensions.length} dimensions materially differ.</p>
            </section>

            <section className="verdict-panel">
              <div className="verdict-icon"><Mark type="check" /></div>
              <div>
                <span className="section-index">02 / verdict</span>
                <h2>{result.verdict.headline}</h2>
                <p>{result.verdict.explanation}</p>
              </div>
            </section>

            <section className="synthesis-panel">
              <div>
                <span className="section-index">03 / careful synthesis</span>
                <h2>What these papers can honestly be said to show</h2>
              </div>
              <blockquote>“{result.synthesis}”</blockquote>
              <div className="synthesis-sources">
                <span><Mark type="check" /> Supported by both aligned records</span>
                <button type="button" onClick={() => setShowTrace((current) => !current)}>
                  {showTrace ? "Hide pipeline trace" : "Inspect pipeline trace"}
                </button>
              </div>
              {showTrace && (
                <ol className="trace-list">
                  {result.trace.map((event) => (
                    <li key={event.stage}>
                      <span className={`status-dot ${event.status}`} />
                      <div><strong>{event.stage}</strong><p>{event.detail}</p></div>
                      <time>{event.duration_ms} ms</time>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}
      </main>

      <footer>
        <strong>PaperDiff</strong>
        <span>Grounded does not mean reconciled.</span>
        <span>Hackathon scaffold · Compare first</span>
      </footer>
    </div>
  );
}
