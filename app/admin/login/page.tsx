"use client";

import { useActionState } from "react";
import { login, LoginState } from "./actions";

const initialState: LoginState = null;

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        action={formAction}
        className="w-full max-w-xs space-y-4 rounded-lg border border-border bg-surface p-6"
      >
        <h1 className="font-display text-lg text-foreground">Admin</h1>

        <input
          type="password"
          name="password"
          placeholder="Senha"
          autoFocus
          required
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-accent"
        />

        {state?.error && (
          <p className="text-sm text-red-400">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-accent py-2 font-medium text-background disabled:opacity-60"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
