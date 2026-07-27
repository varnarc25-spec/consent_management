import Link from 'next/link';

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001';

export default function HomePage() {
  return (
    <>
      <header className="site-header">
        <strong>CMP</strong>
        <nav aria-label="Site navigation">
          <Link href="#features">Features</Link>
          <Link href="#compliance">Compliance</Link>
          <a href={`${ADMIN_URL}/login`}>Sign in</a>
          <a className="btn" href={`${ADMIN_URL}/register`} style={{ padding: '0.5rem 1rem' }}>
            Get started
          </a>
        </nav>
      </header>

      <main>
        <section className="hero container">
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
            Consent management built for compliance teams
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '1.125rem', maxWidth: 640, margin: '0 auto' }}>
            Scan websites, display consent banners, block trackers, and maintain verifiable
            consent records — all from one multi-tenant platform.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
            <a className="btn" href={`${ADMIN_URL}/register`}>
              Start free trial
            </a>
            <a className="btn btn-secondary" href={`${ADMIN_URL}/login`}>
              Sign in to admin
            </a>
          </div>
        </section>

        <section id="features" className="container" style={{ paddingBottom: '4rem' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Platform capabilities</h2>
          <p style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: '2rem' }}>
            MVP foundation — more features shipping in upcoming sprints
          </p>
          <div className="features">
            <div className="card">
              <h3>Multi-tenant</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                Isolated organizations with role-based access for every team member.
              </p>
            </div>
            <div className="card">
              <h3>Consent banners</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                Customizable banners with accept, reject, and preference center support.
              </p>
            </div>
            <div className="card">
              <h3>Audit evidence</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                Searchable audit logs with export for compliance reviews and regulators.
              </p>
            </div>
            <div className="card">
              <h3>Google Consent Mode</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                Communicate consent signals to Google Ads and Analytics automatically.
              </p>
            </div>
          </div>
        </section>

        <section id="compliance" className="container" style={{ paddingBottom: '5rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <h2>Ready for GDPR, CCPA, and more</h2>
            <p style={{ color: 'var(--muted)', maxWidth: 520, margin: '1rem auto 2rem' }}>
              Geo-targeted configurations, policy versioning, and consent renewal workflows
              help you stay compliant as regulations evolve.
            </p>
            <a className="btn" href={`${ADMIN_URL}/register`}>
              Create your account
            </a>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>
        © {new Date().getFullYear()} Consent Management Platform
      </footer>
    </>
  );
}
