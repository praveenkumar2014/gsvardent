export default function SkillsPage() {
  return (
    <main className="module-page">
      <div className="module-stack">
        <div className="module-heading"><div><span className="eyebrow">CAPABILITY REGISTRY</span><h1>Skills & MCP</h1><p>Review the capability model before enabling external tools.</p></div><span className="module-count">FOUNDATION</span></div>
        <section className="module-card skills-placeholder">
          <span className="card-kicker">PERMISSION-FIRST REGISTRY</span>
          <h2>Connector discovery is the next module</h2>
          <p>Skill manifests, publisher identity, tool permissions, credential binding and revocation must be implemented before connectors can execute.</p>
          <div className="skills-checks"><span>✓ Versioned skill contracts</span><span>✓ Explicit permission review</span><span>✓ Server-side credential storage</span><span>✓ Timeout and audit requirements</span></div>
          <p className="module-hint">No connector has been installed or granted access from this page.</p>
        </section>
      </div>
    </main>
  );
}
