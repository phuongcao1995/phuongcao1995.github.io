/* ==========================================================================
   NEXUS ERP — pages-projects.js
   Projects (list, CRUD, detail with tasks/team/budget/expenses/revenue/
   documents/activity) and Tasks (list + drag-and-drop Kanban board).
   ========================================================================== */
'use strict';

const PROJECT_STATUSES = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'];
const TASK_STATUSES = ['To Do', 'In Progress', 'Review', 'Completed', 'Blocked'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const ProjectsUI = {
  edit(p, dup) {
    const isEdit = p && !dup;
    formModal({ title: isEdit ? `Edit ${p.name}` : 'New project', size: 'lg', fields: [
      { name: 'name', label: 'Project name', required: true, full: true }, { name: 'customerId', label: 'Customer', type: 'select', required: true, options: Lookup.options.customers },
      { name: 'manager', label: 'Project manager', type: 'select', required: true, options: () => Lookup.options.employees() }, { name: 'startDate', label: 'Start date', type: 'date', required: true },
      { name: 'endDate', label: 'End date', type: 'date', required: true, after: 'startDate' }, { name: 'budget', label: 'Budget', type: 'currency', required: true, min: 1 },
      { name: 'status', label: 'Status', type: 'select', required: true, noEmpty: true, options: PROJECT_STATUSES }, { name: 'team', label: 'Team members', type: 'multiselect', full: true, options: () => Lookup.options.employees().map((o) => ({ ...o, label: o.label.split(' — ')[0] })) },
      { name: 'description', label: 'Description', type: 'textarea', rows: 3, full: true }],
    values: p ? { ...p, name: dup ? p.name + ' (Copy)' : p.name } : { status: 'Planning', startDate: today(), endDate: addDays(today(), 90), team: [] }, submitText: isEdit ? 'Save changes' : 'Create project',
    onSubmit: (v) => {
      if (!v.team.includes(v.manager)) v.team.unshift(v.manager);
      if (isEdit) { DB.update('projects', p.id, v); DB.log(`Updated project ${p.id}`, p.id); showToast('Project updated successfully'); App.refresh(); } else { const id = DB.nextId('projects', 'PRJ-', 3); DB.insert('projects', { ...v, id, documents: [], progress: 0 }); DB.log(`Created project ${id} — ${v.name}`, id); showToast(`Project ${id} created`); navigateTo('project/' + id); }
    } });
  },
  remove(p) {
    if (Projects.invoices(p).length || Projects.expenses(p).some((e) => e.status === 'Paid')) return { error: 'Projects with invoices or paid expenses cannot be deleted. Cancel the project instead.' };
    DB.data.tasks = DB.all('tasks').filter((t) => t.projectId !== p.id); DB.save('tasks');
    DB.remove('projects', p.id); DB.log(`Deleted project ${p.id}`, p.id); return null;
  },
  health(p) { const cost = Projects.cost(p); const late = p.status === 'Active' && p.endDate < today(); return late ? 'Overdue' : cost > p.budget ? 'Over budget' : cost > p.budget * 0.85 ? 'At risk' : 'On track'; },
};
const healthTone = { 'On track': 'success', 'At risk': 'warning', 'Over budget': 'danger', Overdue: 'danger' };

Pages.projects = (el, { query }) => {
  const ps = DB.all('projects');
  const active = ps.filter((p) => p.status === 'Active');
  el.innerHTML = pageHeader({ title: 'Projects', subtitle: `${ps.length} projects · ${active.length} active`, actions: btn('New project', { icon: 'plus', cls: 'btn-primary', attrs: 'data-act="add"', perm: 'create' }) }) +
    statTiles([{ label: 'Active projects', value: active.length, nav: 'projects?status=Active' }, { label: 'Total budget (active)', value: formatCurrency(sum(active, (p) => p.budget), true) }, { label: 'Revenue invoiced', value: formatCurrency(sum(ps, (p) => Projects.revenue(p)), true) }, { label: 'Project costs', value: formatCurrency(sum(ps, (p) => Projects.cost(p)), true) }, { label: 'Open tasks', value: DB.all('tasks').filter((t) => t.status !== 'Completed').length, nav: 'tasks' }]) +
    '<div class="card"><div class="card-body" id="pl"></div></div>';
  listView($('#pl', el), {
    key: 'projects', entity: 'projects', searchPlaceholder: 'Search projects…', rows: () => DB.all('projects'),
    searchFields: [(p) => p.id, (p) => p.name, (p) => Lookup.customerName(p.customerId), (p) => Lookup.employeeName(p.manager)],
    filters: [{ key: 'status', label: 'Status', options: PROJECT_STATUSES }, { key: 'manager', label: 'Manager', options: () => Lookup.options.employees('Projects') }, { key: 'health', label: 'Health', options: Object.keys(healthTone), test: (p, v) => ProjectsUI.health(p) === v }],
    preset: query.status ? { status: query.status } : null, defaultSort: { key: 'id', dir: 'asc' },
    columns: [
      { key: 'id', label: 'Project ID', render: (p) => `<strong>${esc(p.id)}</strong>` }, { key: 'name', label: 'Project Name', render: (p) => link('project/' + p.id, p.name) },
      { key: 'customer', label: 'Customer', value: (p) => Lookup.customerName(p.customerId) }, { key: 'manager', label: 'Manager', value: (p) => Lookup.employeeName(p.manager) },
      { key: 'startDate', label: 'Start', render: (p) => formatDate(p.startDate) }, { key: 'endDate', label: 'End', render: (p) => formatDate(p.endDate) },
      { key: 'budget', label: 'Budget', align: 'right', render: (p) => money(p.budget) }, { key: 'cost', label: 'Actual cost', align: 'right', value: (p) => Projects.cost(p), render: (p) => money(Projects.cost(p)) },
      { key: 'progress', label: 'Progress', value: (p) => Projects.progress(p), render: (p) => `<div class="pct-cell">${progressBar(Projects.progress(p))}<span>${Projects.progress(p)}%</span></div>` },
      { key: 'status', label: 'Status', render: (p) => `${badge(p.status)}${p.status === 'Active' ? ` ${badge(ProjectsUI.health(p), healthTone[ProjectsUI.health(p)])}` : ''}` },
    ],
    onView: (p) => navigateTo('project/' + p.id),
    actions: (p) => crudActions({ view: () => navigateTo('project/' + p.id), edit: () => ProjectsUI.edit(p), duplicate: () => ProjectsUI.edit(p, true), del: () => confirmDelete('Project', () => ProjectsUI.remove(p), 'The project and its tasks will be deleted.') }),
    exportName: 'projects',
  });
  $('[data-act="add"]', el)?.addEventListener('click', () => ProjectsUI.edit(null));
};

Pages.project = (el, { id, query }) => {
  const p = DB.get('projects', id);
  if (!p) { el.innerHTML = errorState(`Project ${id} was not found.`, false); return; }
  App.setCrumb(p.name);
  const tab = query.tab || 'overview';
  const tasks = Projects.tasks(p); const exps = Projects.expenses(p); const invs = DB.all('invoices').filter((i) => i.projectId === p.id);
  const cost = Projects.cost(p); const rev = Projects.revenue(p); const profit = Projects.profit(p); const prog = Projects.progress(p);
  const daysLeft = daysBetween(today(), p.endDate);
  el.innerHTML = pageHeader({ back: 'projects', title: `${esc(p.name)} ${badge(p.status)} ${p.status === 'Active' ? badge(ProjectsUI.health(p), healthTone[ProjectsUI.health(p)]) : ''}`, subtitle: `${esc(p.id)} · ${link('customer/' + p.customerId, Lookup.customerName(p.customerId))} · managed by ${esc(Lookup.employeeName(p.manager))}`,
    actions: `${btn('Add task', { icon: 'tasks', attrs: 'data-act="task"', perm: 'create' })}${Auth.canView('expenses') ? btn('Add expense', { icon: 'receipt', attrs: 'data-act="expense"', perm: 'create' }) : ''}${Auth.canView('billing') ? btn('Invoice project', { icon: 'file', attrs: 'data-act="invoice"', perm: 'create' }) : ''}${btn('Edit', { icon: 'edit', cls: 'btn-primary', attrs: 'data-act="edit"', perm: 'edit' })}` }) +
    statTiles([{ label: 'Progress', value: `${prog}%`, sub: `${tasks.filter((t) => t.status === 'Completed').length}/${tasks.length} tasks done` }, { label: 'Budget', value: formatCurrency(p.budget, true) }, { label: 'Actual cost', value: formatCurrency(cost, true), sub: `${p.budget ? Math.round((cost / p.budget) * 100) : 0}% of budget`, tone: cost > p.budget ? 'danger' : '' }, { label: 'Revenue', value: formatCurrency(rev, true) }, { label: 'Profit', value: formatCurrency(profit, true), sub: 'revenue − cost', tone: profit < 0 ? 'danger' : 'ok' }, { label: p.status === 'Completed' ? 'Completed' : 'Days remaining', value: p.status === 'Completed' ? formatDate(p.endDate) : daysLeft < 0 ? `${-daysLeft} overdue` : daysLeft, tone: daysLeft < 0 && p.status === 'Active' ? 'danger' : '' }]) +
    tabsHtml([{ key: 'overview', label: 'Overview' }, { key: 'tasks', label: 'Tasks', count: tasks.length }, { key: 'team', label: 'Team', count: (p.team || []).length }, { key: 'budget', label: 'Budget' }, { key: 'expenses', label: 'Expenses', count: exps.length }, { key: 'revenue', label: 'Revenue', count: invs.length }, { key: 'documents', label: 'Documents', count: (p.documents || []).length }, { key: 'activity', label: 'Activity' }], tab, 'project/' + p.id) + '<div id="tab" class="tab-panel"></div>';
  const T = $('#tab', el);
  const taskTable = (rows) => renderTable([{ label: 'Task', render: (t) => `<button type="button" class="link-btn" data-task="${t.id}">${esc(t.title)}</button>` }, { label: 'Assigned to', render: (t) => esc(Lookup.employeeName(t.assignedTo)) }, { label: 'Priority', render: (t) => badge(t.priority) }, { label: 'Due', render: (t) => `<span class="${t.dueDate < today() && t.status !== 'Completed' ? 'text-danger' : ''}">${formatDate(t.dueDate)}</span>` }, { label: 'Progress', render: (t) => `<div class="pct-cell">${progressBar(t.progress)}<span>${t.progress}%</span></div>` }, { label: 'Status', render: (t) => badge(t.status) }], rows, { empty: 'No tasks yet — add the first task.' });
  if (tab === 'overview') {
    const byStatus = TASK_STATUSES.map((s, i) => ({ label: s, value: tasks.filter((t) => t.status === s).length, color: ['var(--c4)', 'var(--c2)', 'var(--warning)', 'var(--success)', 'var(--danger)'][i] }));
    T.innerHTML = `<div class="grid-2">${card('Project details', detailList([['Customer', link('customer/' + p.customerId, Lookup.customerName(p.customerId))], ['Project manager', empLink(p.manager)], ['Start date', formatDate(p.startDate)], ['End date', formatDate(p.endDate)], ['Budget', formatCurrency(p.budget)], ['Status', badge(p.status)], ['Description', esc(p.description)]]))}
      <div>${card('Budget vs actual', `<div class="cm-row"><span>${formatCurrency(cost)} spent of ${formatCurrency(p.budget)}</span><strong>${p.budget ? Math.round((cost / p.budget) * 100) : 0}%</strong></div>${progressBar(p.budget ? (cost / p.budget) * 100 : 0, cost > p.budget ? 'danger' : cost > p.budget * 0.85 ? 'warning' : '')}<div class="cm-row"><span>Overall progress</span><strong>${prog}%</strong></div>${progressBar(prog, 'success')}`)}
      ${card('Tasks by status', Charts.hbars({ items: byStatus, format: (v) => String(v) }))}</div></div>${card('Upcoming tasks', taskTable(tasks.filter((t) => t.status !== 'Completed').sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)).slice(0, 6)))}`;
  }
  if (tab === 'tasks') T.innerHTML = card('Tasks', taskTable(tasks), { actions: `<a class="btn btn-sm" href="#/tasks?view=kanban&project=${p.id}">${icon('kanban', 14)} Board view</a>${btn('Add task', { icon: 'plus', cls: 'btn-sm btn-primary', attrs: 'data-act="task"', perm: 'create' })}` });
  if (tab === 'team') {
    T.innerHTML = card('Team members', `<ul class="team-grid">${(p.team || []).map((eid) => { const e = DB.get('employees', eid); if (!e) return ''; const mine = tasks.filter((t) => t.assignedTo === eid); return `<li><span class="avatar">${initials(e.name)}</span><div><strong>${esc(e.name)}</strong>${eid === p.manager ? ' ' + badge('Manager', 'info') : ''}<div class="muted small">${esc(e.position)}</div><div class="small">${mine.length} tasks · ${mine.filter((t) => t.status !== 'Completed').length} open</div></div>${eid !== p.manager && Auth.can('edit') ? `<button type="button" class="icon-btn sm" data-rm="${eid}" aria-label="Remove ${esc(e.name)}">${icon('x', 14)}</button>` : ''}</li>`; }).join('')}</ul>`, { actions: btn('Add member', { icon: 'plus', cls: 'btn-sm', attrs: 'data-act="member"', perm: 'edit' }) });
    T.addEventListener('click', (e) => { const r = e.target.closest('[data-rm]'); if (!r) return; if (tasks.some((t) => t.assignedTo === r.dataset.rm && t.status !== 'Completed')) { showToast('Reassign this member’s open tasks first.', 'error'); return; } p.team = p.team.filter((x) => x !== r.dataset.rm); DB.save('projects'); showToast('Team member removed'); App.refresh(); });
  }
  if (tab === 'budget') {
    const byCat = EXPENSE_CATEGORIES.map((c) => ({ label: c, value: round2(sum(exps.filter((x) => x.category === c), (x) => x.amount)) })).filter((x) => x.value);
    T.innerHTML = `<div class="grid-2">${card('Budget summary', `<dl class="summary"><div><dt>Budget</dt><dd>${formatCurrency(p.budget)}</dd></div><div><dt>Actual cost</dt><dd>${formatCurrency(cost)}</dd></div><div class="${p.budget - cost < 0 ? 'due' : 'grand'}"><dt>Remaining budget</dt><dd>${formatCurrency(p.budget - cost)}</dd></div><div><dt>Revenue invoiced</dt><dd>${formatCurrency(rev)}</dd></div><div class="grand"><dt>Profit (revenue − cost)</dt><dd>${formatCurrency(profit)}</dd></div><div><dt>Margin</dt><dd>${rev ? ((profit / rev) * 100).toFixed(1) + '%' : '—'}</dd></div></dl>`)}${card('Cost by category', Charts.hbars({ items: byCat, color: 'var(--c3)' }))}</div>`;
  }
  if (tab === 'expenses') T.innerHTML = card('Project expenses', renderTable([{ label: 'Expense', render: (x) => esc(x.id) }, { label: 'Date', render: (x) => formatDate(x.date) }, { label: 'Category', render: (x) => esc(x.category) }, { label: 'Vendor', render: (x) => esc(x.vendor) }, { label: 'Description', render: (x) => esc(x.description) }, { label: 'Amount', align: 'right', render: (x) => money(x.amount) }, { label: 'Status', render: (x) => badge(x.status) }], exps, { empty: 'No expenses recorded for this project.', footer: exps.length ? `<tr><th colspan="5">Total cost</th><th class="num">${formatCurrency(cost)}</th><th></th></tr>` : '' }), { actions: Auth.canView('expenses') ? btn('Add expense', { icon: 'plus', cls: 'btn-sm', attrs: 'data-act="expense"', perm: 'create' }) : '' });
  if (tab === 'revenue') T.innerHTML = card('Project invoices', renderTable([{ label: 'Invoice', render: (i) => link('invoice/' + i.id, i.id) }, { label: 'Date', render: (i) => formatDate(i.date) }, { label: 'Net', align: 'right', render: (i) => money(Calc.doc(i).net) }, { label: 'Total', align: 'right', render: (i) => money(Calc.doc(i).total) }, { label: 'Balance', align: 'right', render: (i) => money(Docs.balance(i)) }, { label: 'Status', render: (i) => badge(Docs.status(i)) }], invs, { empty: 'No invoices for this project yet.' }), { actions: Auth.canView('billing') ? btn('Invoice project', { icon: 'plus', cls: 'btn-sm', attrs: 'data-act="invoice"', perm: 'create' }) : '' });
  if (tab === 'documents') {
    T.innerHTML = card('Documents', `${Auth.can('edit') ? `<label class="dropzone" tabindex="0">${icon('upload', 20)}<span class="dz-text">Click to upload a document</span><small>Files are recorded by name only in this demo</small><input type="file" class="sr-only" data-act="upload"></label>` : ''}${renderTable([{ label: 'File', render: (d) => `${icon('paperclip', 14)} ${esc(d.name)}` }, { label: 'Size', render: (d) => esc(d.size) }, { label: 'Uploaded', render: (d) => formatDate(d.date) }, { label: 'By', render: (d) => esc(d.user) }, { label: '', render: (d) => (Auth.can('delete') ? `<button type="button" class="btn btn-sm btn-ghost" data-deldoc="${d.id}">Remove</button>` : '') }], p.documents || [], { empty: 'No documents uploaded.' })}`);
    $('[data-act="upload"]', T)?.addEventListener('change', (e) => { const f = e.target.files[0]; if (!f) return; p.documents = p.documents || []; p.documents.push({ id: uid(), name: f.name, size: f.size > 1048576 ? (f.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(f.size / 1024)) + ' KB', date: today(), user: Auth.userName() }); DB.save('projects'); DB.log(`Uploaded ${f.name} to ${p.id}`, p.id); showToast('Document uploaded'); App.refresh(); });
    T.addEventListener('click', (e) => { const d = e.target.closest('[data-deldoc]'); if (d) { p.documents = p.documents.filter((x) => x.id !== d.dataset.deldoc); DB.save('projects'); showToast('Document removed'); App.refresh(); } });
  }
  if (tab === 'activity') T.innerHTML = card('Activity', activityFor(p.id, 30));
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'edit') ProjectsUI.edit(p);
    if (a === 'task') TasksUI.edit(null, { projectId: p.id });
    if (a === 'expense') ExpensesUI.edit(null, false, { projectId: p.id, description: `— ${p.name}` });
    if (a === 'invoice') { const c = DB.get('customers', p.customerId); Invoices.create({ customerId: p.customerId, projectId: p.id, paymentTerms: c?.paymentTerms || 'Net 30', dueDate: addDays(today(), Lookup.termsDays(c?.paymentTerms)), notes: `Project ${p.id} — ${p.name}`, items: [{ productId: 'SKU-124', description: `IT Consulting — ${p.name}`, qty: 40, price: 150, discount: 0, tax: DB.data.settings.taxRate }] }); }
    if (a === 'member') formModal({ title: 'Add team member', size: 'sm', fields: [{ name: 'emp', label: 'Employee', type: 'select', required: true, options: () => Lookup.options.employees().filter((o) => !(p.team || []).includes(o.value)) }], onSubmit: (v) => { p.team = [...(p.team || []), v.emp]; DB.save('projects'); DB.log(`Added ${Lookup.employeeName(v.emp)} to ${p.id}`, p.id); showToast('Team member added'); App.refresh(); } });
    const t = e.target.closest('[data-task]'); if (t) TasksUI.edit(DB.get('tasks', t.dataset.task));
  });
};

/* ---------- Tasks ---------- */
const TasksUI = {
  edit(t, prefill = {}) {
    const isEdit = !!t;
    formModal({ title: isEdit ? `Task ${t.id}` : 'New task', size: 'lg', fields: [
      { name: 'title', label: 'Task title', required: true, full: true }, { name: 'projectId', label: 'Project', type: 'select', required: true, options: Lookup.options.projects },
      { name: 'assignedTo', label: 'Assigned to', type: 'select', required: true, options: () => Lookup.options.employees() }, { name: 'priority', label: 'Priority', type: 'select', required: true, noEmpty: true, options: PRIORITIES },
      { name: 'status', label: 'Status', type: 'select', required: true, noEmpty: true, options: TASK_STATUSES }, { name: 'startDate', label: 'Start date', type: 'date', required: true },
      { name: 'dueDate', label: 'Due date', type: 'date', required: true, after: 'startDate' }, { name: 'progress', label: 'Progress (%)', type: 'number', integer: true, max: 100, required: true },
      { name: 'description', label: 'Description', type: 'textarea', rows: 3, full: true }],
    values: t || { priority: 'Medium', status: 'To Do', startDate: today(), dueDate: addDays(today(), 14), progress: 0, ...prefill }, submitText: isEdit ? 'Save changes' : 'Create task',
    onInput: (form, e) => { if (e && e.target.name === 'status' && e.target.value === 'Completed') $('[name=progress]', form).value = 100; },
    onSubmit: (v) => {
      if (v.status === 'Completed') v.progress = 100;
      if (!Auth.can(isEdit ? 'edit' : 'create')) return { error: 'Your role does not allow this action.' };
      if (isEdit) { const was = t.status; DB.update('tasks', t.id, v); DB.log(was !== v.status ? `Moved task "${v.title}" to ${v.status}` : `Updated task "${v.title}"`, v.projectId); showToast('Task updated successfully'); } else { const id = DB.nextId('tasks', 'TSK-', 4); DB.insert('tasks', { ...v, id }); DB.log(`Created task "${v.title}"`, v.projectId); showToast(`Task ${id} created`); }
      App.refresh();
    } });
  },
  move(t, status) {
    if (!Auth.can('edit')) { showToast('Your role does not allow editing tasks.', 'error'); return; }
    if (t.status === status) return;
    t.status = status; if (status === 'Completed') t.progress = 100; else if (status === 'To Do') t.progress = 0; else if (t.progress === 100) t.progress = 90;
    DB.save('tasks'); DB.log(`Moved task "${t.title}" to ${status}`, t.projectId); showToast(`“${t.title}” moved to ${status}`); App.refresh();
  },
};
Pages.tasks = (el, { query }) => {
  const view = query.view === 'kanban' ? 'kanban' : 'list';
  const ts = DB.all('tasks');
  const overdue = ts.filter((t) => t.status !== 'Completed' && t.dueDate < today());
  el.innerHTML = pageHeader({ title: 'Tasks', subtitle: `${ts.length} tasks · ${overdue.length} overdue`, actions: `<div class="seg" role="group" aria-label="View"><a class="seg-btn ${view === 'list' ? 'active' : ''}" href="#/tasks${query.project ? '?project=' + query.project : ''}" aria-pressed="${view === 'list'}">${icon('list', 16)} List</a><a class="seg-btn ${view === 'kanban' ? 'active' : ''}" href="#/tasks?view=kanban${query.project ? '&project=' + query.project : ''}" aria-pressed="${view === 'kanban'}">${icon('kanban', 16)} Board</a></div>${btn('New task', { icon: 'plus', cls: 'btn-primary', attrs: 'data-act="add"', perm: 'create' })}` }) +
    statTiles(TASK_STATUSES.map((s) => ({ label: s, value: ts.filter((t) => t.status === s).length }))) + '<div id="tv"></div>';
  const V = $('#tv', el);
  if (view === 'list') {
    V.innerHTML = '<div class="card"><div class="card-body" id="tl"></div></div>';
    listView($('#tl', V), {
      key: 'tasks', entity: 'tasks', searchPlaceholder: 'Search tasks…', rows: () => DB.all('tasks'),
      searchFields: [(t) => t.id, (t) => t.title, (t) => Lookup.projectName(t.projectId), (t) => Lookup.employeeName(t.assignedTo)],
      filters: [{ key: 'status', label: 'Status', options: [{ value: 'open', label: 'Open' }, { value: 'overdue', label: 'Overdue' }, ...TASK_STATUSES], test: (t, v) => (v === 'open' ? t.status !== 'Completed' : v === 'overdue' ? t.status !== 'Completed' && t.dueDate < today() : t.status === v) }, { key: 'priority', label: 'Priority', options: PRIORITIES }, { key: 'projectId', label: 'Project', options: Lookup.options.projects }, { key: 'assignedTo', label: 'Assignee', options: () => Lookup.options.employees() }],
      preset: query.project || query.status ? { ...(query.project ? { projectId: query.project } : {}), ...(query.status ? { status: query.status } : {}) } : null, defaultSort: { key: 'dueDate', dir: 'asc' },
      columns: [
        { key: 'id', label: 'Task ID', render: (t) => `<strong>${esc(t.id)}</strong>` }, { key: 'title', label: 'Task' },
        { key: 'project', label: 'Project', value: (t) => Lookup.projectName(t.projectId), render: (t) => link('project/' + t.projectId, Lookup.projectName(t.projectId)) },
        { key: 'assignedTo', label: 'Assigned To', value: (t) => Lookup.employeeName(t.assignedTo) }, { key: 'priority', label: 'Priority', sortValue: (t) => PRIORITIES.indexOf(t.priority), render: (t) => badge(t.priority) },
        { key: 'startDate', label: 'Start', render: (t) => formatDate(t.startDate) }, { key: 'dueDate', label: 'Due', render: (t) => `<span class="${t.dueDate < today() && t.status !== 'Completed' ? 'text-danger' : ''}">${formatDate(t.dueDate)}</span>` },
        { key: 'progress', label: 'Progress', render: (t) => `<div class="pct-cell">${progressBar(t.progress)}<span>${t.progress}%</span></div>` }, { key: 'status', label: 'Status', render: (t) => badge(t.status) },
      ],
      onView: (t) => TasksUI.edit(t),
      actions: (t) => crudActions({ view: () => TasksUI.edit(t), duplicate: () => TasksUI.edit(null, { ...t, title: t.title + ' (Copy)', status: 'To Do', progress: 0 }), del: () => confirmDelete('Task', () => { DB.remove('tasks', t.id); DB.log(`Deleted task "${t.title}"`, t.projectId); }), extra: TASK_STATUSES.filter((s) => s !== t.status).map((s) => ({ label: `Move to ${s}`, icon: 'arrowRight', perm: 'edit', onClick: () => TasksUI.move(t, s) })) }),
      onDelete: (rows) => { rows.forEach((t) => DB.remove('tasks', t.id)); showToast(`${rows.length} tasks deleted`); },
      exportName: 'tasks',
    });
  } else {
    const pid = query.project || '';
    const rows = ts.filter((t) => !pid || t.projectId === pid);
    V.innerHTML = `<div class="card no-print"><div class="card-body filter-bar"><label>Project <select id="kb-proj"><option value="">All projects</option>${DB.all('projects').map((p) => `<option value="${p.id}"${p.id === pid ? ' selected' : ''}>${esc(p.id)} · ${esc(p.name)}</option>`).join('')}</select></label><span class="muted small">Drag cards between columns, or use a card’s menu to move it.</span></div></div>
      <div class="kanban">${TASK_STATUSES.map((s) => { const col = rows.filter((t) => t.status === s).sort((a, b) => PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority)); return `<section class="kb-col" data-status="${s}" aria-label="${s}"><header><span class="kb-dot tone-${statusTone(s)}"></span><h2>${s}</h2><span class="count-pill">${col.length}</span></header><div class="kb-list">${col.map((t) => `<article class="kb-card" draggable="${Auth.can('edit')}" data-id="${t.id}" tabindex="0" aria-label="${esc(t.title)}, ${t.priority} priority"><div class="kb-top">${badge(t.priority)}<button type="button" class="icon-btn sm kb-menu" aria-label="Task actions" aria-haspopup="menu">${icon('more', 16)}</button></div><h3>${esc(t.title)}</h3><p class="muted small">${esc(Lookup.projectName(t.projectId))}</p>${progressBar(t.progress)}<div class="kb-foot"><span class="avatar xs" title="${esc(Lookup.employeeName(t.assignedTo))}">${initials(Lookup.employeeName(t.assignedTo))}</span><span class="small ${t.dueDate < today() && s !== 'Completed' ? 'text-danger' : 'muted'}">${icon('calendar', 12)} ${formatDate(t.dueDate)}</span></div></article>`).join('') || '<p class="kb-empty">No tasks</p>'}</div></section>`; }).join('')}</div>`;
    $('#kb-proj', V).addEventListener('change', (e) => navigateTo('tasks?view=kanban' + (e.target.value ? '&project=' + e.target.value : ''), { replace: true }));
    let drag = null;
    V.addEventListener('dragstart', (e) => { const c = e.target.closest('.kb-card'); if (!c) return; drag = c.dataset.id; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', drag); });
    V.addEventListener('dragend', (e) => { e.target.closest('.kb-card')?.classList.remove('dragging'); $$('.kb-col', V).forEach((c) => c.classList.remove('drop')); });
    V.addEventListener('dragover', (e) => { const col = e.target.closest('.kb-col'); if (!col || !drag) return; e.preventDefault(); $$('.kb-col', V).forEach((c) => c.classList.toggle('drop', c === col)); });
    V.addEventListener('drop', (e) => { const col = e.target.closest('.kb-col'); if (!col || !drag) return; e.preventDefault(); const t = DB.get('tasks', drag); drag = null; if (t) TasksUI.move(t, col.dataset.status); });
    V.addEventListener('click', (e) => { const card = e.target.closest('.kb-card'); if (!card) return; const t = DB.get('tasks', card.dataset.id); if (e.target.closest('.kb-menu')) { openMenu(e.target.closest('.kb-menu'), [{ label: 'Open task', icon: 'eye', onClick: () => TasksUI.edit(t) }, ...TASK_STATUSES.filter((s) => s !== t.status).map((s) => ({ label: `Move to ${s}`, icon: 'arrowRight', perm: 'edit', onClick: () => TasksUI.move(t, s) }))]); return; } TasksUI.edit(t); });
    V.addEventListener('keydown', (e) => { const card = e.target.closest('.kb-card'); if (!card || e.target !== card) return; if (e.key === 'Enter') TasksUI.edit(DB.get('tasks', card.dataset.id)); if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const t = DB.get('tasks', card.dataset.id); const i = TASK_STATUSES.indexOf(t.status) + (e.key === 'ArrowRight' ? 1 : -1); if (i >= 0 && i < TASK_STATUSES.length) TasksUI.move(t, TASK_STATUSES[i]); } });
  }
  $('[data-act="add"]', el)?.addEventListener('click', () => TasksUI.edit(null, query.project ? { projectId: query.project } : {}));
};
