import { useEffect, useRef, useState } from "react";
import "./finance.css";
import { SubscriptionDetails, SubscriptionLink } from "./subscriptionUsage";

const dateToday = () => new Date().toISOString().slice(0, 10);
const categories = ["Cloud", "Software", "Subscription", "Domains", "Hosting", "Equipment", "Other"];
const kinds = { expense: "Expense", monthly: "Monthly commitment", annual: "Annual commitment", budget: "Monthly budget" };
const money = (value, currency) => value == null ? "—" : new Intl.NumberFormat(undefined, {
  style: "currency", currency,
}).format(value / 100);

const sections = { overview: "Overview", usage: "Subscriptions & Usage", infrastructure: "Infrastructure", expenses: "Expenses" };
const infrastructureCategories = ["Cloud", "Hosting", "Domains"];

export default function Finance({ request, view, onView, hosts }) {
  const section = Object.hasOwn(sections, view) ? view : "overview";
  const [month, setMonth] = useState(() => dateToday().slice(0, 7));
  const [refresh, setRefresh] = useState(0);
  const [report, setReport] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingError, setLoadingError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [submission, setSubmission] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const mutation = useRef(false);
  const description = useRef(null);

  useEffect(() => {
    if (editing && formOpen) description.current?.focus();
  }, [editing, formOpen]);

  useEffect(() => {
    let current = true;
    request("/projects").then(value => { if (current) setProjects(value); }).catch(() => {});
    return () => { current = false; };
  }, [request]);

  useEffect(() => {
    let current = true;
    request(`/finance?month=${encodeURIComponent(month)}`).then(value => {
      if (current) setReport(value);
    }).catch(error => {
      if (current) setLoadingError(error.message);
    });
    return () => { current = false; };
  }, [month, refresh, request]);

  async function submit(event) {
    event.preventDefault();
    if (mutation.current) return;
    const form = event.currentTarget;
    const { amount, ...fields } = Object.fromEntries(new FormData(form));
    const parsed = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
    if (!parsed || Number(amount) <= 0 || Number(amount) > 10_000_000) {
      setSaveError("Enter a positive amount with up to two decimal places.");
      return;
    }
    const payload = { ...fields, amount: Number(parsed[1]) * 100 + Number((parsed[2] ?? "").padEnd(2, "0")) };
    const signature = JSON.stringify(payload);
    const id = submission?.signature === signature ? submission.id : crypto.randomUUID();
    setSubmission({ id, signature });
    mutation.current = true;
    setSaving(true);
    setSaveError("");
    setSaved("");
    try {
      await request(editing ? "/finance/" + editing._id.split(":").at(-1) : "/finance",
        { method: editing ? "PATCH" : "POST", body: { id, ...payload } });
      setSubmission(null);
      setSaved(fields.name.trim());
      setEditing(null);
      setFormOpen(false);
      form.reset();
      setMonth(fields.date.slice(0, 7));
      setReport(null);
      setLoadingError("");
      setRefresh(value => value + 1);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      mutation.current = false;
      setSaving(false);
    }
  }

  async function remove(entry) {
    if (mutation.current || !window.confirm(`Remove "${entry.name}" from the studio ledger?`)) return;
    mutation.current = true;
    setSaving(true);
    setSaved("");
    setSaveError("");
    try {
      await request("/finance/" + entry._id.split(":").at(-1), { method: "DELETE" });
      if (entry._id === editing?._id) setEditing(null);
      setLoadingError("");
      setRefresh(value => value + 1);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      mutation.current = false;
      setSaving(false);
    }
  }

  return (
    <section className="operations-finance" aria-label="Finance">
      <nav className="operations-finance__toolbar" aria-label="Finance sections">
        {Object.entries(sections).map(([key, label]) => <button type="button" key={key}
          aria-current={section === key ? "page" : undefined} onClick={() => onView(key)}>{label}</button>)}
      </nav>
      {section === "usage" ? <SubscriptionDetails hosts={hosts} request={request} /> : <>
      <div className="operations-finance__toolbar">
        <label>Reporting month <input type="month" value={month} onChange={event => {
          if (!event.target.value) return;
          setLoadingError("");
          setReport(null);
          setMonth(event.target.value);
        }} /></label>
        {section === "overview" && <SubscriptionLink observation={hosts.find(host => host.online && host.usage)?.usage ||
          hosts.find(host => host.usage)?.usage} />}
        <small>Manual studio ledger</small>
      </div>
      {section === "infrastructure" && <p>GCP billing synchronization is unavailable. This view shows manually recorded Cloud, Hosting, and Domains entries.</p>}
      {section === "expenses" && <details open={formOpen} onToggle={event => setFormOpen(event.currentTarget.open)}>
        <summary>{editing ? "Edit " + editing.name : "Record an expense, commitment, or budget"}</summary>
        <form key={editing?._id || "new"} onSubmit={submit} className="operations-finance__form">
          <label>Description <input ref={description} name="name" defaultValue={editing?.name} required maxLength={160} /></label>
          <label>Record type <select name="kind" defaultValue={editing?.kind}>{Object.entries(kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Amount <input name="amount" defaultValue={editing && (editing.amount / 100).toFixed(2)} inputMode="decimal" required /></label>
          <label>Currency <select name="currency" defaultValue={editing?.currency}>{["USD", "CAD", "EUR", "GBP"].map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Category <select name="category" defaultValue={editing?.category}>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Date <input name="date" type="date" defaultValue={editing?.date || dateToday()} required /></label>
          <label>Project <select name="projectId" defaultValue={editing?.projectId || ""}><option value="">Studio-wide</option>{projects.map(project => <option key={project._id} value={project._id}>{project.name}</option>)}</select></label>
          <label>Notes <textarea name="notes" defaultValue={editing?.notes} maxLength={2000} /></label>
          <button disabled={saving}>{saving ? "Saving…" : "Save record"}</button>
          {editing && <button type="button" disabled={saving} onClick={() => setEditing(null)}>Cancel edit</button>}
        </form>
      </details>}
      {section === "expenses" && saveError && <p role="alert">{saveError}</p>}
      {section === "expenses" && saved && <p role="status">Saved {saved}.</p>}
      {loadingError && <p role="alert">{loadingError}</p>}
      {!report && !loadingError && <p role="status">Loading finance records…</p>}
      {report && section === "overview" && <>
        <div className="operations-finance__totals">
          {Object.entries(report.totals).map(([currency, totals]) => (
            <dl key={currency}>
              <div><dt>Recorded expenses</dt><dd>{money(totals.expenses, currency)}</dd></div>
              <div><dt>Studio-wide monthly budget</dt><dd>{money(totals.budget, currency)}</dd></div>
              <div><dt>Open-ended annual commitments</dt><dd>{money(totals.annualCommitments, currency)}</dd></div>
              {totals.budget != null && totals.expenses != null && <div><dt>Studio-wide budget remaining</dt><dd>{money(totals.budget - totals.expenses, currency)}</dd></div>}
            </dl>
          ))}
        </div>
        {Object.entries(report.byCategory || {}).map(([currency, breakdown]) => <details key={currency}>
          <summary>{currency} expenses by category</summary>
          <dl className="operations__execution-summary">{Object.entries(breakdown).map(([name, amount]) =>
            <div key={name}><dt>{name}</dt><dd>{money(amount, currency)}</dd></div>)}</dl>
        </details>)}
        {!!report.projectBudgets?.length && <details>
          <summary>Project budgets ({report.projectBudgets.length})</summary>
          <ul className="operations-finance__entries">
            {report.projectBudgets.map(({ projectId, currency, budget, expenses }) => <li key={projectId + "/" + currency}>
              <div><strong>{projects.find(project => project._id === projectId)?.name ?? "Project"}</strong>
                <small>Budget {money(budget, currency)} · Recorded expenses {money(expenses, currency)}</small>
              </div>
              {expenses != null && <span>{money(budget - expenses, currency)} remaining</span>}
            </li>)}
          </ul>
        </details>}
        {!!report.renewals?.length && <details>
          <summary>Scheduled renewals this month ({report.renewals.length})</summary>
          <ul className="operations-finance__entries">{report.renewals.map(item => <li key={item.id}>
            <div><strong>{item.name}</strong><small>{item.date} · Based on manual commitment</small></div>
            <span>{money(item.amount, item.currency)}</span>
          </li>)}</ul>
        </details>}
      </>}
      {report && <ExpenseEntries entries={section === "infrastructure"
        ? report.entries.filter(entry => infrastructureCategories.includes(entry.category))
        : section === "overview" ? report.entries.slice(0, 5) : report.entries} projects={projects}
        actions={section === "expenses" ? entry => entry.source === "manual" && <>
          <button type="button" disabled={saving} onClick={() => {
            setEditing(entry);
            setFormOpen(true);
            setSaveError("");
            setSaved("");
          }}>Edit</button>
          <button type="button" disabled={saving} onClick={() => remove(entry)}>Remove</button>
        </> : null} />}
      </>}
    </section>
  );
}

function ExpenseEntries({ entries, projects, actions }) {
  return entries.length ? <ul className="operations-finance__entries">{entries.map(entry => (
          <li key={entry._id}>
            <div><strong>{entry.name}</strong><small>{entry.date} · {kinds[entry.kind]} · {entry.category}
              {entry.projectId && ` · ${projects.find(project => project._id === entry.projectId)?.name ?? "Project"}`}
              {entry.budgetSuperseded && " · Superseded budget"}
            </small>{entry.notes && <small>{entry.notes}</small>}</div><span>{money(entry.amount, entry.currency)}</span>
            {actions && <div className="operations-finance__entry-actions">{actions(entry)}</div>}
          </li>
  ))}</ul> : <p>No manual records for this period.</p>;
}
