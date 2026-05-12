const token   = localStorage.getItem('tugon_token');
const student = JSON.parse(localStorage.getItem('tugon_student') || 'null');
if (!token || !student) { window.location.href = 'login.html'; }
else {
    const el = document.getElementById('student-name');
    if (el) el.textContent = student.name || 'Student Account';
    const colEl = document.getElementById('dropdown-college');
    if (colEl) colEl.textContent = student.college || '';
    const yrEl = document.getElementById('dropdown-year');
    if (yrEl) yrEl.textContent = student.year_level || '';
}

document.getElementById('logout-link').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('tugon_token');
    localStorage.removeItem('tugon_student');
    window.location.href = 'login.html';
});

const catColors = {
    Academic: 'linear-gradient(135deg,#0a3d18,#1a7a2e)',
    Cultural:  'linear-gradient(135deg,#7c2b8b,#be185d)',
    Sports:    'linear-gradient(135deg,#164e63,#0891b2)',
    Social:    'linear-gradient(135deg,#78350f,#d97706)',
    Tech:      'linear-gradient(135deg,#312e81,#4f46e5)',
    Others:    'linear-gradient(135deg,#1f2937,#374151)',
};

async function apiFetch(url, opts = {}) {
    return fetch(url, {
    ...opts,
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
}

function buildFeaturedSlide(e) {
    const dateStr = e.date ? new Date(e.date).toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' }) : '';
    const timeStr = [e.start_time, e.end_time].filter(Boolean).join(' – ');
    const full    = e.capacity && (e.registration_count || 0) >= e.capacity;
    let btnLabel, btnStyle = '';
    if (e.registered) {
    btnLabel = '✅ Registered — Click to Unregister';
    } else if (full) {
    btnLabel  = 'Full';
    btnStyle  = 'opacity:.55;cursor:not-allowed;background:rgba(239,68,68,0.2);color:#fca5a5;border-color:rgba(239,68,68,0.4);';
    } else {
    btnLabel = 'Register Now';
    }
    return `
    <p class="section-label">📌 Featured Event</p>
    <h1>${e.title}</h1>
    <p class="desc">${e.description || ''}</p>
    <div class="event-meta-chips">
        ${dateStr ? `<span class="meta-chip">📅 ${dateStr}</span>` : ''}
        ${timeStr ? `<span class="meta-chip">🕗 ${timeStr}</span>`  : ''}
        ${e.location ? `<span class="meta-chip">📍 ${e.location}</span>` : ''}
        ${e.category ? `<span class="meta-chip">🎓 ${e.category}</span>` : ''}
        ${e.capacity ? `<span class="meta-chip">👥 ${e.registration_count||0}/${e.capacity} Seats</span>` : ''}
        <button class="btn btn-primary btn-sm register-btn"
        data-id="${e.id}" data-registered="${e.registered ? '1' : '0'}" ${full && !e.registered ? 'disabled' : ''}
        style="${btnStyle}">
        ${btnLabel}
        </button>
    </div>`;
}

async function loadFeatured() {
    const container = document.getElementById('featured-container');
    if (!container) return;
    try {
    const res    = await apiFetch('/api/events/featured');
    const events = await res.json();
    if (!res.ok || !events.length) {
        container.innerHTML = '<p class="section-label" style="opacity:.5;">No featured event for your college or year level.</p>';
        return;
    }
    const featured = events[0];
    container.innerHTML = buildFeaturedSlide(featured);
    container.querySelector('.register-btn').addEventListener('click', function() {
        handleRegister(featured.id, this);
    });
    } catch { container.innerHTML = ''; }
}

async function loadAllEvents() {
    const grid = document.getElementById('events-grid');
    if (!grid) return;
    grid.innerHTML = '<p style="color:rgba(255,255,255,0.5);padding:2rem;">Loading events…</p>';
    try {
    const res    = await apiFetch('/api/events');
    const events = await res.json();
    if (!res.ok) { grid.innerHTML = '<p style="color:#fca5a5;">Failed to load events.</p>'; return; }
    if (!events.length) { grid.innerHTML = '<p style="color:rgba(255,255,255,0.5);padding:2rem;">No events available for your college/year level yet.</p>'; return; }

    grid.innerHTML = events.map(e => {
        const bg   = catColors[e.category] || catColors.Others;
        const cardImgStyle = e.image_url
        ? `background:${bg};background-image:url('${e.image_url}');background-size:cover;background-position:center;`
        : `background:${bg};`;
        const full = e.capacity && (e.registration_count || 0) >= e.capacity;
        let actionHtml;
        if (full && !e.registered) {
        actionHtml = `
            <button class="btn btn-secondary btn-sm" disabled
            style="opacity:.55;cursor:not-allowed;background:rgba(239,68,68,0.2);color:#fca5a5;border-color:rgba(239,68,68,0.4);">
            Full
            </button>
            <a href="schedule.html" class="btn btn-secondary btn-sm" style="margin-left:0.4rem;">Details</a>`;
        } else {
        const btnLabel = e.registered ? '✅ Registered' : 'Register';
        actionHtml = `
            <button class="btn btn-secondary btn-sm register-btn"
            data-id="${e.id}" data-registered="${e.registered ? '1' : '0'}">
            ${btnLabel}
            </button>
            <a href="schedule.html" class="btn btn-secondary btn-sm" style="margin-left:0.4rem;">Details</a>`;
        }
        return `
        <div class="event-card">
            <div class="card-img" style="${cardImgStyle}">
            <span class="card-badge">${e.category || 'Event'}</span>
            </div>
            <div class="card-body">
            <h3>${e.title}</h3>
            <p>${e.description ? e.description.substring(0, 90) + (e.description.length > 90 ? '…' : '') : ''}</p>
            <div class="card-footer">
                ${actionHtml}
            </div>
            </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.register-btn').forEach(btn => {
        btn.addEventListener('click', function() {
        handleRegister(this.dataset.id, this);
        });
    });
    } catch {
    grid.innerHTML = '<p style="color:#fca5a5;">Server unreachable.</p>';
    }
}

async function handleRegister(id, btn) {
    if (btn.dataset.registered === '1') {
    if (!confirm('Unregister from this event?')) return;
    btn.textContent = 'Unregistering…';
    btn.disabled    = true;
    try {
        const res = await apiFetch(`/api/events/${id}/register`, { method: 'DELETE' });
        if (res.ok) {
        btn.textContent        = 'Register Now';
        btn.dataset.registered = '0';
        btn.disabled           = false;
        btn.style              = '';
        loadFeatured();
        loadAllEvents();
        } else {
        const data = await res.json();
        alert(data.error || 'Failed to unregister.');
        btn.textContent = '✅ Registered — Click to Unregister';
        btn.disabled    = false;
        }
    } catch {
        alert('Server unreachable.');
        btn.textContent = '✅ Registered — Click to Unregister';
        btn.disabled    = false;
    }
    return;
    }
    btn.textContent = 'Registering…';
    btn.disabled    = true;
    try {
    const res  = await apiFetch(`/api/events/${id}/register`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
        btn.textContent        = '✅ Registered — Click to Unregister';
        btn.dataset.registered = '1';
        btn.disabled           = false;
    } else if (res.status === 409 && data.error && data.error.includes('already registered')) {
        btn.textContent        = '✅ Registered — Click to Unregister';
        btn.dataset.registered = '1';
        btn.disabled           = false;
    } else {
        alert(data.error || 'Registration failed.');
        btn.textContent = 'Register Now';
        btn.disabled    = false;
    }
    } catch {
    alert('Server unreachable.');
    btn.textContent = 'Register Now';
    btn.disabled    = false;
    }
}

loadFeatured();
loadAllEvents();

const PM_COURSES = {
    'Computer Studies': ['BS in Computer Science', 'BS in Information Technology'],
    'Education':        ['Bachelor in Elementary Education (BEEd)', 'Bachelor in Secondary Education (BSEd)'],
};

function pmUpdateCourse(college, courseVal) {
    const courseWrap = document.getElementById('pm-course-wrap');
    const majorWrap  = document.getElementById('pm-major-wrap');
    const courseEl   = document.getElementById('pm-course');
    const opts = PM_COURSES[college];
    courseEl.innerHTML = '<option value="">-- Select Course --</option>';
    majorWrap.style.display  = 'none';
    document.getElementById('pm-major').value = '';
    if (opts) {
    opts.forEach(c => {
        const o = document.createElement('option');
        o.value = o.textContent = c;
        courseEl.appendChild(o);
    });
    courseEl.value = courseVal || '';
    courseWrap.style.display = 'block';
    pmUpdateMajor(courseEl.value, '');
    } else {
    courseEl.value = '';
    courseWrap.style.display = 'none';
    }
}

function pmUpdateMajor(courseVal, majorVal) {
    const majorWrap = document.getElementById('pm-major-wrap');
    if (courseVal === 'Bachelor in Secondary Education (BSEd)') {
    majorWrap.style.display = 'block';
    document.getElementById('pm-major').value = majorVal || '';
    } else {
    majorWrap.style.display = 'none';
    document.getElementById('pm-major').value = '';
    }
}

document.getElementById('pm-college').addEventListener('change', function() {
    pmUpdateCourse(this.value, '');
});
document.getElementById('pm-course').addEventListener('change', function() {
    pmUpdateMajor(this.value, '');
});

document.getElementById('edit-profile-link').addEventListener('click', async (e) => {
    e.preventDefault();
    let profileData = null;
    try {
    const res = await apiFetch('/api/auth/profile');
    profileData = await res.json();
    } catch { profileData = student; }
    openProfileModal(profileData);
});

function openProfileModal(s) {
    document.getElementById('profile-modal-overlay').style.display = 'flex';
    document.getElementById('pm-first-name').value  = s.first_name || (s.name || '').split(' ')[0] || '';
    document.getElementById('pm-last-name').value   = s.last_name  || (s.name || '').split(' ').slice(1).join(' ') || '';
    document.getElementById('pm-email').value       = s.email      || '';
    document.getElementById('pm-college').value     = s.college    || '';
    document.getElementById('pm-year-level').value  = s.year_level || '';
    document.getElementById('pm-error').textContent = '';
    pmUpdateCourse(s.college || '', s.course || '');
    pmUpdateMajor(s.course || '', s.major || '');
}

document.getElementById('pm-cancel').addEventListener('click', () => {
    document.getElementById('profile-modal-overlay').style.display = 'none';
});
document.getElementById('profile-modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) this.style.display = 'none';
});

document.getElementById('pm-save').addEventListener('click', async () => {
    const errEl = document.getElementById('pm-error');
    errEl.textContent = '';
    const body = {
    first_name: document.getElementById('pm-first-name').value.trim(),
    last_name:  document.getElementById('pm-last-name').value.trim(),
    email:      document.getElementById('pm-email').value.trim(),
    college:    document.getElementById('pm-college').value,
    course:     document.getElementById('pm-course').value || null,
    major:      document.getElementById('pm-major').value || null,
    year_level: document.getElementById('pm-year-level').value,
    };
    if (!body.first_name || !body.last_name || !body.email || !body.college || !body.year_level) {
    errEl.textContent = 'Please fill all required fields.'; return;
    }
    const saveBtn = document.getElementById('pm-save');
    saveBtn.textContent = 'Saving…'; saveBtn.disabled = true;
    try {
    const res  = await apiFetch('/api/auth/profile', { method: 'PUT', body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) {
        localStorage.setItem('tugon_token', data.token);
        localStorage.setItem('tugon_student', JSON.stringify(data.student));
        document.getElementById('student-name').textContent = data.student.name;
        document.getElementById('dropdown-college').textContent = data.student.college;
        document.getElementById('dropdown-year').textContent   = data.student.year_level;
        document.getElementById('profile-modal-overlay').style.display = 'none';
        loadFeatured(); loadAllEvents();
    } else {
        errEl.textContent = data.error || 'Update failed.';
    }
    } catch { errEl.textContent = 'Server unreachable.'; }
    saveBtn.textContent = 'Save Changes'; saveBtn.disabled = false;
});