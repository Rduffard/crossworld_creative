const guides = [
  ["Headquarters", "Review live hosts, pending approvals, recent outcomes, and work awaiting attention. Open the linked source to see its current details."],
  ["Command Center", "Choose New conversation and write a message. Open Execution settings for host, workspace, reasoning effort, and permissions. Use Ctrl or Command + Enter to submit."],
  ["Command Center", "In a new conversation, ask Barnaby what needs attention or request an objective for the exact name of an active project. Review the structured proposal and its criteria before creating the objective."],
  ["Command Center", "Select a conversation in History to see its messages. Load older messages as needed. Search by name or content, or select Archived sessions. Open Actions on a conversation to rename or archive it. Use Execution for newest-first activity, earlier turns, and pending approvals. Copy the complete conversation or download an export from the transcript."],
  ["Command Center", "On an updated relay, start a new conversation with Barnaby and ask him to delegate a read-only Operations interface review to Iona Keel. Open the linked assignment to see its queue state and transcript. Ask Barnaby for the outcome once the review finishes."],
  ["Schedules", "Open Schedule a new session from a new conversation. Select a local start time and, if needed, a fixed daily or weekly interval. Return to Schedules to check upcoming work or stop a series."],
  ["Workforce", "Open a worker profile to inspect recorded responsibilities or assignments. Select Message employee for a read-only conversation when a compatible relay is online. Assign production work from an objective."],
  ["Office", "Select a worker to inspect their profile and a host to follow its current execution. Worker and host status come from recorded activity."],
  ["Projects", "Create or open a project to record its workspace and repository context. Open its objectives to see the work needed for delivery."],
  ["Objectives", "Record an outcome and measurable criteria, then assign the work from the objective. Queue independent QA against a completed turn and use the evidence to decide whether to accept each criterion."],
  ["Reports", "Open View Final Report from a completed assignment or search by title or employee. Copy the summary or full report, or download Markdown, text, or JSON."],
  ["Engineering", "Refresh the GitHub snapshot to inspect public repository activity, workflows, issues, pull requests, and releases. Open a result to see the evidence on GitHub."],
  ["Finance", "Record a studio expense, recurring commitment, or budget with its date, amount, currency, and category. Choose a reporting month to see recorded expenses and expected renewals."],
  ["Knowledge", "Search sourced research, methods, and findings. Link records to a project so related assignments receive relevant validated findings. Open Workshop to import or browse local experimental resource metadata."],
  ["Art Department", "Create a brief, link its objective and reference evidence, and record separate technical and artistic reviews. Recommendation requires a completed passing QA turn for that objective. The owner records the acceptance decision separately."],
  ["References", "Upload images and videos while the storage device is online. Register attachments with a source and project, then approve references you want reused. Attach an image to a conversation or select approved project images when preparing an assignment."],
  ["Activity", "Filter recorded executions, objective updates, and knowledge changes. Open an event to review its source."],
  ["Settings", "Check relay connectivity, manage Windows devices, and review operation policies. Open Studio foundation to preview the owner-scoped records before initialization. Restart the registered worker if the relay is offline."],
];

export default function OperationsHelp({ navigate }) {
  return <div className="operations__guide">
    <section className="operations__panel">
      <h2>Start here</h2>
      <ol>
        <li>Check Headquarters for attention items and a connected relay.</li>
        <li>Open Command Center and try “Summarize the open work and tell me which evidence you used.”</li>
        <li>For a concrete deliverable, open a project and create an objective with acceptance criteria.</li>
      </ol>
      <h2>Recover a conversation</h2>
      <p>Reopen the turn from History after a refresh or disconnection. Draft text is saved in this browser by conversation. The relay and its registered Windows host manage execution independently of your browser.</p>
    </section>
    {guides.map(([name, text]) => <section key={text} className="operations__panel">
      <h2>{name}</h2>
      <p>{text}</p>
      <button type="button" onClick={() => navigate(name)}>Open {name}</button>
    </section>)}
  </div>;
}
