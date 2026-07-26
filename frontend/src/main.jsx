import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AuthHeader, ModalForm } from "./components/Modal";
import "./styles.css";

// Supported meal periods and the display label/icon used by the planner.
const slots = ["morning", "afternoon", "evening", "night"];
const slotDetails = {
  morning: ["Morning", "☀"],
  afternoon: ["Afternoon", "◒"],
  evening: ["Evening", "◐"],
  night: ["Night", "☾"],
};

function App() {
  // Meal-plan data and the current API loading/authentication state.
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(null);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  // Visibility state for each modal displayed by the application.
  const [showForm, setShowForm] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  // Login form values, feedback messages, and submission state.
  const [loginError, setLoginError] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [loginFields, setLoginFields] = useState({ username: "", password: "" });
  const [loggingIn, setLoggingIn] = useState(false);
  // Signup form values, field errors, and submission state.
  const [signupErrors, setSignupErrors] = useState({});
  const [signingUp, setSigningUp] = useState(false);
  const [signupFields, setSignupFields] = useState({
    username: "", email: "", phone_number: "", password: "", confirm_password: "",
  });
  // Password recovery covers requesting and then verifying an OTP.
  const [resetStep, setResetStep] = useState("email");
  const [resetFields, setResetFields] = useState({
    email: "", code: "", password: "", confirm_password: "",
  });
  const [resetErrors, setResetErrors] = useState({});
  const [resetMessage, setResetMessage] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  // New plans default to today with one blank morning meal.
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState([{ name: "", time_slot: "morning", consumed: false }]);

  // Read Django's CSRF cookie before every state-changing request.
  const csrf = () =>
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1];

  // Refresh the session, then load only the authenticated user's plans.
  const loadPlans = async () => {
    setLoading(true);
    try {
      const sessionResponse = await fetch("/api/auth/session/", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!sessionResponse.ok) throw new Error("Your session could not be checked.");
      const session = await sessionResponse.json();
      setAuthenticated(session.authenticated);
      setUsername(session.username);
      if (!session.authenticated) {
        setPlans([]);
        return;
      }

      const response = await fetch("/api/mealplans/", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (response.status === 401 || response.status === 403) {
        setAuthenticated(false);
        setUsername("");
        return;
      }
      if (!response.ok) throw new Error("The meal plans could not be loaded.");
      setPlans(await response.json());
      setAuthenticated(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initialize account and planner data when the app first mounts.
  useEffect(() => {
    loadPlans();
  }, []);

  // Guests must authenticate before opening the meal editor.
  const openPlanner = () => {
    if (authenticated !== true) {
      setShowLogin(true);
      return;
    }
    setShowForm(true);
  };

  // Start a Django session and refresh the new account's data.
  const submitLogin = async (event) => {
    event.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    try {
      const response = await fetch("/api/auth/login/", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf() || "" },
        body: JSON.stringify(loginFields),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Could not log in.");
      setPlans([]);
      setAuthenticated(true);
      setUsername(data.username);
      setShowLogin(false);
      setLoginFields({ username: "", password: "" });
      await loadPlans();
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  // Switch from login to the registration interface.
  const openSignup = () => {
    setShowLogin(false);
    setShowSignup(true);
    setSignupErrors({});
  };

  // Create an account and return successful users to login.
  const submitSignup = async (event) => {
    event.preventDefault();
    setSignupErrors({});
    setSigningUp(true);
    try {
      const response = await fetch("/api/auth/signup/", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf() || "" },
        body: JSON.stringify(signupFields),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSignupErrors(data.errors || { detail: data.detail || "Could not create your account." });
        return;
      }
      setSignupFields({ username: "", email: "", phone_number: "", password: "", confirm_password: "" });
      setShowSignup(false);
      setLoginNotice("Account created successfully. Log in to continue.");
      setShowLogin(true);
    } catch {
      setSignupErrors({ detail: "Could not connect to the server. Please try again." });
    } finally {
      setSigningUp(false);
    }
  };

  // Clear earlier recovery state whenever recovery is reopened.
  const openForgotPassword = () => {
    setShowLogin(false);
    setShowForgotPassword(true);
    setResetStep("email");
    setResetErrors({});
    setResetMessage("");
  };

  // Ask the backend to email an OTP to a registered address.
  const requestResetCode = async (event) => {
    event.preventDefault();
    setResetErrors({});
    setResettingPassword(true);
    try {
      const response = await fetch("/api/auth/forgot-password/", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf() || "" },
        body: JSON.stringify({ email: resetFields.email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setResetErrors(data.errors || { detail: data.detail || "Could not send the code." });
        return;
      }
      setResetMessage(data.detail);
      setResetStep("code");
    } catch {
      setResetErrors({ detail: "Could not connect to the server. Please try again." });
    } finally {
      setResettingPassword(false);
    }
  };

  // Verify the OTP and replace the account password.
  const submitNewPassword = async (event) => {
    event.preventDefault();
    setResetErrors({});
    setResettingPassword(true);
    try {
      const response = await fetch("/api/auth/reset-password/", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf() || "" },
        body: JSON.stringify(resetFields),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setResetErrors(data.errors || { detail: data.detail || "Could not reset the password." });
        return;
      }
      setShowForgotPassword(false);
      setResetFields({ email: "", code: "", password: "", confirm_password: "" });
      setLoginNotice(data.detail);
      setShowLogin(true);
    } catch {
      setResetErrors({ detail: "Could not connect to the server. Please try again." });
    } finally {
      setResettingPassword(false);
    }
  };

  // End the session and immediately remove private data from the UI.
  const signOut = async () => {
    setPlans([]);
    await fetch("/api/auth/logout/", {
      method: "POST",
      credentials: "same-origin",
      headers: { "X-CSRFToken": csrf() || "" },
    });
    setAuthenticated(false);
    setUsername("");
    setPlans([]);
    setShowForm(false);
  };

  // Recalculate progress only when meal plans change.
  const stats = useMemo(() => {
    const all = plans.flatMap((plan) => plan.items);
    return { total: all.length, done: all.filter((item) => item.consumed).length };
  }, [plans]);

  // Add meals to a new or existing plan for the selected date.
  const savePlan = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/mealplans/", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf() || "" },
        body: JSON.stringify({ date, items: items.filter((item) => item.name.trim()) }),
      });
      if (response.status === 401 || response.status === 403) {
        setAuthenticated(false);
        setShowForm(false);
        setShowLogin(true);
        return;
      }
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.date?.[0] || detail.detail || "Could not create the plan.");
      }
      setShowForm(false);
      setItems([{ name: "", time_slot: "morning", consumed: false }]);
      await loadPlans();
    } catch (err) {
      setError(err.message);
    }
  };

  // Update one meal's consumed state through the plan API.
  const toggleMeal = async (plan, itemId) => {
    const updated = {
      date: plan.date,
      items: plan.items.map(({ id, ...item }) =>
        id === itemId ? { ...item, consumed: !item.consumed } : item
      ),
    };
    const response = await fetch(`/api/mealplans/${plan.id}/`, {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrf() || "" },
      body: JSON.stringify(updated),
    });
    if (response.ok) loadPlans();
  };

  // Delete an entire dated plan after optional confirmation.
  const deletePlan = async (planId, askForConfirmation = true) => {
    if (askForConfirmation && !window.confirm("Delete this entire meal plan?")) return;
    setError("");
    const response = await fetch(`/api/mealplans/${planId}/`, {
      method: "DELETE",
      credentials: "same-origin",
      headers: { "X-CSRFToken": csrf() || "" },
    });
    if (response.ok) {
      setPlans((current) => current.filter((plan) => plan.id !== planId));
    } else {
      setError("Could not delete the meal plan.");
    }
  };

  // Delete one meal, or its plan when no meals remain.
  const deleteMeal = async (plan, itemId) => {
    if (!window.confirm("Delete this meal?")) return;
    const remainingItems = plan.items.filter((item) => item.id !== itemId);
    if (remainingItems.length === 0) {
      await deletePlan(plan.id, false);
      return;
    }

    setError("");
    const response = await fetch(`/api/mealplans/${plan.id}/`, {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrf() || "" },
      body: JSON.stringify({
        date: plan.date,
        items: remainingItems.map(({ id, ...item }) => item),
      }),
    });
    if (response.ok) {
      await loadPlans();
    } else {
      setError("Could not delete the meal.");
    }
  };

  // Render the page and its conditional forms.
  return (
    <main>
      {/* Global navigation changes controls with session state. */}
      <nav>
        <a className="brand" href="/"><span>N</span>Nourish</a>
        <div className="nav-actions">
          <a href="#plans">My plans</a>
          {authenticated ? (
            <button className="login account" type="button" onClick={signOut}>
              {username} · Log out
            </button>
          ) : (
            <>
              <button className="signup-link account" type="button" onClick={openSignup}>Sign up</button>
              <button className="login account" type="button" onClick={() => setShowLogin(true)}>Log in</button>
            </>
          )}
        </div>
      </nav>

      {/* Public landing hero and primary call to action. */}
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Simple nutrition, every day</p>
          <h1>Eat with intention.<br /><em>Feel your best.</em></h1>
          <p className="intro">Build a daily rhythm around food you love. Plan your meals, track your progress, and make consistency feel effortless.</p>
          <div className="hero-actions">
            <button onClick={openPlanner}>Plan today’s meals <b>→</b></button>
            <a href="#plans">See your week</a>
          </div>
          <div className="proof">
            <div className="faces"><i>🧑🏽</i><i>👩🏻</i><i>🧔🏾</i></div>
            <p><strong>A calmer way to eat well</strong><br />One thoughtful meal at a time</p>
          </div>
        </div>
        <div className="hero-card">
          <div className="plate">
            <span className="leaf">🌿</span>
            <div className="bowl">🥗</div>
          </div>
          <aside>
            <small>TODAY’S FOCUS</small>
            <strong>Balanced & bright</strong>
            <span>Protein · Greens · Whole grains</span>
          </aside>
        </div>
      </section>

      {/* Account-specific plan list, progress, and empty states. */}
      <section className="planner" id="plans">
        <div className="section-heading">
          <div><p className="eyebrow">Your rhythm</p><h2>Meals, made manageable.</h2></div>
          {authenticated && <button className="secondary" onClick={openPlanner}>+ New plan</button>}
        </div>

        {loading ? (
          <p className="status">Gathering your plans…</p>
        ) : !authenticated ? (
          <div className="empty">
            <span>✦</span><h3>Your meal plans live here</h3>
            <p>Log in to create a plan, check off meals, and build your weekly rhythm.</p>
            <button onClick={() => setShowLogin(true)}>Log in to continue</button>
          </div>
        ) : plans.length === 0 ? (
          <div className="empty">
            <span>✦</span><h3>A fresh page</h3>
            <p>Create your first meal plan and start shaping a routine that works for you.</p>
            <button onClick={openPlanner}>Create my first plan</button>
          </div>
        ) : (
          <>
            <div className="summary"><strong>{stats.done} of {stats.total}</strong> meals enjoyed <div><i style={{width: `${stats.total ? stats.done / stats.total * 100 : 0}%`}} /></div></div>
            <div className="plan-grid">
              {plans.map((plan) => (
                <article className="plan" key={plan.id}>
                  <header>
                    <span>{new Date(`${plan.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long" })}</span>
                    <div>
                      <strong>{new Date(`${plan.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</strong>
                      <button className="delete-plan" type="button" aria-label={`Delete plan for ${plan.date}`} onClick={() => deletePlan(plan.id)}>×</button>
                    </div>
                  </header>
                  {slots.map((slot) => plan.items.filter((item) => item.time_slot === slot).map((item) => (
                    <label className={item.consumed ? "meal checked" : "meal"} key={item.id}>
                      <button aria-label={`Mark ${item.name} consumed`} onClick={() => toggleMeal(plan, item.id)}>{item.consumed ? "✓" : ""}</button>
                      <span><small>{slotDetails[slot][1]} {slotDetails[slot][0]}</small><strong>{item.name}</strong></span>
                      <button className="delete-meal" type="button" aria-label={`Delete ${item.name}`} onClick={() => deleteMeal(plan, item.id)}>×</button>
                    </label>
                  )))}
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Authenticated form for adding meals to a date. */}
      {showForm && authenticated && (
        <ModalForm onClose={() => setShowForm(false)} onSubmit={savePlan}>
            <p className="eyebrow">A new day</p><h2>Plan your meals</h2>
            <label className="field">Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
            {items.map((item, index) => (
              <div className="item-row" key={index}>
                <input placeholder="e.g. Greek yogurt & berries" value={item.name} onChange={(event) => setItems(items.map((value, i) => i === index ? {...value, name: event.target.value} : value))} required />
                <select value={item.time_slot} onChange={(event) => setItems(items.map((value, i) => i === index ? {...value, time_slot: event.target.value} : value))}>
                  {slots.map((slot) => <option key={slot} value={slot}>{slotDetails[slot][0]}</option>)}
                </select>
              </div>
            ))}
            <button className="add-item" type="button" onClick={() => setItems([...items, { name: "", time_slot: "afternoon", consumed: false }])}>+ Add another meal</button>
            {error && <p className="error">{error}</p>}
            <button className="save" type="submit">Save meal plan</button>
        </ModalForm>
      )}

      {/* Custom JSON-backed login form. */}
      {showLogin && (
        <ModalForm className="login-modal" onClose={() => setShowLogin(false)} onSubmit={submitLogin}>
            <AuthHeader eyebrow="Welcome back" title="Log in to Nourish" description="Your meal plans are waiting for you." />
            {loginNotice && <p className="success" role="status">{loginNotice}</p>}
            <label className="field">
              Username
              <input
                autoFocus
                autoComplete="username"
                value={loginFields.username}
                onChange={(event) => setLoginFields({...loginFields, username: event.target.value})}
                required
              />
            </label>
            <label className="field">
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={loginFields.password}
                onChange={(event) => setLoginFields({...loginFields, password: event.target.value})}
                required
              />
            </label>
            {loginError && <p className="error" role="alert">{loginError}</p>}
            <button className="save" type="submit" disabled={loggingIn}>
              {loggingIn ? "Logging in…" : "Log in"}
            </button>
            <button className="forgot-link" type="button" onClick={openForgotPassword}>Forgot password?</button>
            <p className="auth-switch">New to Nourish? <button type="button" onClick={openSignup}>Create an account</button></p>
        </ModalForm>
      )}

      {/* Registration form with server-side field validation. */}
      {showSignup && (
        <ModalForm className="signup-modal" onClose={() => setShowSignup(false)} onSubmit={submitSignup}>
            <AuthHeader eyebrow="Join Nourish" title="Create your account" description="Start building a meal rhythm that works for you." />
            {[
              ["username", "Username", "text", "username"],
              ["email", "Email address", "email", "email"],
              ["phone_number", "Phone number", "tel", "tel"],
              ["password", "Password", "password", "new-password"],
              ["confirm_password", "Confirm password", "password", "new-password"],
            ].map(([name, label, type, autoComplete]) => (
              <label className="field" key={name}>
                {label}
                <input
                  type={type}
                  autoComplete={autoComplete}
                  value={signupFields[name]}
                  onChange={(event) => setSignupFields({...signupFields, [name]: event.target.value})}
                  aria-invalid={Boolean(signupErrors[name])}
                  required
                />
                {signupErrors[name] && <span className="field-error">{signupErrors[name]}</span>}
              </label>
            ))}
            {signupErrors.detail && <p className="error" role="alert">{signupErrors.detail}</p>}
            <button className="save" type="submit" disabled={signingUp}>
              {signingUp ? "Creating account…" : "Create account"}
            </button>
            <p className="auth-switch">Already have an account? <button type="button" onClick={() => { setShowSignup(false); setShowLogin(true); }}>Log in</button></p>
        </ModalForm>
      )}

      {/* Two-step email and OTP password-recovery form. */}
      {showForgotPassword && (
        <ModalForm
            className="login-modal recovery-modal"
            onClose={() => setShowForgotPassword(false)}
            onSubmit={resetStep === "email" ? requestResetCode : submitNewPassword}
          >
            <div className="recovery-icon" aria-hidden="true">{resetStep === "email" ? "✉" : "✓"}</div>
            <div className="recovery-steps" aria-label={`Password recovery step ${resetStep === "email" ? 1 : 2} of 2`}>
              <i className="active" />
              <i className={resetStep === "code" ? "active" : ""} />
            </div>
            <p className="eyebrow">Secure account recovery</p>
            <h2>{resetStep === "email" ? "Forgot password?" : "Check your email"}</h2>
            <p className="login-copy">
              {resetStep === "email"
                ? "No worries. Enter your account email and we’ll send a secure verification code."
                : "We sent a six-digit verification code to"}
            </p>
            {resetStep === "code" && <div className="email-chip">✉ {resetFields.email}</div>}
            {resetStep === "code" && <p className="sr-only">{resetMessage}</p>}
            <label className="field">
              Email address
              <input
                type="email"
                autoComplete="email"
                value={resetFields.email}
                onChange={(event) => setResetFields({...resetFields, email: event.target.value})}
                disabled={resetStep === "code"}
                placeholder="you@example.com"
                required
              />
              {resetErrors.email && <span className="field-error">{resetErrors.email}</span>}
            </label>
            {resetStep === "code" && (
              <>
                <label className="field otp-field">
                  Verification code
                  <input
                    className="otp-input"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength="6"
                    value={resetFields.code}
                    onChange={(event) => setResetFields({...resetFields, code: event.target.value.replace(/\D/g, "")})}
                    required
                  />
                  <small>Code expires in 10 minutes</small>
                  {resetErrors.code && <span className="field-error">{resetErrors.code}</span>}
                </label>
                <label className="field">
                  New password
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={resetFields.password}
                    onChange={(event) => setResetFields({...resetFields, password: event.target.value})}
                    required
                  />
                  {resetErrors.password && <span className="field-error">{resetErrors.password}</span>}
                </label>
                <label className="field">
                  Confirm new password
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={resetFields.confirm_password}
                    onChange={(event) => setResetFields({...resetFields, confirm_password: event.target.value})}
                    required
                  />
                  {resetErrors.confirm_password && <span className="field-error">{resetErrors.confirm_password}</span>}
                </label>
              </>
            )}
            {resetErrors.detail && <p className="error" role="alert">{resetErrors.detail}</p>}
            <button className="save" type="submit" disabled={resettingPassword}>
              {resettingPassword
                ? "Please wait…"
                : resetStep === "email" ? "Send verification code" : "Reset password"}
            </button>
            <div className="security-note"><span>◆</span> Your password is encrypted and never sent by email.</div>
            {resetStep === "code" && (
              <button className="forgot-link" type="button" onClick={() => { setResetStep("email"); setResetErrors({}); }}>
                Use another email
              </button>
            )}
            <p className="auth-switch">Remembered it? <button type="button" onClick={() => { setShowForgotPassword(false); setShowLogin(true); }}>Back to login</button></p>
        </ModalForm>
      )}
    </main>
  );
}

// Mount React into the root element from index.html.
createRoot(document.getElementById("root")).render(<App />);
