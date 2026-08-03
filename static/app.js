const $ = (sel) => document.querySelector(sel);

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `요청 실패 (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}시간 ${m}분`;
  if (h) return `${h}시간`;
  return `${m}분`;
}

function sourceBadge(source) {
  const map = {
    manual: "직접 추가",
    google_calendar: "구글 캘린더",
    google_tasks: "구글 Tasks",
  };
  return map[source] || source;
}

function todayLocalStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function urgencyClass(todo) {
  if (todo.completed || !todo.due_date) return "urgency-future";
  const today = todayLocalStr();
  if (todo.due_date < today) return "urgency-overdue";
  if (todo.due_date === today) return "urgency-today";
  return "urgency-future";
}

function buildTodoItem(todo, { showPriorityControls, position, total }) {
  const li = document.createElement("li");
  li.className = "todo-item " + urgencyClass(todo) + (todo.completed ? " completed" : "");
  li.dataset.id = todo.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = todo.completed;
  checkbox.title = "완료 여부";
  checkbox.addEventListener("change", async () => {
    await api(`/api/todos/${todo.id}/complete`, {
      method: "POST",
      body: JSON.stringify({ completed: checkbox.checked }),
    });
    refreshAll();
  });

  const main = document.createElement("div");
  main.className = "todo-main";

  const title = document.createElement("div");
  title.className = "todo-title";
  title.textContent = todo.title;

  const meta = document.createElement("div");
  meta.className = "todo-meta";

  const dueInput = document.createElement("input");
  dueInput.type = "date";
  dueInput.value = todo.due_date || "";
  dueInput.title = "듀데이트";
  dueInput.addEventListener("change", async () => {
    await api(`/api/todos/${todo.id}`, {
      method: "PATCH",
      body: JSON.stringify({ due_date: dueInput.value || null }),
    });
    refreshAll();
  });

  const timeRange = document.createElement("span");
  timeRange.className = "time-range";

  const startInput = document.createElement("input");
  startInput.type = "time";
  startInput.value = todo.start_time || "";
  startInput.title = "수행 시작 시간";

  const tilde = document.createElement("span");
  tilde.textContent = "~";

  const endInput = document.createElement("input");
  endInput.type = "time";
  endInput.value = todo.end_time || "";
  endInput.title = "수행 종료 시간";

  const saveTimeRange = async () => {
    await api(`/api/todos/${todo.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        start_time: startInput.value || null,
        end_time: endInput.value || null,
      }),
    });
    refreshAll();
  };
  startInput.addEventListener("change", saveTimeRange);
  endInput.addEventListener("change", saveTimeRange);

  timeRange.append(startInput, tilde, endInput);

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = sourceBadge(todo.source);

  meta.append(dueInput, timeRange, badge);
  if (formatDuration(todo.duration_minutes)) {
    const label = document.createElement("span");
    label.textContent = formatDuration(todo.duration_minutes);
    meta.appendChild(label);
  }

  main.append(title, meta);

  const actions = document.createElement("div");
  actions.className = "todo-actions";

  const todayBtn = document.createElement("button");
  todayBtn.className = "secondary";
  todayBtn.textContent = todo.today_priority ? "오늘에서 제거" : "오늘에 추가";
  todayBtn.addEventListener("click", async () => {
    await api(`/api/todos/${todo.id}/today-priority`, {
      method: "POST",
      body: JSON.stringify({ priority: todo.today_priority ? null : true }),
    });
    refreshAll();
  });

  const calBtn = document.createElement("button");
  calBtn.className = "secondary";
  calBtn.textContent = "📅";
  calBtn.title = "구글 캘린더로 보내기";
  calBtn.addEventListener("click", async () => {
    try {
      await api(`/api/todos/${todo.id}/push/calendar`, { method: "POST" });
      refreshAll();
    } catch (e) {
      alert(e.message);
    }
  });

  const taskBtn = document.createElement("button");
  taskBtn.className = "secondary";
  taskBtn.textContent = "✅";
  taskBtn.title = "구글 Tasks로 보내기";
  taskBtn.addEventListener("click", async () => {
    try {
      await api(`/api/todos/${todo.id}/push/tasks`, { method: "POST" });
      refreshAll();
    } catch (e) {
      alert(e.message);
    }
  });

  const delBtn = document.createElement("button");
  delBtn.className = "danger";
  delBtn.textContent = "삭제";
  delBtn.addEventListener("click", async () => {
    if (!confirm(`"${todo.title}" 항목을 삭제할까요?`)) return;
    await api(`/api/todos/${todo.id}`, { method: "DELETE" });
    refreshAll();
  });

  actions.append(todayBtn, calBtn, taskBtn, delBtn);

  li.append(checkbox, main);

  if (showPriorityControls) {
    const priorityBox = document.createElement("div");
    priorityBox.className = "priority-controls";

    const upBtn = document.createElement("button");
    upBtn.textContent = "▲";
    upBtn.disabled = position === 0;
    upBtn.addEventListener("click", () => moveToday(todo.id, position, position - 1));

    const downBtn = document.createElement("button");
    downBtn.textContent = "▼";
    downBtn.disabled = position === total - 1;
    downBtn.addEventListener("click", () => moveToday(todo.id, position, position + 1));

    priorityBox.append(upBtn, downBtn);
    li.appendChild(priorityBox);
  }

  li.appendChild(actions);
  return li;
}

let todayOrderCache = [];

async function moveToday(id, from, to) {
  const ids = [...todayOrderCache];
  const [moved] = ids.splice(from, 1);
  ids.splice(to, 0, moved);
  await api("/api/today/order", {
    method: "PUT",
    body: JSON.stringify({ ordered_ids: ids }),
  });
  refreshAll();
}

async function refreshToday() {
  const todos = await api("/api/todos/today");
  todayOrderCache = todos.map((t) => t.id);
  const list = $("#today-list");
  list.innerHTML = "";
  if (!todos.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "오늘 할일이 없습니다. 아래 목록에서 '오늘에 추가'를 눌러보세요.";
    list.appendChild(empty);
    return;
  }
  todos.forEach((todo, idx) => {
    list.appendChild(buildTodoItem(todo, { showPriorityControls: true, position: idx, total: todos.length }));
  });
}

async function refreshOverdue() {
  const todos = await api("/api/todos/overdue");
  const list = $("#overdue-list");
  list.innerHTML = "";
  if (!todos.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "기한이 지난 할일이 없습니다.";
    list.appendChild(empty);
    return;
  }
  todos.forEach((todo) => {
    list.appendChild(buildTodoItem(todo, { showPriorityControls: false }));
  });
}

async function refreshAllList() {
  const hideCompleted = $("#f-hide-completed").checked;
  const todos = await api(`/api/todos?include_completed=${hideCompleted ? "0" : "1"}`);
  const list = $("#all-list");
  list.innerHTML = "";
  if (!todos.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "할일이 없습니다. 위에서 새 할일을 추가해보세요.";
    list.appendChild(empty);
    return;
  }
  todos.forEach((todo) => {
    list.appendChild(buildTodoItem(todo, { showPriorityControls: false }));
  });
}

async function refreshGoogleStatus() {
  const el = $("#google-status");
  try {
    const status = await api("/api/google/status");
    if (!status.configured) {
      el.textContent = "Google 연동 미설정";
      el.className = "google-status warn";
    } else if (status.authenticated) {
      el.textContent = "Google 연결됨";
      el.className = "google-status ok";
    } else {
      el.textContent = "Google 연결 필요";
      el.className = "google-status warn";
    }
  } catch (e) {
    el.textContent = "상태 확인 실패";
  }
}

function refreshAll() {
  refreshOverdue();
  refreshToday();
  refreshAllList();
}

$("#add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = $("#f-title").value.trim();
  if (!title) return;
  await api("/api/todos", {
    method: "POST",
    body: JSON.stringify({
      title,
      description: $("#f-desc").value.trim(),
      due_date: $("#f-due").value || null,
      start_time: $("#f-start-time").value || null,
      end_time: $("#f-end-time").value || null,
      add_to_today: $("#f-add-today").checked,
    }),
  });
  e.target.reset();
  refreshAll();
});

$("#f-hide-completed").addEventListener("change", refreshAllList);

$("#btn-google-connect").addEventListener("click", () => {
  window.location.href = "/auth/google";
});

$("#btn-sync-calendar").addEventListener("click", async () => {
  try {
    const result = await api("/api/sync/calendar", { method: "POST", body: JSON.stringify({}) });
    alert(`${result.count}개의 일정을 가져왔습니다.`);
    refreshAll();
  } catch (e) {
    alert(e.message);
  }
});

$("#btn-sync-tasks").addEventListener("click", async () => {
  try {
    const result = await api("/api/sync/tasks", { method: "POST", body: JSON.stringify({}) });
    alert(`${result.count}개의 Google Task를 가져왔습니다.`);
    refreshAll();
  } catch (e) {
    alert(e.message);
  }
});

refreshGoogleStatus();
refreshAll();
