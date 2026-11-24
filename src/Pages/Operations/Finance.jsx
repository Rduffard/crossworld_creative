import { useEffect, useState } from "react";
import "./finance.css";

const dateToday = () => new Date().toISOString().slice(0, 10);
const categories = ["Cloud", "Software", "Domains", "Hosting", "Equipment", "Other"];
const kinds = { expense: "Expense", monthly: "Monthly commitment", annual: "Annual commitment", budget: "Monthly budget" };
const money = (value, currency) => value == null ? "—" : new Intl.NumberFormat(undefined, {
  style: "currency", currency,
}).format(value / 100);

export default function Finance({ request }) {
  const [month, setMonth] = useState(() => dateToday().slice(0, 7));
  const [refresh, setRefresh] = useState(0);
  const [report, setReport] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingError, setLoadingError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submission, setSubmission] = useState(null);

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
    const form = event.currentTarget;
    const { amount, ...fields } = Object.fromEntries(new FormData(form));
    const parsed = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
    if (!parsed) {
      setSaveError("Enter a positive amount with up to two decimal places.");
      return;
    }
    const payload = { ...fields, amount: Number(parsed[1]) * 100 + Number((parsed[2] ?? "").padEnd(2, "0")) };
    const signature = JSON.stringify(payload);
    const id = submission?.signature === signature ? submission.id : crypto.randomUUID();
    setSubmission({ id, signature });
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      await request("/finance", { method: "POST", body: { id, ...payload } });
      setSubmission(null);
      setSaved(true);
      form.reset();
      setMonth(fields.date.slice(0, 7));
      setReport(null);
      setLoadingError("");
      setRefresh(value => value + 1);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="operations-finance" aria-label="Finance">
      <div className="operations-finance__toolbar">
        <label>Reporting month <input type="month" value={month} onChange={event => {
          if (!event.target.value) return;
          setLoadingError("");
          setReport(null);
          setMonth(event.target.value);
        }} /></label>
        <small>Manual studio ledger · Cloud billing unavailable</small>
      </div>
      <details>
        <summary>Record an expense, commitment, or budget</summary>
        <form onSubmit={submit} className="operations-finance__form">
          <label>Description <input name="name" required maxLength={160} /></label>
          <label>Record type <select name="kind">{Object.entries(kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Amount <input name="amount" inputMode="decimal" required /></label>
          <label>Currency <select name="currency">{["USD", "CAD", "EUR", "GBP"].map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Category <select name="category">{categories.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Date <input name="date" type="date" defaultValue={dateToday()} required /></label>
          <label>Project <select name="projectId"><option value="">Studio-wide</option>{projects.map(project => <option key={project._id} value={project._id}>{project.name}</option>)}</select></label>
          <button disabled={saving}>{saving ? "Saving…" : "Save record"}</button>
        </form>
        {saveError && <p role="alert">{saveError}</p>}
        {saved && <p role="status">Record saved.</p>}
      </details>
      {loadingError && <p role="alert">{loadingError}</p>}
      {!report && !loadingError && <p role="status">Loading finance records…</p>}
      {report && <>
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
        {report.entries.length ? <ul className="operations-finance__entries">{report.entries.map(entry => (
          <li key={entry._id}>
            <div><strong>{entry.name}</strong><small>{entry.date} · {kinds[entry.kind]} · {entry.category}
              {entry.projectId && ` · ${projects.find(project => project._id === entry.projectId)?.name ?? "Project"}`}
              {entry.budgetSuperseded && " · Superseded budget"}
            </small></div><span>{money(entry.amount, entry.currency)}</span>
          </li>
        ))}</ul> : <p>No manual records for this period.</p>}
      </>}
    </section>
  );
}
