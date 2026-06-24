import { ActionForm } from "@/app/components/ActionForm";

export const Home = () => {
  return (
    <div>
      <h1>rwsdk server action response headers reproduction</h1>
      <p>
        Click the button to invoke a server action that writes a header and a{" "}
        <code>Set-Cookie</code> onto <code>requestInfo.response.headers</code>.
      </p>
      <p>
        On <code>rwsdk@1.3.0-canary.5</code> the action POST response carries
        those headers. On <code>rwsdk@1.3.0</code> and above they are dropped.
      </p>
      <ActionForm />
    </div>
  );
};
