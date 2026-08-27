export function buildObservationSummary(fileRows = [], locationRows = [], devices = []) {
  const fileById = new Map(fileRows.map((file) => [String(file.id || ""), file]));
  const deviceById = new Map(devices.map((device) => [String(device.device_id || ""), device]));
  const observedByKey = new Map();
  for (const location of locationRows) {
    const file = fileById.get(String(location.logical_file_id || ""));
    if (!file) continue;
    const key = String(file.file_key || "");
    const list = observedByKey.get(key) || [];
    const device = deviceById.get(String(location.device_id || ""));
    list.push({
      deviceId: String(location.device_id || ""),
      deviceLabel: String(device?.label || location.device_id || "未知设备"),
      availability: String(location.availability || "unknown"),
      relativePath: String(location.relative_path || file.relative_path || ""),
      sizeBytes: location.size_bytes == null ? null : Number(location.size_bytes),
      checksum: String(location.checksum || ""),
      observedAt: String(location.observed_at || location.updated_at || ""),
      fileModifiedAt: String(location.file_modified_at || ""),
    });
    observedByKey.set(key, list);
  }

  let present = 0;
  let missing = 0;
  let unknown = 0;
  const artifacts = fileRows.map((file) => {
    const key = String(file.file_key || "");
    const locations = observedByKey.get(key) || [];
    const hasPresent = locations.some((item) => item.availability === "present");
    const hasMissing = locations.some((item) => item.availability === "missing");
    if (hasPresent) present += 1;
    else if (hasMissing) missing += 1;
    else unknown += 1;
    return {
      fileKey: key,
      logicalStatus: String(file.status || "Missing"),
      expectedPath: String(file.relative_path || ""),
      locations,
      physicalAvailability: hasPresent ? "present" : hasMissing ? "missing" : "unknown",
    };
  });
  return { present, missing, unknown, total: fileRows.length, artifacts };
}

export function attachObservationSummaries(dashboard, data = {}) {
  const filesByProject = new Map();
  const locationsByProject = new Map();
  for (const file of data.files || []) {
    const items = filesByProject.get(file.project_id) || [];
    items.push(file);
    filesByProject.set(file.project_id, items);
  }
  for (const location of data.fileLocations || []) {
    const items = locationsByProject.get(location.project_id) || [];
    items.push(location);
    locationsByProject.set(location.project_id, items);
  }
  const byId = new Map();
  for (const project of dashboard.projects || []) {
    const summary = buildObservationSummary(filesByProject.get(project.projectId) || [], locationsByProject.get(project.projectId) || [], data.devices || []);
    project.fileObservation = summary;
    byId.set(project.projectId, project);
  }
  dashboard.activeProjects = (dashboard.activeProjects || []).map((project) => byId.get(project.projectId) || project);
  dashboard.actions = (dashboard.actions || []).map((action) => ({ ...action, project: byId.get(action.project?.projectId || action.projectId) || action.project }));
  return dashboard;
}
