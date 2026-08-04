import { requestMagicLink } from "./actions";

export default function LoginPage() {
  return (
    <main className="shell">
      <section className="panel" style={{ maxWidth: 560 }}>
        <p className="eyebrow">Starship</p>
        <h1>Log in</h1>
        <p className="empty">Enter the email Bri invited. Starship will send a magic link, so there is no password to remember.</p>
        <form className="form-grid" action={requestMagicLink}>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required placeholder="client@example.com" />
          </label>
          <button type="submit">Send magic link</button>
        </form>
      </section>
    </main>
  );
}
