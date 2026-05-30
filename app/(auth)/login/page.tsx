import { LoginForm } from "./_components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="glass w-full max-w-sm p-8 text-center">
        <div className="mb-2 text-4xl">🍌</div>
        <h1 className="text-2xl font-semibold tracking-tight">Banana Sheet</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Log expenses in a tap. See them beautifully.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
