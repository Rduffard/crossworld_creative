import { useState } from "react";
import Modal from "../../common/Modal/Modal.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";

export default function AuthModal({
  isOpen,
  onClose,
  defaultMode = "login",
  onSuccess,
}) {
  const [mode, setMode] = useState(defaultMode); // "login" | "signup"
  const [form, setForm] = useState({
    name: "",
    avatar: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, signup } = useAuth();

  const isSignup = mode === "signup";

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (isSignup) {
        await signup({
          name: form.name || "Jacques Cousteau",
          avatar: form.avatar,
          email: form.email,
          password: form.password,
        });
      } else {
        await login({ email: form.email, password: form.password });
      }

      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err?.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSignup ? "Create an account" : "Log in"}
      footer={
        <button type="button" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </button>
      }
    >
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => setMode("login")}
          disabled={isSubmitting}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          disabled={isSubmitting}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
        {isSignup && (
          <>
            <input
              name="name"
              placeholder="Name"
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
            />
            <input
              name="avatar"
              placeholder="Avatar URL"
              value={form.avatar}
              onChange={handleChange}
              autoComplete="url"
              required
            />
          </>
        )}

        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          required
        />

        <input
          name="password"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={handleChange}
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
        />

        {error ? (
          <p style={{ margin: 0, color: "rgba(255,80,80,0.95)" }}>{error}</p>
        ) : null}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Working..." : isSignup ? "Create account" : "Log in"}
        </button>
      </form>
    </Modal>
  );
}
