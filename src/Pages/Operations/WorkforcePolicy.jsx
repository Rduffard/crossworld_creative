import { useEffect, useState } from "react";
import { profileNames } from "./workspaces";

const efforts = ["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"];
const authorityNames = { locked: "Locked", "approval-required": "Approval required", "bounded-discretion": "Bounded discretion" };
const parseList = value => value.split(",").map(item => item.trim()).filter(Boolean);

function PolicyForm({ policy, employees, departments, save, pending }) {
  const [scope, setScope] = useState("defaults");
  const [selected, setSelected] = useState([]);
  const [authority, setAuthority] = useState(policy.authority);
  const options = scope === "employees" ? employees : departments;
  const record = options.find(option => option._id === selected[0]);
  const override = selected.length === 1 ? policy[scope]?.[selected[0]] : null;
  const effective = {
    ...policy.defaults,
    ...(scope === "employees" && record ? policy.departments[record.departmentId] : {}),
    ...override,
  };
  const global = scope === "defaults";

  function submit(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const values = Object.fromEntries(["model", "effort", "profile"].flatMap(key =>
      fields[key]?.trim() ? [[key, fields[key].trim()]] : []));
    if (global) {
      save({ ...policy, defaults: values, maxExecutions: Number(fields.maxExecutions), authority, bounds: {
        models: parseList(fields.models), efforts: parseList(fields.efforts), profiles: parseList(fields.profiles),
      } });
      return;
    }
    const settings = { ...policy[scope] };
    for (const id of selected) {
      if (Object.keys(values).length) settings[id] = values;
      else delete settings[id];
    }
    save({ ...policy, [scope]: settings });
  }

  return <>
    <label>Configuration scope <select value={scope} onChange={event => {
      setScope(event.target.value);
      setSelected([]);
    }}>
      <option value="defaults">Global defaults</option>
      <option value="departments">Department overrides</option>
      <option value="employees">Employee overrides</option>
    </select></label>
    {!global && <label>{scope === "employees" ? "Employees" : "Departments"}
      <select multiple value={selected} onChange={event => setSelected(Array.from(event.target.selectedOptions, option => option.value))}>
        {options.map(option => <option key={option._id} value={option._id}>{option.name}</option>)}
      </select>
    </label>}
    {!global && selected.length === 1 && <p>
      Saved effective configuration · {effective.model} · {effective.effort} reasoning · {profileNames[effective.profile]}
    </p>}
    {(global || selected.length > 0) && <form key={scope + selected.join("/")} onSubmit={submit} className="operations-finance__form">
      <label>Model <input name="model" maxLength={80} required={global} defaultValue={global ? policy.defaults.model : override?.model}
        placeholder={global ? undefined : "Inherit model"} /></label>
      <label>Reasoning effort <select name="effort" defaultValue={(global ? policy.defaults.effort : override?.effort) || ""}>
        {!global && <option value="">Inherit effort</option>}
        {efforts.map(effort => <option key={effort}>{effort}</option>)}
      </select></label>
      <label>Permission profile <select name="profile" defaultValue={(global ? policy.defaults.profile : override?.profile) || ""}>
        {!global && <option value="">Inherit permissions</option>}
        {Object.entries(profileNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      {global && <>
        <label>Desired maximum executions <input name="maxExecutions" type="number" min={1} required defaultValue={policy.maxExecutions} /></label>
        <label>First Mate authority <select value={authority} onChange={event => setAuthority(event.target.value)}>
          {Object.entries(authorityNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Allowed models (comma separated) <input name="models" defaultValue={policy.bounds.models.join(", ")} /></label>
        <label>Allowed reasoning efforts (comma separated) <input name="efforts" defaultValue={policy.bounds.efforts.join(", ")} /></label>
        <label>Allowed permission profiles <input name="profiles" defaultValue={policy.bounds.profiles.join(", ")}
          placeholder="read-only, development" /></label>
      </>}
      <button type="submit" disabled={pending}>{pending ? "Saving…" : selected.length > 1 ? "Save selected overrides" : "Save configuration"}</button>
    </form>}
  </>;
}

export default function WorkforcePolicy({ api, employees, departments }) {
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const path = "/workforce/execution-policy";
  useEffect(() => {
    let active = true;
    api(path).then(result => { if (active) setPolicy(result); })
      .catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [api]);

  async function save(configuration) {
    if (pending) return;
    setPending(true);
    setSaved(false);
    setError("");
    try {
      setPolicy(await api(path, { method: "PUT", body: configuration }));
      setSaved(true);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setPending(false);
    }
  }

  return <section aria-label="Execution policy">
    <p>Saved policy · Runtime enforcement pending. Existing relay capacity and current per-turn controls apply.</p>
    <p>Preview order starts with global defaults, then applies department and employee overrides. Planned execution enforcement applies explicit assignment settings last.</p>
    {error && <p role="alert">{error}</p>}
    {saved && <p role="status">Configuration saved.</p>}
    {policy ? <PolicyForm key={policy.revision} policy={policy} employees={employees} departments={departments} save={save} pending={pending} />
      : !error && <p role="status">Loading configuration…</p>}
  </section>;
}
