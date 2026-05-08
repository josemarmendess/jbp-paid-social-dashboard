import Link from "next/link";
import { Card, Eyebrow } from "@/components/design";
import { REPORT_TEMPLATES } from "@/lib/reportTemplates";

/**
 * Reports hub. Each card opens its template editor where the user can
 * customise, save, download (PDF / PNG), copy, or send to Slack.
 *
 * Today there's a single template (Daily Summary). Adding more is just a
 * matter of pushing into REPORT_TEMPLATES + creating the matching editor
 * route under /reports/[template-id].
 */
export default function ReportsPage() {
  return (
    <main style={{ flex: 1 }}>
      <div
        style={{
          padding: "20px 28px",
          background: "var(--color-jbp-paper)",
          borderBottom: "1px solid var(--color-jbp-hairline)",
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            margin: 0,
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.025em",
            color: "var(--color-jbp-text)",
          }}
        >
          Reports
        </h1>
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: "var(--color-jbp-text-3)",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          Templates · customise · save · share
        </div>
      </div>

      <div
        style={{
          padding: "28px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div>
          <Eyebrow style={{ marginBottom: 8 }}>Available templates</Eyebrow>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: 16,
            }}
          >
            {REPORT_TEMPLATES.map((t) => (
              <Link
                key={t.id}
                href={`/reports/${t.id}`}
                style={{ textDecoration: "none" }}
              >
                <Card
                  style={{
                    padding: 0,
                    cursor: "pointer",
                    transition: "border-color .12s, background .12s",
                  }}
                  className="report-template-card"
                >
                  <div
                    style={{
                      padding: "18px 20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 1.4,
                        textTransform: "uppercase",
                        color: "var(--color-jbp-red)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      Daily
                    </span>
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        fontFamily: "var(--font-display)",
                        letterSpacing: "-0.015em",
                        color: "var(--color-jbp-text)",
                        lineHeight: 1.2,
                      }}
                    >
                      {t.name}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--color-jbp-text-2)",
                        lineHeight: 1.45,
                      }}
                    >
                      {t.description}
                    </span>
                    <span
                      style={{
                        marginTop: 6,
                        fontSize: 10,
                        fontFamily: "var(--font-mono)",
                        textTransform: "uppercase",
                        letterSpacing: 0.6,
                        color: "var(--color-jbp-text-3)",
                      }}
                    >
                      Open editor →
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <Eyebrow style={{ marginBottom: 8 }}>Coming next</Eyebrow>
          <Card>
            <div
              style={{
                padding: 20,
                fontSize: 12,
                color: "var(--color-jbp-text-2)",
                lineHeight: 1.55,
              }}
            >
              Weekly digest, monthly executive summary, and ad-creative
              performance recap are queued. Tell us which channel matters
              most (Slack vs email vs PDF on a shared drive) and we&apos;ll
              wire it next.
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
