import { requestMagicLink } from "./actions";

const STATUS_MESSAGES = {
  missing_email: "Enter the email Bri invited.",
  missing_config: "Starship is missing a required login setting. Check DATABASE_URL, AUTH_RESEND_KEY, and STARSHIP_COACH_EMAILS in Vercel, then redeploy.",
  auth_error: "Starship could not send the magic link. Check the Vercel function logs and Resend sender/domain settings.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const status = params.status;
  const message = status && Object.hasOwn(STATUS_MESSAGES, status)
    ? STATUS_MESSAGES[status as keyof typeof STATUS_MESSAGES]
    : null;

  return (
    <main className="shell">
      <section className="panel" style={{ maxWidth: 560 }}>
        <p className="eyebrow">Starship</p>
        <h1>Log in</h1>
        <p className="empty">Enter the email Bri invited. Starship will send a magic link, so there is no password to remember.</p>
        {message ? <p className="notice">{message}</p> : null}
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
