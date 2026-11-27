import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SubscriptionLink } from "./subscriptionUsage";
import { requestJson } from "../../utils/api";
import { MediaComposer, MediaLibrary } from "./MediaAttachments";
import OperationsShell from "./OperationsShell";
import Missions from "./Missions";
import { profileNames, workspaceNames, workspaces } from "./workspaces";
import { conversationLink, conversationTurn, executionIdPattern as jobIdPattern, firstMateSession,
  isFirstMateConversation, saveFirstMateSession } from "./conversationNavigation";
import {
  ATTACHMENT_BYTES, LEGACY_PROMPT_LIMIT, PROMPT_LIMIT, importPromptFile, loadPromptDraft, savePromptDraft,
} from "./promptEditor";
import { turnActor } from "./timelineEntries.js";
import "./Operations.css";
import "./Conversation.css";

const Activity = lazy(() => import("./Activity"));
const ArtDepartment = lazy(() => import("./ArtDepartment"));
const Engineering = lazy(() => import("./Engineering"));
const Finance = lazy(() => import("./Finance"));
const Headquarters = lazy(() => import("./Headquarters"));
const Infrastructure = lazy(() => import("./Infrastructure"));
const ExecutionApprovals = lazy(() => import("./ExecutionApprovals"));
const JobTranscript = lazy(() => import("./JobTranscript"));
const Knowledge = lazy(() => import("./Knowledge"));
const Objectives = lazy(() => import("./Objectives"));
const ObjectiveProposal = lazy(() => import("./ObjectiveProposal"));
const OperationsHelp = lazy(() => import("./OperationsHelp"));
const OrganizationSetup = lazy(() => import("./OrganizationSetup"));
const Projects = lazy(() => import("./Projects"));
const ReferenceLibrary = lazy(() => import("./ReferenceLibrary"));
const VirtualOffice = lazy(() => import("./VirtualOffice"));
const ArtifactGallery = lazy(() => import("./ArtifactGallery"));
const Quality = lazy(() => import("./Quality"));
const Communications = lazy(() => import("./Communications"));
const Reports = lazy(() => import("./Reports"));
const Workflow = lazy(() => import("./Workflow"));
const Blueprints = lazy(() => import("./Blueprints"));
const Workforce = lazy(() => import("./Workforce"));

const api = (path, options) => requestJson(`/operations${path}`, { auth: true, ...options });
async function post(path, body) {
  try {
    return await api(path, { method: "POST", body });
  } catch (failure) {
    if (failure.status === 413) throw new Error("The request exceeds the Operations transport limit. Shorten the prompt and try again.");
    throw failure;
  }
}
const directPermissionKey = "cw_operations_direct_development_permission";

function loadDirectPermission() {
  try {
    const profile = window.localStorage.getItem(directPermissionKey);
    return ["scoped", "full-access"].includes(profile) ? profile : "read-only";
  } catch {
    return "read-only";
  }
}

const running = ["scheduled", "waiting", "queued", "running", "cancelling"];
function executionStatus(job, host) {
  if (job.status === "waiting") return "Waiting for previous turn";
  if (job.status === "queued") return job.queueReason || "Queued for worker";
  if (job.status === "running" && host && !host.online) return "Relay disconnected";
  if (job.status !== "running") return job.status[0].toUpperCase() + job.status.slice(1);
  if (job.approval?.state === "pending") {
    return job.decision?.id === job.approval.id ? "Decision sent" : "Waiting for owner";
  }
  if (!job.activeTurn) return "Connecting to Codex";
  if (job.delegatedBy || job.workerRole === "qa") return "Independent review";
  if (job.workerRole === "correction") return "Correcting";
  return "Processing";
}
function ExecutionElapsed({ startedAt, finishedAt, active }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active || !startedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active, startedAt]);
  if (!startedAt || (!active && !finishedAt)) return null;
  const seconds = Math.max(0, Math.floor(((finishedAt ? Date.parse(finishedAt) : now) - Date.parse(startedAt)) / 1000));
  const minutes = Math.floor(seconds / 60);
  return <small className="operations__elapsed" aria-label={seconds + " seconds elapsed"}>
    {minutes}:{String(seconds % 60).padStart(2, "0")}
  </small>;
}
const localPolicyOperations = ["read", "history", "ci", "localBranch", "localCommit"];
const mobileConversationQuery = "(max-width: 900px)";
const modes = ["Conversation", "Execution"];
const sourcePages = {
  "workflow-job": "Workflow", "workflow-project": "Workflow", "workflow-objective": "Workflow", "workflow-employee": "Workflow",
  report: "Reports", objective: "Objectives", "project-objectives": "Objectives", project: "Projects", knowledge: "Knowledge", employee: "Workforce" };

function getDraft(session) {
  try { return { prompt: loadPromptDraft(window.localStorage, session), error: "" }; }
  catch { return { prompt: "", error: "Draft storage is unavailable in this browser." }; }
}

function localScheduleTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(+date)) return null;
  const wallTime = new Date(+date - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  return wallTime === value ? date : null;
}

export default function Operations() {
  const [params, setParams] = useSearchParams();
  const requestedId = params.get("job");
  const exactJobId = jobIdPattern.test(requestedId || "") ? requestedId : "";
  const requestedSession = params.get("conversation");
  const conversationId = !exactJobId && jobIdPattern.test(requestedSession || "") ? requestedSession : "";
  const [conversation, setConversation] = useState(null);
  const resolvedConversation = conversation?.id === conversationId ? conversation : null;
  const jobId = exactJobId || resolvedConversation?.turnId || "";
  const hasConversation = !!(conversationId || jobId);
  const recipientId = !hasConversation && jobIdPattern.test(params.get("recipient") || "") ? params.get("recipient") : "";
  const page = workspaces.find(([slug]) => slug === params.get("workspace"))?.[1] || (params.size ? "Command Center" : "Headquarters");
  const scheduling = page === "Command Center" && params.get("compose") === "schedule";
  const scheduleSummary = useRef(null);
  const recordGroup = params.get("source");
  const financeView = page === "Finance" && recordGroup === "finance" ? params.get("record") : null;
  const linkedRecord = sourcePages[recordGroup] === page ? { target: page, group: recordGroup, id: params.get("record") } : null;
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [relayError, setRelayError] = useState("");
  const [transcriptError, setTranscriptError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pinnedFirstMate, setPinnedFirstMate] = useState(() => {
    try { return firstMateSession(window.localStorage); }
    catch { return ""; }
  });
  const [archived, setArchived] = useState(false);
  const [history, setHistory] = useState(null);
  const [profileChoice, setProfileChoice] = useState(null);
  const [directPermission, setDirectPermission] = useState(loadDirectPermission);
  const [permissionError, setPermissionError] = useState("");
  const [ownerPreferences, setOwnerPreferences] = useState(null);
  const [preferencesVersion, setPreferencesVersion] = useState(0);
  const [preferencePending, setPreferencePending] = useState(false);
  const [policyRole, setPolicyRole] = useState("direct");
  const [job, setJob] = useState(null);
  const [showApprovalInbox, setShowApprovalInbox] = useState(false);
  const historyDrawer = useRef(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [assignment, setAssignment] = useState(null);
  const [includeProjectReferences, setIncludeProjectReferences] = useState(false);
  const [outputScope, setOutputScope] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const recipient = recipients.find(employee => employee._id === recipientId);
  const [assignees, setAssignees] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [preferredMode, setMode] = useState(() => {
    try {
      const preference = window.localStorage.getItem("cw_operations_desk_view");
      if (modes.includes(preference)) return preference;
    } catch { /* Browser storage is optional. */ }
    return "Conversation";
  });
  const [compact, setCompact] = useState(() => window.matchMedia(mobileConversationQuery).matches);
  const [conversationLayout, setConversationLayout] = useState(null);
  const [inspection, setInspection] = useState("");
  const conversationKey = conversationId || jobId;
  const mode = conversationId || (compact && inspection !== exactJobId) ? "Conversation" : preferredMode;
  const conversationExpanded = !!conversationKey && mode === "Conversation" &&
    (conversationLayout?.key === conversationKey ? conversationLayout.expanded : compact);

  useEffect(() => {
    const query = window.matchMedia(mobileConversationQuery);
    const sync = () => setCompact(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  const [scheduledTime, setScheduledTime] = useState("");
  const [repeatDays, setRepeatDays] = useState(0);
  const [repeatCount, setRepeatCount] = useState(3);
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [hostId, setHostId] = useState("");
  const [workspace, setWorkspace] = useState("development");
  const [effort, setEffort] = useState("");
  const [studioEffort, setStudioEffort] = useState(null);
  const session = conversationId || (job?._id === jobId ? job.sessionId : "");
  const draftKey = session || (hasConversation ? null : recipientId);
  const [storedDrafts, setDrafts] = useState({});
  const draft = storedDrafts[draftKey] ?? (draftKey === null ? { prompt: "", error: "" } : getDraft(draftKey));
  const { prompt } = draft;
  const [expanded, setExpanded] = useState(false);
  const promptInput = useRef(null);
  const composerAvailable = !!snapshot && !accessDenied && page === "Command Center";
  useLayoutEffect(() => {
    const node = promptInput.current;
    if (!node || !compact || !jobId || expanded) return;
    let width;
    function fit() {
      width = node.clientWidth;
      node.style.height = "auto";
      node.style.height = node.scrollHeight + node.offsetHeight - node.clientHeight + "px";
    }
    fit();
    const observer = new ResizeObserver(() => {
      if (node.clientWidth !== width) fit();
    });
    observer.observe(node, { box: "border-box" });
    return () => {
      observer.disconnect();
      node.style.removeProperty("height");
    };
  }, [prompt, compact, jobId, expanded, mode, composerAvailable]);

  const [importing, setImporting] = useState(false);
  const [attachment, setAttachment] = useState({});
  const [mediaDrafts, setMediaDrafts] = useState({});
  const [uploadingDraft, setUploadingDraft] = useState(null);
  const [deviceName, setDeviceName] = useState("");
  const [credential, setCredential] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const pendingSubmit = useRef(null);
  const pendingSteer = useRef(null);
  const eventBuffer = useRef(null);
  const query = new URLSearchParams({ archived: String(archived), compact: "true" });
  if (searchTerm) query.set("search", searchTerm);
  const historyKey = query.toString();

  useEffect(() => {
    const debounce = setTimeout(() => setSearchTerm(search.trim()), 250);
    return () => clearTimeout(debounce);
  }, [search]);

  async function loadOlder() {
    const query = new URLSearchParams(historyKey);
    const key = historyKey;
    const current = history?.key === key ? history : null;
    const latest = snapshot.jobs || [];
    const cursor = current?.cursor || latest.at(-1)?._id;
    if (!cursor || current?.loading) return;
    query.set("before", cursor);
    setHistory({ ...current, key, loading: true });
    try {
      const rows = await api(`/jobs?${query}`);
      setHistory((previous) => previous?.key === key ? {
        key, entries: [...(current?.entries || latest), ...rows],
        cursor: rows.at(-1)?._id, end: rows.length < 50,
      } : previous);
    } catch (failure) {
      setHistory((previous) => previous?.key === key ? { ...current, key, error: failure.message } : previous);
    }
  }

  useEffect(() => {
    if (!conversationExpanded || page !== "Command Center") return;
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    const previous = meta.content;
    meta.content = previous + ", viewport-fit=cover";
    return () => { meta.content = previous; };
  }, [conversationExpanded, page]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const sync = () => {
      if (viewport.scale === 1) document.documentElement.style.setProperty("--operations-viewport", `${viewport.height}px`);
      else document.documentElement.style.removeProperty("--operations-viewport");
      document.documentElement.style.setProperty("--operations-viewport-top", (viewport.scale === 1 ? viewport.offsetTop : 0) + "px");
      setKeyboardOpen(viewport.scale === 1 && window.innerHeight - viewport.height > 120 &&
        ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName));
    };
    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
      document.documentElement.style.removeProperty("--operations-viewport-top");
      document.documentElement.style.removeProperty("--operations-viewport");
    };
  }, []);

  useEffect(() => {
    const reconnect = () => {
      if (!document.hidden) setRefreshVersion((value) => value + 1);
    };
    window.addEventListener("online", reconnect);
    document.addEventListener("visibilitychange", reconnect);
    return () => {
      window.removeEventListener("online", reconnect);
      document.removeEventListener("visibilitychange", reconnect);
    };
  }, []);

  const schedulingAvailable = scheduling && !!snapshot?.schedule;
  useEffect(() => {
    if (schedulingAvailable) scheduleSummary.current?.focus();
  }, [schedulingAvailable]);

  function openJob(id, view) {
    selectJob(id);
    setInspection(view === "Execution" ? id : "");
    changeMode(view);
  }

  function openConversation(turn) {
    if (!turn.sessionId) return openJob(turn._id, "Conversation");
    selectJob(null, null, null, turn.sessionId);
    setAssignment(null);
    changeMode("Conversation");
  }

  function updateFirstMatePin(id) {
    try {
      saveFirstMateSession(window.localStorage, id);
      setPinnedFirstMate(id);
      setNotice(id ? "First Mate conversation pinned on this device." : "First Mate conversation unpinned.");
    } catch {
      setError("This browser could not save the First Mate shortcut.");
    }
  }

  async function openFirstMate() {
    if (pinnedFirstMate) return openConversation({ sessionId: pinnedFirstMate });
    const location = window.location.href;
    try {
      const recent = await api("/jobs?archived=false&compact=true&firstMate=true");
      if (location !== window.location.href) return;
      const turn = recent.find(isFirstMateConversation);
      if (turn) openConversation(turn);
      else messageEmployee(null);
    } catch (failure) {
      if (location === window.location.href) setError(failure.message);
    }
  }

  function openSource(group, id) {
    if (group === "job") return openJob(id, "Conversation");
    if (sourcePages[group]) setPage(sourcePages[group], group, id);
  }

  function prepareAssignment(objective, projectWorkspace) {
    if (projectWorkspace) setWorkspace(projectWorkspace);
    setAssignment({ id: objective._id, title: objective.title });
    setIncludeProjectReferences(false);
    setEmployeeId("");
    selectJob(null);
    changeMode("Conversation");
  }

  function setPage(target, group, id, options) {
    const slug = workspaces.find(([, name]) => name === target)?.[0];
    if (!slug) return;
    const next = new URLSearchParams(params);
    next.set("workspace", slug);
    next.delete("compose");
    if (group && id) {
      next.set("source", group);
      next.set("record", id);
    } else {
      next.delete("source");
      next.delete("record");
    }
    setParams(next, options);
  }

  function messageEmployee(employee) {
    if (employee?.role === "first-mate") return openFirstMate();
    setAssignment(null);
    selectJob(null, employee?._id);
    changeMode("Conversation");
  }

  function selectJob(id, employee, compose, sessionId) {
    setConversationLayout(null);
    setInspection("");
    setProfileChoice(null);
    setOutputScope(null);
    const next = new URLSearchParams(params);
    next.set("workspace", "command");
    next.delete("source");
    next.delete("record");
    if (compose) next.set("compose", compose);
    else next.delete("compose");
    if (employee) next.set("recipient", employee);
    else next.delete("recipient");
    if (sessionId) next.set("conversation", sessionId);
    else next.delete("conversation");
    if (id) {
      next.set("job", id);
      setAssignment(null);
      setIncludeProjectReferences(false);
    }
    else next.delete("job");
    setParams(next);
    setRescheduleTime("");
    setAttachment({});
    setError("");
    historyDrawer.current?.close();
  }

  function useReference(record) {
    if (!record?.hostId || !record._id || !["image/png", "image/jpeg", "image/webp"].includes(record.mime) ||
        !Number.isSafeInteger(record.size) || record.size > 12 * 1024 * 1024) {
      setError("Select a supported image up to 12 MiB for Command Center.");
      return;
    }
    const key = JSON.stringify(["", record.hostId]);
    const items = mediaDrafts[key] || [];
    if (!items.some((item) => item._id === record._id)) {
      if (items.length >= 4) {
        setError("The new conversation draft already has four images. Remove one before adding this reference.");
        return;
      }
      setMediaDrafts((current) => ({ ...current, [key]: [...items, record] }));
    }
    setHostId(record.hostId);
    setAssignment(null);
    selectJob(null);
    setNotice("Reference attached to your new conversation draft.");
  }

  function changeMode(value) {
    setMode(value);
    try { window.localStorage.setItem("cw_operations_desk_view", value); }
    catch { /* Browser storage is optional. */ }
  }

  useEffect(() => {
    if (page !== "Command Center" || hasConversation || assignment || accessDenied) return;
    let current = true;
    api("/workforce").then(({ employees }) => {
      if (current) setRecipients(employees.filter(employee => employee.status === "available"));
    }).catch(failure => { if (current) setError(failure.message); });
    return () => { current = false; };
  }, [page, hasConversation, assignment, accessDenied]);

  useEffect(() => {
    if (!assignment) return;
    let current = true;
    api("/workforce").then(({ employees }) => {
      if (current) setAssignees(employees.filter((entry) => ["worker", "lead", "art-director"].includes(entry.role) && entry.status === "available"));
    }).catch((failure) => { if (current) setError(failure.message); });
    return () => { current = false; };
  }, [assignment]);

  useEffect(() => {
    if (page !== "Command Center" || hasConversation || accessDenied) return;
    const controller = new AbortController();
    api("/workforce/execution-policy", { signal: controller.signal, cache: "no-store" })
      .then(policy => {
        if (!controller.signal.aborted) setStudioEffort(policy?.defaults?.effort || "medium");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStudioEffort("medium");
      });
    return () => controller.abort();
  }, [page, hasConversation, accessDenied]);

  useEffect(() => {
    if (page !== "Command Center" || !conversationId || accessDenied) return;
    const controller = new AbortController();
    let timer;
    async function refresh() {
      const query = new URLSearchParams({ session: conversationId, compact: "true" });
      try {
        const turns = await api("/jobs?" + query, { signal: controller.signal, cache: "no-store" });
        if (controller.signal.aborted) return;
        const turn = conversationTurn(turns);
        setConversation({ id: conversationId, turnId: turn?._id, error: turn ? "" : "This conversation could not be found." });
      } catch (failure) {
        if (controller.signal.aborted) return;
        setConversation(previous => ({
          id: conversationId,
          turnId: previous?.id === conversationId ? previous.turnId : undefined,
          error: failure.message,
        }));
      }
      timer = setTimeout(refresh, document.hidden ? 30_000 : 4000);
    }
    refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [page, conversationId, accessDenied, refreshVersion]);

  useEffect(() => {
    let active = true;
    let timer;
    async function refresh() {
      try {
        const command = page === "Command Center";
        const schedules = page === "Schedules";
        const sharedApprovals = command || page === "Headquarters" || page === "Settings" || page === "Approvals";
        const [hosts, jobs, approvals, schedule, dispatch, recurrence] = await Promise.all([
          api("/hosts"), command ? api(`/jobs?${historyKey}`) : null, sharedApprovals ? api("/approvals").catch((failure) => {
            if (failure.status === 404) return null;
            throw failure;
          }) : null, (command || schedules) ? api("/schedule").catch((failure) => {
            if (failure.status === 404) return null;
            throw failure;
          }) : null, (command || page === "Settings") ? api("/dispatch").catch((failure) => {
            if (failure.status === 404) return null;
            throw failure;
          }) : null, (command || schedules) ? api("/recurrence").catch(() => null) : null,
        ]);
        if (active) {
          setSnapshot((previous) => ({
            ...previous, hosts,
            ...(command ? { jobs, historyKey } : {}),
            ...(command || schedules ? { schedule, recurrence } : {}),
            ...(sharedApprovals ? { approvals } : {}),
            ...(command || page === "Settings" ? { dispatch } : {}),
          }));
          setRelayError("");
        }
      } catch (failure) {
        if (!active) return;
        if ([401, 403, 404].includes(failure.status)) {
          setAccessDenied(true);
          setSnapshot(null);
          return;
        }
        setRelayError(failure.message);
      }
      if (active) timer = setTimeout(refresh, document.hidden ? 30_000 : page === "Command Center" ? 4000 : 15_000);
    }
    refresh();
    return () => { active = false; clearTimeout(timer); };
  }, [historyKey, refreshVersion, page]);

  useEffect(() => {
    if (page !== "Command Center" || !jobId || accessDenied) return;
    let active = true;
    let timer;
    if (eventBuffer.current?.id !== jobId) {
      eventBuffer.current = { id: jobId, events: [], rendered: [] };
    }
    const buffer = eventBuffer.current;
    async function refresh() {
      try {
        const detail = await api(`/jobs/${jobId}?offset=${buffer.events.length}&compact=true`);
        if (!active) return;
        if (!detail.events.length && buffer.events.length < detail.eventCount) {
          throw new Error("Waiting for a committed execution event page.");
        }
        setTranscriptError(null);
        if (detail.events.length) {
          buffer.events.push(...detail.events);
          buffer.rendered = [...buffer.events];
        }
        setJob({ ...detail, events: buffer.rendered });
        if (!running.includes(detail.status) && !running.includes(detail.delegatedReview?.status) && buffer.events.length >= detail.eventCount) return;
        timer = setTimeout(refresh, buffer.events.length < detail.eventCount ? 0 : document.hidden ? 10_000 : detail.status === "scheduled" ? 5000 : 900);
      } catch (failure) {
        if (!active) return;
        setTranscriptError({ jobId, message: failure.message });
        if (![401, 403, 404].includes(failure.status)) timer = setTimeout(refresh, 2500);
      }
    }
    refresh();
    return () => { active = false; clearTimeout(timer); };
  }, [jobId, accessDenied, refreshVersion, page]);

  const executionHosts = snapshot?.hosts.filter(entry => !entry.revokedAt && !entry.isolatedReviewSnapshot && !entry.missionOnly) || [];
  const host = executionHosts.find(entry => entry._id === hostId) ||
    executionHosts.find(entry => entry.online) || executionHosts[0];
  const loadingEffort = !jobId && !effort && studioEffort === null;
  const preferredEffort = effort || (host?.efforts?.includes(studioEffort) ? studioEffort : "medium");
  const selectedEffort = !loadingEffort && host?.efforts?.includes(preferredEffort) ? preferredEffort : "";
  const selectedJob = job?._id === jobId ? job : null;
  const hostOnline = !relayError && host?.online;
  const selectedHost = snapshot?.hosts.find((entry) => entry._id === selectedJob?.hostId);
  const mediaHostId = jobId ? selectedJob?.hostId : host?._id;
  const mediaKey = draftKey === null || !mediaHostId ? null : JSON.stringify([draftKey, mediaHostId]);
  const mediaAttachments = mediaDrafts[mediaKey] || [];
  const mediaUploading = mediaKey !== null && uploadingDraft === mediaKey;
  const canReadPreferences = !!snapshot && !accessDenied;
  useEffect(() => {
    if (!canReadPreferences) return;
    let active = true;
    api("/owner-preferences").then(value => {
      if (active) setOwnerPreferences(value);
    }).catch(failure => {
      if (!active) return;
      if (failure.status === 404) setOwnerPreferences(false);
      else setPermissionError("Account execution preferences are unavailable.");
    });
    return () => { active = false; };
  }, [canReadPreferences, preferencesVersion]);
  const ordinaryConversation = !hasConversation && !assignment && !scheduling;
  const permissionContext = JSON.stringify([workspace, assignment?.id, recipientId, scheduling]);
  const savedDirectProfile = ownerPreferences === false ? directPermission
    : ownerPreferences?.directDevelopmentProfile || "read-only";
  const profile = profileChoice?.context === permissionContext ? profileChoice.value
    : ordinaryConversation && !recipientId && (workspace === "development" || savedDirectProfile === "scoped")
      ? savedDirectProfile : "read-only";
  const selectableEditing = ordinaryConversation ? ["development", "workshop", "scoped", "full-access"] :
    [workspace, ...(!scheduling ? ["scoped"] : []), "full-access"];
  const selectedProfile = !recipientId && selectableEditing.includes(profile) && host?.profiles?.includes(profile)
    ? profile : "read-only";
  const startingWorkspace = ordinaryConversation && ["development", "workshop"].includes(selectedProfile) ? selectedProfile : workspace;
  const canReturnMedia = !jobId && host?.mediaOutput && startingWorkspace === "workshop" && selectedProfile === "workshop";
  const outputScopeKey = JSON.stringify([host?._id, assignment?.id, employeeId, params.toString()]);
  const outputMedia = canReturnMedia && outputScope === outputScopeKey;
  const approval = selectedJob?.approval;
  const activeHistory = snapshot?.historyKey === historyKey ? snapshot.jobs : [];
  const older = history?.key === historyKey ? history : null;
  const sessions = new Map();
  const seenTurns = new Set();
  for (const entry of [...activeHistory, ...(older?.entries || [])]) {
    if (seenTurns.has(entry._id)) continue;
    seenTurns.add(entry._id);
    const id = entry.sessionId || entry._id;
    if (!sessions.has(id)) sessions.set(id, []);
    sessions.get(id).push(entry);
  }
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const dateGroups = new Map();
  for (const [id, turns] of sessions) {
    const day = new Date(turns[0].createdAt).toDateString();
    const group = day === today.toDateString() ? "Today" : day === yesterday.toDateString() ? "Yesterday" : "Earlier";
    if (!dateGroups.has(group)) dateGroups.set(group, []);
    dateGroups.get(group).push([id, turns]);
  }
  const awaitingApproval = selectedJob?.status === "running" && approval?.state === "pending";
  const permissionUnavailable = selectedJob?.events?.findLast(event => event.label === "Permission request unavailable");
  const canAct = !busy && !relayError && !!selectedHost?.online;
  const governance = snapshot?.approvals;
  const workerEnabled = governance?.workerEnabled !== false;

  const startLimit = host?.promptLimit ?? LEGACY_PROMPT_LIMIT;
  const continuationLimit = selectedHost?.promptLimit ?? LEGACY_PROMPT_LIMIT;
  const validPrompt = !!prompt.trim() && prompt.length <= PROMPT_LIMIT && prompt.isWellFormed();
  const promptError = prompt.length > PROMPT_LIMIT ? "The prompt exceeds 120,000 characters."
    : !prompt.isWellFormed() ? "The prompt contains invalid Unicode." : "";
  const editingLocked = busy || importing;
  const scheduleDate = localScheduleTime(scheduledTime);
  const workerOptions = assignees.filter((employee) => employee.workspace === workspace);
  const validAssignment = !assignment || (workerOptions.some((employee) => employee._id === employeeId) &&
    (!includeProjectReferences || host?.media));
  const validRepeat = repeatDays === 0 || (snapshot?.recurrence && Number.isInteger(repeatCount) && repeatCount >= 2 && repeatCount <= 12);
  const schedulePreview = scheduleDate?.toLocaleString(undefined, { dateStyle: "long", timeStyle: "long" });
  const rescheduleDate = localScheduleTime(rescheduleTime);

  function updatePrompt(value) {
    let error = "";
    try { savePromptDraft(window.localStorage, value, prompt, draftKey); }
    catch { error = "This draft could not be saved in this browser. Keep a copy before refreshing."; }
    setDrafts((previous) => ({ ...previous, [draftKey]: { prompt: value, error } }));
  }

  async function attachFile(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      updatePrompt(await importPromptFile(file, prompt));
      setAttachment({ message: `Added ${file.name} to the prompt.` });
    } catch (failure) {
      setAttachment({ error: failure.message });
    } finally {
      setImporting(false);
    }
  }

  function clearSubmittedDraft() {
    updatePrompt("");
    setAttachment({});
  }

  async function savePermission(value) {
    setPermissionError("");
    try {
      if (ownerPreferences === false) {
        window.localStorage.setItem(directPermissionKey, value);
        setDirectPermission(value);
      } else if (ownerPreferences) {
        setPreferencePending(true);
        setOwnerPreferences(await api("/owner-preferences", { method: "PATCH", body: {
          revision: ownerPreferences?.revision, directDevelopmentProfile: value,
        } }));
      }
      setProfileChoice(null);
    } catch (failure) {
      setPermissionError(failure.message || "Could not save the permission preference.");
      if (failure.status === 409) setPreferencesVersion(version => version + 1);
    } finally {
      setPreferencePending(false);
    }
  }

  async function action(callback) {
    setBusy(true);
    setError("");
    try { await callback(); } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  function submit(parent, queue = false, scheduledAt) {
    if ((scheduledAt !== undefined && !scheduling) || editingLocked || mediaUploading || !validPrompt || (parent && assignment) || (!parent && !validAssignment) ||
        (scheduledAt !== undefined && (!validRepeat || mediaAttachments.length)) || prompt.length > (parent ? continuationLimit : startLimit) ||
        (!parent && !recipientId && profile !== selectedProfile)) return;
    return action(async () => {
      const request = {
        prompt, model: "gpt-6.2-sol", effort: parent?.effort || selectedEffort, queue,
        profile: parent ? parent.profile || "read-only" : selectedProfile,
        workspace: ordinaryConversation && !outputMedia ? undefined : parent?.workspace || recipient?.workspace || startingWorkspace,
        hostId: parent?.hostId || host?._id, parentId: parent?._id, scheduledAt,
        ...(mediaAttachments.length ? { attachmentIds: mediaAttachments.map((item) => item._id) } : {}),
        ...(recipientId ? { recipientId } : {}),
        ...(!parent && assignment ? { objectiveId: assignment.id, employeeId } : {}),
        ...(!parent && assignment && includeProjectReferences ? { includeProjectReferences: true } : {}),
        ...(!parent && scheduledAt === undefined && canReturnMedia && outputMedia ? { outputMedia: true } : {}),
        ...(scheduledAt === undefined && !recipientId && !assignment && (!parent || parent.studioTools === true) ? { studioTools: true } : {}),
        ...(scheduledAt !== undefined && snapshot.recurrence && repeatDays ? { repeat: { days: repeatDays, count: repeatCount } } : {}),
      };
      const signature = JSON.stringify(request);
      if (pendingSubmit.current?.signature !== signature) {
        pendingSubmit.current = { signature, id: crypto.randomUUID() };
      }
      const endpoint = request.repeat ? "/recurrence" : scheduledAt === undefined ? "/jobs" : "/schedule";
      const { _id, recurring } = await post(endpoint, { id: pendingSubmit.current.id, ...request });
      pendingSubmit.current = null;
      setOutputScope(null);
      if (recurring) setNotice("Repeating schedule saved. Find it under Upcoming work.");
      else {
        if (scheduledAt === undefined) {
          const sessionId = parent?.sessionId || _id;
          if (conversationId === sessionId) setRefreshVersion(value => value + 1);
          else openConversation({ _id, sessionId });
        } else selectJob(_id);
        if (queue) setNotice("Follow-up queued in this conversation.");
      }
      if (!parent && assignment) setAssignment(null);
      clearSubmittedDraft();
      if (mediaKey) setMediaDrafts((current) => ({ ...current, [mediaKey]: [] }));
      if (scheduledAt !== undefined) {
        setScheduledTime("");
        setRepeatDays(0);
      }
      if (scheduledAt !== undefined) setRefreshVersion((value) => value + 1);
      if (mode === "Execution") changeMode("Conversation");
    });
  }

  function steer() {
    if (assignment || editingLocked || mediaUploading || mediaAttachments.length || !validPrompt || prompt.length > continuationLimit) return;
    return action(async () => {
      const turnId = selectedJob.activeTurn.turnId;
      const signature = JSON.stringify([jobId, turnId, prompt]);
      if (pendingSteer.current?.signature !== signature) pendingSteer.current = { signature, id: crypto.randomUUID() };
      await post(`/jobs/${jobId}/steer`, { id: pendingSteer.current.id, turnId, input: prompt });
      pendingSteer.current = null;
      clearSubmittedDraft();
    });
  }

  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Copied to clipboard.");
    } catch { setNotice("Clipboard unavailable. Select and copy the text manually."); }
  }

  if (accessDenied) return <main className="operations"><h1>Crossworld Operations</h1><p>Private Operations access unavailable.</p></main>;
  if (!snapshot) return <main className="operations"><h1>Crossworld Operations</h1><p role="status">{relayError || "Checking Operations access…"}</p></main>;

  const commonDisabled = !workerEnabled || editingLocked || mediaUploading || !validPrompt || !!relayError;
  const canStart = !hasConversation && !commonDisabled && hostOnline && selectedEffort && validAssignment && prompt.length <= startLimit &&
    (recipientId ? recipient && host?.employeeConversations && host.profiles?.includes("read-only") :
      selectedProfile === profile);
  const canContinue = !selectedJob?.missionId && !selectedJob?.blueprintTyped && !commonDisabled && canAct && selectedJob?.codexThreadId &&
    !running.includes(selectedJob.status) && prompt.length <= continuationLimit;
  const canQueue = !selectedJob?.missionId && !selectedJob?.blueprintTyped && !commonDisabled && ["queued", "running"].includes(selectedJob?.status) && prompt.length <= continuationLimit;
  const canSteer = !selectedJob?.blueprintTyped && !editingLocked && canAct && selectedJob?.activeTurn && selectedJob.status === "running" &&
    !["pending", "sending"].includes(selectedJob.instruction?.state) && !mediaUploading && !mediaAttachments.length &&
    validPrompt && prompt.length <= continuationLimit;
  const send = !jobId ? { label: assignment ? "Start assignment" : recipient ? "Message " + recipient.name : "Send message", enabled: canStart, run: () => submit(null) }
    : canQueue || ["queued", "running"].includes(selectedJob?.status)
      ? { label: "Queue follow-up", enabled: canQueue, run: () => submit(selectedJob, true) }
      : { label: "Send follow-up", enabled: canContinue, run: () => submit(selectedJob) };

  const compactComposer = compact && !!jobId && mode === "Conversation";
  const editorToggle = <button type="button" aria-expanded={expanded} aria-controls="operations-prompt"
    onClick={() => setExpanded(!expanded)}>{expanded ? "Collapse editor" : "Expand editor"}</button>;
  const attachmentControls = <details className="operations__prompt-file">
    <summary>Attachments{mediaAttachments.length ? ` (${mediaAttachments.length})` : ""}</summary>
    <div className="operations__attachment-options">
      {mediaKey && <MediaComposer key={mediaKey} hostId={mediaHostId} api={api} attachments={mediaAttachments} disabled={editingLocked}
        onChange={(items) => setMediaDrafts((current) => ({ ...current, [mediaKey]: items }))}
        onBusy={(next) => setUploadingDraft((current) => next ? mediaKey : current === mediaKey ? null : current)} />}
      <label>Import Markdown or text into the prompt
        <input type="file" accept=".md,.markdown,.txt" disabled={editingLocked || draftKey === null} onChange={attachFile} />
      </label>
      <p>UTF-8 files up to {ATTACHMENT_BYTES.toLocaleString()} bytes are added to the prompt.</p>
    </div>
  </details>;

  const composer = (
  <form id="operations-composer" data-compact={compactComposer} onSubmit={(event) => {
    event.preventDefault();
    if (!scheduling && send.enabled) send.run();
  }}>
    <div className="operations__composer-body">
    {assignment && <section className="operations__panel operations__assignment" aria-label="Implementation assignment">
      <div className="operations__briefing-title">
        <strong>{assignment.title}</strong>
        <button type="button" onClick={() => setAssignment(null)}>Remove objective</button>
      </div>
      <label>Assign to <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
        <option value="">{workerOptions.length ? "Select an employee" : "No available worker in this workspace"}</option>
        {workerOptions.map((employee) => <option key={employee._id} value={employee._id}>{employee.name}</option>)}
      </select></label>
      <label className="operations__check">
        <input type="checkbox" checked={includeProjectReferences}
          disabled={editingLocked || (!host?.media && !includeProjectReferences)}
          onChange={(event) => setIncludeProjectReferences(event.target.checked)} />
        Include approved project images
      </label>
      {!host?.media && <p>Choose a host with media enabled to include project images.</p>}
      <p>The worker receives the task prompt with the objective criteria and saved project and employee instructions.</p>
    </section>}
    <div className="operations__editor">
      <div className="operations__composer-heading">
        <label htmlFor="operations-prompt">Message</label>
        {!compactComposer && editorToggle}
      </div>
      <textarea id="operations-prompt" ref={promptInput} required readOnly={editingLocked || draftKey === null}
        rows={expanded ? 12 : compactComposer ? 1 : 2}
        value={prompt} spellCheck={false} autoCapitalize="off"
        placeholder={canSteer ? "Steer this execution or queue a follow-up" : jobId ? "Write a follow-up" : "Message the studio"}
        aria-invalid={!!promptError} aria-describedby="operations-prompt-count"
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (!scheduling && send.enabled) send.run();
          }
        }}
        onChange={(event) => updatePrompt(event.target.value)} />
      <div className="operations__editor-tools">
        <span id="operations-prompt-count">{prompt ? `${prompt.length.toLocaleString()} characters · ${draft.error ? "Draft unsaved" : "Draft saved"}` : "Ctrl / ⌘ + Enter to send"}</span>
      </div>
      {validPrompt && prompt.length > (jobId ? continuationLimit : startLimit) && <p role="alert">
        This relay accepts up to {(jobId ? continuationLimit : startLimit).toLocaleString()} characters per message.
      </p>}
      {promptError && <p role="alert">{promptError}</p>}
      {!recipientId && (selectedJob?.profile || selectedProfile) === "read-only" &&
        /^(?:please\s+)?(?:implement|fix|refactor|deploy|modify|edit)\b/i.test(prompt.trimStart()) &&
        <p role="status">Read Only is selected. File changes and deployment require a separately authorized execution with the appropriate permissions.</p>}
      {attachment.error && <p role="alert">{attachment.error}</p>}
      {attachment.message && <p role="status">{attachment.message}</p>}
      {draft.error && <p role="alert">{draft.error}</p>}
    </div>
    {!jobId && !assignment && <label>Recipient
      <select value={recipientId} disabled={editingLocked} onChange={event => messageEmployee(recipients.find(employee => employee._id === event.target.value))}>
        <option value="">{recipients.find(employee => employee.role === "first-mate")?.name || "First Mate"}</option>
        {recipientId && !recipient && <option value={recipientId}>Selected employee</option>}
        {recipients.filter(employee => employee.role !== "first-mate").map(employee =>
          <option key={employee._id} value={employee._id}>{employee.name}</option>)}
      </select>
    </label>}
    {recipientId && host && !host.employeeConversations && <p role="status">Choose a relay that supports employee conversations.</p>}
    {!jobId && <details className="operations__composer-options">
    <summary>Execution settings <span>GPT-6.2 Sol / {loadingEffort ? "Loading studio default…" : selectedEffort || "Effort unavailable"}</span></summary>
    <div className="operations__selectors">
      <label>Host<select value={host?._id || ""} onChange={(event) => { setOutputScope(null); setHostId(event.target.value); }}>
        <option value="" disabled>Select host</option>
        {executionHosts.map((entry) => <option key={entry._id} value={entry._id}>{entry.label}</option>)}
      </select></label>
      {!recipientId && <>{!ordinaryConversation && <label>Starting workspace<select value={workspace} onChange={(event) => { setOutputScope(null); setWorkspace(event.target.value); }}>
        {Object.entries(workspaceNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>}
      <label>Permissions<select value={profile} onChange={(event) => {
        setOutputScope(null);
        setProfileChoice({ context: permissionContext, value: event.target.value });
      }}>
        <option value="read-only">{profileNames["read-only"]}</option>
        {selectableEditing.filter(value => host?.profiles?.includes(value)).map(value =>
          <option value={value} key={value}>{profileNames[value]}</option>)}
        {profile !== "read-only" && selectedProfile !== profile && <option value={profile} disabled>{profileNames[profile]} unavailable</option>}
      </select></label>
      </>}
      <label>Model<select defaultValue="gpt-6.2-sol"><option value="gpt-6.2-sol">GPT-6.2 Sol</option></select></label>
      <label>Reasoning effort<select value={selectedEffort} onChange={(event) => setEffort(event.target.value)}>
        {!selectedEffort && <option value="" disabled>{loadingEffort ? "Loading studio default…" :
          host?.efforts?.length ? "Select a supported effort" : "Awaiting host"}</option>}
        {host?.efforts?.map((entry) => <option key={entry}>{entry}</option>)}
      </select></label>
    </div>
    {canReturnMedia && <label className="operations__check">
      <input type="checkbox" checked={outputMedia} onChange={(event) => setOutputScope(event.target.checked ? outputScopeKey : null)} />
      Allow this turn to return new images or videos
    </label>}
    {selectedProfile === "full-access" && <p className="operations__access-warning">
      <strong>Full Access.</strong> Commands run with the Windows account’s access to files, applications, and the network.
      Codex approval prompts are disabled.
    </p>}
    </details>}
    {!jobId && <p role="status" className={profile === "full-access" ? "operations__access-warning" : undefined}>
      <strong>Effective permissions</strong>{" "}
      {profile !== "read-only" && selectedProfile !== profile
        ? "The selected relay has not verified this profile."
        : profileNames[selectedProfile]}
    </p>}
    {!compactComposer && attachmentControls}
    {snapshot?.schedule && !assignment && !jobId && !recipientId && !scheduling && <button type="button"
      onClick={() => selectJob(null, null, "schedule")}>Schedule a new session</button>}
    {scheduling && snapshot?.schedule && !assignment && !jobId && !recipientId && <details className="operations__schedule" open>
      <summary ref={scheduleSummary}>Schedule a new session</summary>
      <label>Run at (local time)<input type="datetime-local" value={scheduledTime}
        onChange={(event) => setScheduledTime(event.target.value)} /></label>
      {snapshot.recurrence && <>
        <label>Repeat <select value={repeatDays} onChange={(event) => setRepeatDays(Number(event.target.value))}>
          <option value={0}>Once</option><option value={1}>Every 24 hours</option><option value={7}>Every 7 days</option>
        </select></label>
        {repeatDays > 0 && <>
          <label>Total runs <input type="number" min={2} max={12} value={repeatCount}
            onChange={(event) => setRepeatCount(Number(event.target.value))} /></label>
          <p>If the host misses multiple intervals, the series runs once when available. A failed or cancelled turn ends the series.</p>
        </>}
      </>}
      {schedulePreview && <p>Dispatch time <strong>{schedulePreview}</strong></p>}
      {scheduledTime && !scheduleDate && <p role="alert">Choose a valid time in your current time zone.</p>}
      <p>Overdue sessions wait for the selected host to reconnect and become available.</p>
      {mediaAttachments.length > 0 && <p>Remove images before scheduling. Send them in a conversation or queued follow-up.</p>}
      <button type="button" disabled={!workerEnabled || editingLocked || mediaUploading || !!mediaAttachments.length || !!relayError || !host || !selectedEffort ||
        !validPrompt || prompt.length > startLimit || !scheduleDate || !validRepeat || (profile === "full-access" && selectedProfile !== profile)}
        onClick={() => submit(null, false, +scheduleDate)}>{repeatDays > 0 ? "Schedule series" : "Schedule session"}</button>
    </details>}
    </div>
    <div className="operations__prompt-actions">
      {compactComposer && <>{attachmentControls}{editorToggle}</>}
      {selectedJob?.profile === "full-access" && <small className="operations__composer-permission">Full Access follow-up</small>}
      {selectedJob?.status === "running" && <button type="button" disabled={!canSteer}
        onClick={steer} aria-label={compactComposer ? "Steer current task" : undefined}>
        {compactComposer ? "Steer" : "Steer current task"}
      </button>}
      {scheduling ? <button type="button" onClick={() => selectJob(null)}>Return to conversation</button>
        : <button className="operations__send" disabled={!send.enabled}>{send.label}</button>}
    </div>
  </form>
  );

  const historyList = <>
          <h2 id="operations-history-title">Conversations</h2>
          <label>Search sessions<input type="search" maxLength={120} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label className="operations__check"><input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} /> Archived sessions</label>
          {sessions.size === 0 && <p>{snapshot.historyKey === historyKey ? "No matching conversations." : "Searching conversations…"}</p>}
          {Array.from(dateGroups, ([group, conversations]) => <section key={group}>
          <h3>{group}</h3><ul>{conversations.map(([id, turns]) => {
            const latest = turns[0];
            const preview = (turns.find((entry) => !entry.parentId)?.prompt || latest.prompt || "").trim().replace(/\s+/g, " ");
            const label = latest.title || (preview.length > 64 ? preview.slice(0, 63).trimEnd() + "…" : preview);
            const active = conversationId === id || turns.some(entry => entry._id === jobId) || selectedJob?.sessionId === id;
            const employee = latest.conversationActor?.name || latest.assigneeName || latest.studioActor?.name;
            return <li key={id}>
              <button type="button" aria-pressed={active} onClick={() => openConversation(latest)}>
                {label || "Conversation"}
                <small>{employee ? employee + " \u00b7 " : ""}{latest.status}
                  {latest.createdAt && <>{" \u00b7 "}<time dateTime={latest.createdAt}>{new Date(latest.createdAt).toLocaleDateString()}</time></>}
                </small>
              </button>
            </li>;
          })}</ul></section>)}
          {older?.error && <p role="alert">{older.error}</p>}
          {!older?.end && activeHistory.length === 50 && <button type="button" disabled={older?.loading}
            onClick={loadOlder}>{older?.loading ? "Loading history…" : "Load older conversations"}</button>}
  </>;
  const devices = <>
          <details>
            <summary>Manage devices</summary>
            <p>Register your Windows PC, then open <strong>Start Crossworld Operations.cmd</strong> on that PC.</p>
            <form onSubmit={(event) => {
              event.preventDefault();
              const missionOnly = new FormData(event.currentTarget).has("missionOnly");
              action(async () => {
                const result = await post(missionOnly ? "/hosts/mission-pilot" : "/hosts", { label: deviceName, missionOnly });
                setCredential(result.token);
                setDeviceName("");
              });
            }}>
              <label>Device name<input required maxLength={80} value={deviceName} onChange={(event) => setDeviceName(event.target.value)} /></label>
              <label><input type="checkbox" name="missionOnly" /> Capability-authorized missions only</label>
              <button disabled={busy}>Register device</button>
            </form>
            {credential && <div>
              <p>Save this credential on the Windows host. It is displayed once.</p>
              <code className="operations__credential">{credential}</code>
              <button type="button" onClick={() => copy(credential)}>Copy credential</button>{" "}
              <button type="button" onClick={() => setCredential("")}>Hide</button>
            </div>}
            <ul>{snapshot.hosts.filter((entry) => !entry.revokedAt).map((entry) => <li key={entry._id}>
              {entry.label} · {entry.online ? "Online" : "Offline"}{" "}
              <button type="button" disabled={busy} onClick={() => {
                if (window.confirm(`Revoke ${entry.label} and interrupt its jobs?`)) {
                  action(() => api(`/hosts/${entry._id}`, { method: "DELETE" }));
                }
              }}>Revoke</button>
            </li>)}</ul>
          </details>
  </>;
  const pendingApprovalCount = governance?.requests.filter((request) => request.state === "pending").length || 0;
  const knownCapacity = !relayError && snapshot.hosts.length > 0 &&
    snapshot.hosts.every(entry => Number.isInteger(entry.activeSlots) && Number.isInteger(entry.relaySlots));
  const occupancy = knownCapacity ? snapshot.hosts.reduce((total, entry) => ({
    active: total.active + entry.activeSlots,
    open: total.open + Math.max(0, entry.relaySlots - entry.activeSlots),
  }), { active: 0, open: 0 }) : null;

  return <OperationsShell page={page} navigate={setPage} keyboardOpen={keyboardOpen} conversationExpanded={conversationExpanded && !!selectedJob && page === "Command Center"} paused={snapshot.dispatch?.paused} health={{
    online: !!hostOnline,
    label: relayError ? "API unavailable" : hostOnline ? "Relay online" : "Relay offline",
  }} occupancy={occupancy} pendingApprovals={pendingApprovalCount} openApprovals={() => setPage("Approvals")}
    request={api} openExecution={(id) => openJob(id, "Execution")}
    subscription={<SubscriptionLink observation={snapshot.hosts.find(entry => entry.online && entry.usage)?.usage ||
    snapshot.hosts.find(entry => !entry.revokedAt && entry.usage)?.usage} />}>
      <Suspense fallback={<p role="status">Loading workspace…</p>}>
      {page === "Headquarters" && <Headquarters api={api} openObjectives={() => setPage("Objectives")} openWorkforce={() => setPage("Workforce")}
        openOffice={() => setPage("Office")} openProject={(id) => openSource("project", id)} openFinance={() => setPage("Finance")}
        pendingGovernance={governance?.requests.filter((request) => request.state === "pending").length}
        openGovernance={() => setPage("Approvals")} openJob={openJob}
        openCommand={() => setPage("Command Center")} openMission={id => setPage("Command Center", "mission", id)}
        openSchedules={() => setPage("Schedules")} />}
      {page === "Blueprints" && <Blueprints api={api} openJob={openJob} standalone />}
      {page === "Workflow" && <Workflow key={linkedRecord?.id || "studio"} api={api} scope={linkedRecord?.group} recordId={linkedRecord?.id}
        openRecord={openSource} openJob={openJob} />}
      {page === "Projects" && <Projects api={api} openRecord={openSource} openJob={openJob} initialId={linkedRecord?.group === "project" ? linkedRecord.id : null}
        openObjectives={(id) => openSource("project-objectives", id)} openWorkflow={(id) => openSource("workflow-project", id)} />}
      {page === "Objectives" && <Objectives api={api} openJob={openJob} assignObjective={prepareAssignment}
        openProject={(id) => openSource("project", id)}
        initialId={linkedRecord?.group === "objective" ? linkedRecord.id : null}
        initialProjectId={linkedRecord?.group === "project-objectives" ? linkedRecord.id : null} />}
      {page === "Reports" && <Reports key={linkedRecord?.id || "list"} api={api} reportId={linkedRecord?.id} openRecord={openSource} openJob={openJob} copy={copy} openWorkflow={(id) => openSource("workflow-job", id)} />}
      {page === "Workforce" && <Workforce api={api} openJob={openJob} openRecord={openSource} openWorkflow={(id) => openSource("workflow-employee", id)} messageEmployee={messageEmployee} initialId={linkedRecord?.target === page ? linkedRecord.id : null} />}
      {page === "Office" && <VirtualOffice api={api} openJob={openJob}
        openEmployee={(id) => openSource("employee", id)} openWorkflow={() => setPage("Workflow")}
        openWorkforce={() => setPage("Workforce")} openEmployeeWorkflow={(id) => openSource("workflow-employee", id)}
        messageEmployee={messageEmployee} canMessage={employee => !!hostOnline && (employee.role === "first-mate" ||
          !!(host.employeeConversations && host.profiles?.includes("read-only")))}
        openHeadquarters={() => setPage("Headquarters")} />}
      {page === "Artifacts" && <ArtifactGallery api={api} artifactId={params.get("artifact")} openArtifact={id => {
        const next = new URLSearchParams(params);
        if (id) next.set("artifact", id);
        else next.delete("artifact");
        setParams(next);
      }} />}
      {page === "Quality" && <Quality />}
      {page === "Communications" && <Communications api={api} />}
      {page === "Activity" && <Activity api={api} openSource={openSource} />}
      {page === "Knowledge" && <Knowledge key={linkedRecord?.id ?? "library"} api={api}
        initialId={linkedRecord?.id === "workshop-registry" ? null : linkedRecord?.id}
        initialWorkshop={linkedRecord?.id === "workshop-registry"} openWorkshop={() => openSource("knowledge", "workshop-registry")} />}
      {page === "Art Department" && <ArtDepartment api={api} openSource={openSource} />}
      {page === "Finance" && <Finance request={api} view={financeView} onView={view => setPage("Finance", "finance", view)}
        hosts={snapshot.hosts.filter(entry => !entry.revokedAt)} />}
      {page === "Engineering" && <Engineering request={api} />}
      {page === "Schedules" && <section className="operations__panel operations__schedules" aria-label="Schedules">
        <div className="operations__modes">
          <h2>Upcoming work</h2>
          {snapshot.schedule && <button type="button" onClick={() => {
            setAssignment(null);
            selectJob(null, null, "schedule");
          }}>Schedule a session</button>}
        </div>
        {error && <p role="alert">{error}</p>}
        {!snapshot.schedule && <p role="status">Schedules are unavailable.</p>}
        {snapshot.schedule?.length === 0 && <p>No one-time sessions scheduled.</p>}
        {!!snapshot.schedule?.length && <ul className="operations__schedule-list" aria-label="One-time sessions">
          {snapshot.schedule.map((entry) => <li key={entry._id}>
            <div><strong>{workspaceNames[entry.workspace] || entry.workspace}</strong>
              <small><time dateTime={entry.scheduledAt}>{new Date(entry.scheduledAt).toLocaleString()}</time></small>
            </div>
            <button type="button" onClick={() => openJob(entry._id, "Conversation")}>Open session</button>
          </li>)}
        </ul>}
        {!!snapshot.recurrence?.length && <section aria-label="Repeating schedules">
          <h3>Repeating schedules</h3>
          {snapshot.recurrence.some(entry => entry.state === "active") &&
            <p>Stopping a series holds future occurrences. A turn the host already claimed can finish.</p>}
          <ul className="operations__schedule-list">
            {snapshot.recurrence.map((entry) => <li key={entry._id}>
              <div><strong>{workspaceNames[entry.workspace] || entry.workspace}</strong>
                <small>Every {entry.repeatDays === 1 ? "24 hours" : "7 days"} · {entry.state} · {entry.remaining} of {entry.total} runs left</small>
                {entry.state === "active" && <small>Next <time dateTime={entry.nextAt}>{new Date(entry.nextAt).toLocaleString()}</time></small>}
                {entry.stopReason && <small>{entry.stopReason}</small>}
              </div>
              <div className="operations__schedule-actions">
                {entry.occurrenceStatus && <button type="button" onClick={() => openJob(entry.occurrenceId, "Conversation")}>Open {entry.occurrenceStatus} turn</button>}
                {entry.state === "active" && <button type="button" disabled={busy} onClick={() => action(async () => {
                  await api("/recurrence/" + entry._id, { method: "DELETE" });
                  setRefreshVersion((value) => value + 1);
                })}>Stop series</button>}
              </div>
            </li>)}
          </ul>
        </section>}
      </section>}
      {page === "References" && <>
        {error && <p role="alert">{error}</p>}
        <ReferenceLibrary request={api} onUse={useReference} />
        <section className="operations__panel operations__raw-media">
          <h2>Media uploads</h2>
          <MediaLibrary api={api} />
        </section>
      </>}
      {page === "Settings" && <section className="operations__panel">
        <h2>Relay and execution</h2>
        <label>{ownerPreferences === false ? "Default permissions for direct development on this browser"
          : "Account default permissions for direct development"}
          <select value={savedDirectProfile} disabled={ownerPreferences === null || preferencePending}
            onChange={event => savePermission(event.target.value)}>
            <option value="read-only">Read-only inspection</option>
            <option value="full-access">Full Access</option>
            <option value="scoped">Scoped editing across drives</option>
          </select>
        </label>
        {permissionError && <p role="alert">{permissionError}</p>}
        <p>{relayError || (hostOnline ? host.label + " is connected." : "No Windows execution host is connected.")}</p>
        {snapshot.dispatch && <p><button type="button" disabled={busy || !!relayError} onClick={() => action(async () => {
          await api("/dispatch", { method: "PATCH", body: { paused: !snapshot.dispatch.paused } });
          setRefreshVersion((value) => value + 1);
        })}>{snapshot.dispatch.paused ? "Resume future dispatch" : "Pause future dispatch"}</button></p>}
        <p>Pausing holds new and scheduled work. Claimed jobs can finish.</p>
        {governance && <button type="button" onClick={() => setShowApprovalInbox(true)}>Operation policies</button>}
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {devices}
        <OrganizationSetup api={api} />
      </section>}
      {page === "Infrastructure" && <Infrastructure request={api} />}
      {page === "Approvals" && <section className="operations__panel operations__approval-inbox" aria-label="Approvals">
        <h2>Approvals</h2>
        <ExecutionApprovals api={api} openJob={(id) => openJob(id, "Execution")} />
        <h3>Brokered operations</h3>
        {governance ? <>
        {governance.requests.length === 0 && <p>No operation requests.</p>}
        {governance.requests.map((request) => <details key={request._id} open={request.state === "pending" || undefined}>
          <summary>{request.intent.tool || request.intent.operation} · {request.intent.repository || request.intent.workspace} · {request.state}</summary>
          <dl>
            <dt>Worker and session</dt><dd>{request.worker.label} · {request.sessionId}</dd>
            {request.intent.operation === "mcpTool" ? <>
              <dt>Workspace and role</dt><dd>{workspaceNames[request.intent.workspace]} · {request.intent.role}</dd>
              <dt>Tool arguments</dt><dd><pre>{JSON.stringify(request.intent.arguments, null, 2)}</pre></dd>
            </> : <>
            <dt>Branch and target</dt><dd>{request.intent.branch} {request.intent.target && `· ${request.intent.target}`}</dd>
            <dt>Reviewed commits</dt><dd><code>{request.intent.headSha}</code>{request.intent.baseSha && <> · <code>{request.intent.baseSha}</code></>}</dd>
            <dt>Submitted changes</dt><dd><pre>{request.intent.changes}</pre></dd>
            {request.intent.diff && <><dt>Submitted diff</dt><dd><pre>{request.intent.diff}</pre></dd></>}
            <dt>Submitted test results</dt><dd><pre>{request.intent.tests}</pre></dd>
            </>}
            <dt>Consequences</dt><dd>{request.consequences}</dd>
            <dt>Expires</dt><dd>{new Date(request.expiresAt).toLocaleString()}</dd>
          </dl>
          {request.state === "pending" && ["approve", "deny"].map((choice) => <button key={choice} type="button"
            disabled={busy || (choice === "approve" && !(request.intent.operation === "mcpTool" ? governance.toolsEnabled : governance.githubEnabled))} onClick={() => action(() =>
              post(`/jobs/${request.jobId}/approval`, { id: request._id, choice, fingerprint: request.fingerprint }))}>
            {choice === "approve" ? "Approve once" : "Deny"}
          </button>)}
        </details>)}
        </> : <p>Operation requests are unavailable.</p>}
        {error && <p role="alert">{error}</p>}
      </section>}
      {page === "Help" && <OperationsHelp navigate={setPage} />}
      </Suspense>
      {showApprovalInbox && <dialog className="operations__dialog" aria-labelledby="operations-approval-title"
        ref={(node) => { if (node && !node.open) node.showModal(); }}
        onClose={() => setShowApprovalInbox(false)}>
        <form method="dialog"><button>Close policies</button></form>
      {governance && <section className="operations__approval-inbox">
        <h2 id="operations-approval-title">Operation policies</h2>
        {!governance.githubEnabled && <p>Use an editing session for instructed Git operations. Review any command approval in that session.</p>}
        {!governance.toolsEnabled && <p>Editing sessions can use installed app commands and the worker’s selected MCP inspection tools.</p>}
        <details>
          <summary>Operation policies</summary>
          {Object.entries(governance.policy.modes).map(([operation, mode]) => <label key={operation}>
            {operation}
            <select value={mode} disabled={busy} onChange={(event) => {
              const next = event.target.value;
              action(() => api("/approvals/policy", {
                method: "PATCH",
                body: { revision: governance.policy.revision, modes: { ...governance.policy.modes, [operation]: next } },
              }));
            }}>
              {localPolicyOperations.includes(operation) && <option value="allow">Allow</option>}
              <option value="ask">Ask for approval</option>
              <option value="block">Block</option>
            </select>
          </label>)}
          <p>Always blocked · {governance.policy.immutableBlocks.join(", ")}</p>
        </details>
        <details>
          <summary>Brokered tool policies</summary>
          <label>Worker role<input value={policyRole} maxLength={32} onChange={(event) => setPolicyRole(event.target.value)} /></label>
          {Object.entries(governance.policy.catalog || {}).flatMap(([tool, definition]) => definition.workspaces.map((scope) => {
            const key = `${policyRole}:${scope}:${tool}`;
            return <label key={key}>{tool} · {workspaceNames[scope]}
              <select value={governance.policy.toolModes[key] || "block"}
                disabled={busy || !/^[a-z][a-z0-9-]{0,31}$/.test(policyRole)}
                onChange={(event) => action(() => api("/approvals/policy", {
                  method: "PATCH", body: { revision: governance.policy.revision, modes: governance.policy.modes,
                    toolModes: { ...governance.policy.toolModes, [key]: event.target.value } },
                }))}>
                <option value="allow">Allow</option><option value="ask">Ask for approval</option><option value="block">Block</option>
              </select>
            </label>;
          }))}
        </details>
      </section>}
        {error && <p role="alert">{error}</p>}
      </dialog>}
      {page === "Command Center" && <>
      <div className="operations__commandbar">
        <Missions api={api} hosts={snapshot.hosts.filter(entry => !entry.revokedAt && !entry.isolatedReviewSnapshot)} openJob={openJob}
          missionId={recordGroup === "mission" ? params.get("record") : null}
          clearMission={() => setPage("Command Center", null, null, { replace: true })} />
        <button className="operations__history-button" type="button" onClick={() => {
          historyDrawer.current?.showModal();
          setHistoryOpen(true);
        }}>History</button>
        <button type="button" className="operations__first-mate-button" onClick={openFirstMate}
          aria-current={pinnedFirstMate && session === pinnedFirstMate ? "location" : undefined}>
          First Mate
        </button>
        <button type="button" aria-label="New conversation" onClick={() => { setAssignment(null); selectJob(null); }}>
          New<span className="operations__desktop-label"> conversation</span>
        </button>
        {pendingApprovalCount > 0 && <button type="button" onClick={() => setPage("Approvals")}>
          Approvals (${pendingApprovalCount})
        </button>}
        <button type="button" onClick={() => setPage("Headquarters")}>Briefing</button>
      </div>
      <dialog ref={historyDrawer} className="operations__dialog operations__drawer" aria-labelledby="operations-history-title"
        onClose={() => setHistoryOpen(false)}>
        <form method="dialog"><button>Close history</button></form>
        {historyOpen && historyList}
        <button type="button" onClick={() => { historyDrawer.current?.close(); setPage("Schedules"); }}>Open schedules</button>
      </dialog>
      {error && <p className="operations__message-error" role="alert">{error}</p>}
      {notice && <p className="operations__message-notice" role="status">{notice}</p>}
      <div className="operations__layout operations__command-layout">
        <aside className="operations__panel operations__history" aria-label="Conversation history">{!historyOpen && historyList}
          <button type="button" onClick={() => setPage("Schedules")}>Open schedules</button>
        </aside>
        <div className="operations__channel">
          {!hasConversation && <div className="operations__welcome">
            <h1>Command Center</h1>
            <p>Send a message to start a conversation, or open one from history.</p>
          </div>}
          {resolvedConversation?.error && <p className="operations__message-error" role="status">{resolvedConversation.error}</p>}
          {conversationId && !jobId && !resolvedConversation?.error &&
            <p className="operations__loading" role="status">Finding the current conversation turn…</p>}
          {conversationId && conversationId === pinnedFirstMate && !jobId && resolvedConversation?.error &&
            <button type="button" onClick={() => updateFirstMatePin("")}>Unpin First Mate conversation</button>}
          {transcriptError?.jobId === jobId && <p role="status">Conversation sync · {transcriptError.message}</p>}
          {jobId && !selectedJob && !error && transcriptError?.jobId !== jobId && <p className="operations__loading" role="status">Loading conversation…</p>}
          {selectedJob && <section className="operations__transcript" id="operations-conversation-panel">
            <header>
              <div className="operations__conversation-title">
                <h1>{selectedJob.title || "Conversation"}</h1>
                <strong className="operations__conversation-agent">{turnActor(selectedJob)}</strong>
                <div className="operations__conversation-status">
                <span role="status">
                  {selectedJob.status === "running" && selectedHost?.online && <span className="operations__processing" aria-hidden="true" />}
                  {executionStatus(selectedJob, selectedHost)}
                </span>
                <ExecutionElapsed startedAt={selectedJob.startedAt} finishedAt={selectedJob.finishedAt} active={selectedJob.status === "running"} />
                </div>
              </div>
              {running.includes(selectedJob.status) && <button className="operations__execution-cancel" type="button" disabled={busy || selectedJob.status === "cancelling"}
                onClick={() => action(async () => {
                  if (selectedJob.status === "scheduled") {
                    try { await api(`/schedule/${jobId}`, { method: "DELETE" }); }
                    finally { setRefreshVersion((value) => value + 1); }
                  } else {
                    await post(`/jobs/${jobId}/cancel`);
                  }
                })}>{selectedJob.status === "scheduled" ? "Cancel schedule" :
                  selectedJob.status === "waiting" ? "Cancel follow-up" : "Cancel current task"}</button>}
              <button type="button" className="operations__inspect-toggle"
                onClick={() => {
                  if (mode === "Execution") openConversation(selectedJob);
                  else if (conversationId) openJob(jobId, "Execution");
                  else { setInspection(jobId); changeMode("Execution"); }
                }}>
                {mode === "Execution" ? "Conversation" : awaitingApproval ? "Review approval" : "Inspect"}
              </button>
              {exactJobId && mode === "Conversation" && selectedJob.sessionId &&
                <Link className="operations__resume-link" to={conversationLink(selectedJob.sessionId)}>
                  Open current conversation
                </Link>}
              {permissionUnavailable && <div role="status">
                <p>{permissionUnavailable.text}</p>
                <p>Review any partial work, then explicitly select an eligible profile in a new conversation before sending the remaining work.</p>
                <button type="button" onClick={() => messageEmployee(null)}>Open a new conversation</button>
              </div>}
              {mode === "Conversation" && <button className="operations__conversation-layout-toggle" type="button"
                aria-expanded={conversationExpanded} aria-controls="operations-conversation-panel"
                onClick={() => setConversationLayout({ key: conversationKey, expanded: !conversationExpanded })}>
                {conversationExpanded ? "Exit expanded view" : "Expand conversation"}
              </button>}
              <details className="operations__conversation-actions">
                <summary>Actions</summary>
                <div>
              <button type="button" onClick={() => openSource("workflow-job", jobId)}>View execution workflow</button>
              {selectedJob.sessionId && <>
                <button type="button" onClick={() => copy(new URL(conversationLink(selectedJob.sessionId), window.location.origin).href)}>
                  Copy conversation link
                </button>
                {isFirstMateConversation(selectedJob) && <button type="button" onClick={() =>
                  updateFirstMatePin(pinnedFirstMate === selectedJob.sessionId ? "" : selectedJob.sessionId)}>
                  {pinnedFirstMate === selectedJob.sessionId ? "Unpin First Mate conversation" : "Pin as First Mate conversation"}
                </button>}
              </>}
              <button type="button" disabled={busy} onClick={() => {
                const title = window.prompt("Session name", selectedJob.title || "");
                if (title?.trim()) action(async () => {
                  await api(`/sessions/${selectedJob.sessionId}`, { method: "PATCH", body: { title } });
                  setJob((previous) => previous?._id === jobId ? { ...previous, title: title.trim() } : previous);
                setHistory(null);
                setRefreshVersion((value) => value + 1);
                });
              }}>Rename session</button>
              <button type="button" disabled={busy} onClick={() => action(async () => {
                const archivedAt = selectedJob.archivedAt ? null : new Date().toISOString();
                await api(`/sessions/${selectedJob.sessionId}`, { method: "PATCH", body: { archived: !!archivedAt } });
                setJob((previous) => previous?._id === jobId ? { ...previous, archivedAt } : previous);
                setHistory(null);
                setRefreshVersion((value) => value + 1);
              })}>{selectedJob.archivedAt ? "Restore from archive" : "Archive session"}</button>
                </div>
              </details>
            </header>
            <Suspense fallback={<p role="status">Loading transcript…</p>}>
            <JobTranscript api={api} key={jobId} job={selectedJob} host={selectedHost} jobId={jobId} mode={mode} copy={copy} selectJob={selectJob}
              promptPreview={sessions.get(selectedJob.sessionId)?.find((turn) => turn._id === jobId)?.prompt}
              proposal={selectedJob.studioTools && !selectedJob.missionId && <Suspense fallback={null}>
                <ObjectiveProposal key={jobId} request={api} jobId={jobId} jobStatus={selectedJob.status}
                  openObjective={(id) => openSource("objective", id)} />
              </Suspense>}>
            <details className="operations__execution-context"><summary>Related work and scheduling</summary>
            {selectedJob.status === "completed" && selectedJob.employeeId && selectedJob.objectiveId && !selectedJob.parentId &&
              <button type="button" onClick={() => openSource("report", selectedJob._id)}>View Final Report</button>}
            {selectedJob.delegatedReview && <p>
              <button type="button" className="operations__source" onClick={() => openJob(selectedJob.delegatedReview._id, "Conversation")}>
                {selectedJob.delegatedReview.title}
              </button>{" "}<span>{selectedJob.delegatedReview.assigneeName} {"\u00b7"} {executionStatus(selectedJob.delegatedReview)}</span>
              {selectedJob.delegatedReview.status === "completed" && <button type="button" className="operations__source"
                onClick={() => openSource("report", selectedJob.delegatedReview._id)}>View Final Report</button>}
            </p>}
            {selectedJob.delegatedBy && <p>
              <button type="button" className="operations__source" onClick={() => openJob(selectedJob.delegatedBy.sourceTurnId, "Conversation")}>
                Open First Mate handoff
              </button>
              {" "}<button type="button" className="operations__source" onClick={() => openSource("objective", selectedJob.objectiveId)}>
                Open review objective
              </button>
            </p>}
            {selectedJob.error && <p role="alert">{selectedJob.error}</p>}
            {selectedJob.profile === "full-access" && <p className="operations__access-warning">
              Full Access session · follow-ups inherit unrestricted access.
            </p>}
            {selectedJob.scheduledAt && <p>Scheduled for <time dateTime={selectedJob.scheduledAt}>
              {new Date(selectedJob.scheduledAt).toLocaleString()}</time></p>}
            {selectedJob.status === "scheduled" && !selectedJob.seriesId && <details>
              <summary>Reschedule</summary>
              <label>New run time (local)<input type="datetime-local" value={rescheduleTime}
                onChange={(event) => setRescheduleTime(event.target.value)} /></label>
              {rescheduleDate && <p>{rescheduleDate.toLocaleString(undefined, { dateStyle: "long", timeStyle: "long" })}</p>}
              <button type="button" disabled={busy || !!relayError || !rescheduleDate} onClick={() => action(async () => {
                await api(`/schedule/${jobId}`, { method: "PATCH", body: { scheduledAt: +rescheduleDate } });
                setRescheduleTime("");
                setRefreshVersion((value) => value + 1);
              })}>Save time</button>
            </details>}
            {selectedJob.instruction && <p role="status">Steering · {selectedJob.instruction.state}</p>}
            </details>
            {approval && <section aria-label="Approval request">
              <h3>Approval request · {approval.state}</h3>
              <dl>
                <dt>Requesting session</dt><dd>{selectedJob.title || selectedJob.sessionId}</dd>
                <dt>Operation</dt><dd><pre>{approval.operation}</pre></dd>
                <dt>Affected paths</dt><dd><pre>{approval.paths || "Codex did not provide paths."}</pre></dd>
                <dt>Reason</dt><dd>{approval.reason || "Codex did not provide a reason."}</dd>
              </dl>
              {awaitingApproval && !approval.canApprove && <p>This profile cannot grant the request. Dismiss it and review any partial work before retrying in a new conversation with an eligible profile.</p>}
              {awaitingApproval && (approval.canApprove ? ["approve", "deny"] : ["deny"]).map((choice) => <button key={choice} type="button"
                disabled={!canAct || selectedJob.decision?.id === approval.id}
                onClick={() => action(() => post(`/jobs/${jobId}/approval`, { id: approval.id, choice }))}>
                {choice === "approve" ? "Approve for this turn" : approval.canApprove ? "Deny" : "Dismiss request"}
              </button>)}
            </section>}
            </JobTranscript>
            </Suspense>
          </section>}
          {(!hasConversation || (jobId && mode !== "Execution")) && composer}
        </div>
      </div>
      </>}
    </OperationsShell>;
}
