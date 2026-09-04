"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setServiceRequestAssignmentAction, updateServiceRequestPriorityAction, updateServiceRequestStatusAction } from "@/lib/data/service-request-actions";
import { serviceRequestLabel, serviceRequestPriorities, serviceRequestStatuses } from "@/lib/service-request-format";

type Values = { status: string; priority: string; assignedUserId: string };

export function ServiceRequestEditControls({ requestId, initial, assignees, canAssign }: { requestId: string; initial: Values; assignees: { id: string; name: string }[]; canAssign: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, setPending] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = values.status !== saved.status || values.priority !== saved.priority || (canAssign && values.assignedUserId !== saved.assignedUserId);
  const update = (key: keyof Values, value: string) => { setValues((current) => ({ ...current, [key]: value })); setJustSaved(false); setError(null); };
  return <div className="service-request-edit-controls">
    <div className="service-request-edit-fields">
      <label><span>Status</span><select value={values.status} onChange={(event) => update("status", event.target.value)}>{values.status === "PENDING_STAFF" && <option value="PENDING_STAFF">Pending Staff (historical)</option>}{serviceRequestStatuses.map((status) => <option key={status} value={status}>{serviceRequestLabel(status)}</option>)}</select></label>
      <label><span>Priority</span><select value={values.priority} onChange={(event) => update("priority", event.target.value)}>{serviceRequestPriorities.map((priority) => <option key={priority} value={priority}>{serviceRequestLabel(priority)}</option>)}</select></label>
      {canAssign && <label><span>Assigned To</span><select value={values.assignedUserId} onChange={(event) => update("assignedUserId", event.target.value)}><option value="">Unassigned</option>{assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}</select></label>}
    </div>
    {error && <div className="form-alert" role="alert">{error}</div>}
    <button type="button" className={dirty ? "license-save-button" : "primary-button"} disabled={pending || !dirty} onClick={async () => {
      setPending(true); setError(null);
      try {
        if (values.status !== saved.status) { const result = await updateServiceRequestStatusAction({ requestId, status: values.status }); if (!result.ok) throw new Error(result.error); }
        if (values.priority !== saved.priority) { const result = await updateServiceRequestPriorityAction({ requestId, priority: values.priority }); if (!result.ok) throw new Error(result.error); }
        if (canAssign && values.assignedUserId !== saved.assignedUserId) { const result = await setServiceRequestAssignmentAction({ requestId, assignedUserId: values.assignedUserId || null }); if (!result.ok) throw new Error(result.error); }
        setSaved(values); setJustSaved(true); router.refresh();
      } catch (caught) { setError(caught instanceof Error ? caught.message : "The service request could not be saved."); router.refresh(); }
      finally { setPending(false); }
    }}>{pending ? "Saving…" : justSaved ? "Changes Saved" : "Save changes"}</button>
  </div>;
}
