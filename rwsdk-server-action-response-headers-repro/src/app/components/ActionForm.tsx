"use client";

import { useActionState } from "react";
import { setHeaderFromAction, type ActionResult } from "@/app/pages/actions";

export function ActionForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    setHeaderFromAction,
    null,
  );

  return (
    <form action={formAction}>
      <button type="submit" disabled={pending}>
        Run server action
      </button>
      {state ? <p data-testid="action-status">action result: {state.status}</p> : null}
    </form>
  );
}
