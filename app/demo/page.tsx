import Script from "next/script";
import { isAuthDisabled } from "@/lib/demo-mode";

export default function DemoPage() {
  if (!isAuthDisabled()) {
    return (
      <main className="shell">
        <section className="panel">
          <p className="eyebrow">Starship</p>
          <h1>Demo mode is off</h1>
          <p>Set <code>NEXT_PUBLIC_AUTH_DISABLED=true</code> only when you want to inspect the local MVP without login.</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <link rel="stylesheet" href="/src/styles.css" />
      <div id="app" />
      <Script type="module" src="/src/app.js" />
    </>
  );
}
