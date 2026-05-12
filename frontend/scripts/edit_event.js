(function() {
    const adminToken = localStorage.getItem('tugon_admin_token');
    if (!adminToken) { window.location.href = 'login.html'; return; }

    // Get event ID from URL
    const params  = new URLSearchParams(window.location.search);
    const eventId = params.get('id');
    if (!eventId) { alert('No event ID specified.'); window.location.href = 'admin_dashboard.html'; return; }

    /* ── Mutual exclusion logic (same as add_event) ── */
    const collegeAll           = document.getElementById('college-all');
    const allCollegeChecks     = document.querySelectorAll('.college-check');
    const specificCollegeChecks = Array.from(allCollegeChecks).filter(cb => cb.value !== 'All');
    const yearAll              = document.getElementById('year-all');
    const allYearChecks        = document.querySelectorAll('.year-check');
    const specificYearChecks   = Array.from(allYearChecks).filter(cb => cb.value !== 'All');

    function updateCollegePillState() {
    if (collegeAll.checked) {
        specificCollegeChecks.forEach(cb => {
        cb.checked = false;
        const p = cb.closest('.pill-checkbox');
        if (p) p.classList.add('disabled');
        });
    } else {
        specificCollegeChecks.forEach(cb => {
        const p = cb.closest('.pill-checkbox');
        if (p) p.classList.remove('disabled');
        });
    }
    }

    function updateYearPillState() {
    if (yearAll.checked) {
        specificYearChecks.forEach(cb => {
        cb.checked = false;
        const p = cb.closest('.pill-checkbox');
        if (p) p.classList.add('disabled');
        });
    } else {
        specificYearChecks.forEach(cb => {
        const p = cb.closest('.pill-checkbox');
        if (p) p.classList.remove('disabled');
        });
    }
    }

    collegeAll.addEventListener('change', () => {
    if (collegeAll.checked) specificCollegeChecks.forEach(cb => cb.checked = false);
    updateCollegePillState();
    });
    specificCollegeChecks.forEach(cb => cb.addEventListener('change', () => {
    if (cb.checked) collegeAll.checked = false;
    updateCollegePillState();
    }));
    yearAll.addEventListener('change', () => {
    if (yearAll.checked) specificYearChecks.forEach(cb => cb.checked = false);
    updateYearPillState();
    });
    specificYearChecks.forEach(cb => cb.addEventListener('change', () => {
    if (cb.checked) yearAll.checked = false;
    updateYearPillState();
    }));

    /* ── Helpers ─────────────────────────────────────── */
    function getSelectedColleges() {
    const checked = Array.from(allCollegeChecks).filter(cb => cb.checked).map(cb => cb.value);
    return checked.includes('All') ? ['All'] : checked;
    }
    function getSelectedYears() {
    const checked = Array.from(allYearChecks).filter(cb => cb.checked).map(cb => cb.value);
    return checked.includes('All') ? ['All'] : checked;
    }

    function showInlineError(message) {
    let errDiv = document.getElementById('dynamic-form-error');
    if (!errDiv) {
        errDiv = document.createElement('div');
        errDiv.id = 'dynamic-form-error';
        errDiv.style.cssText = 'margin:0 0 1rem 0;padding:0.8rem 1.2rem;border-radius:12px;background:rgba(220,38,38,0.15);border:1px solid rgba(239,68,68,0.4);color:#fca5a5;font-weight:500;';
        const fc = document.querySelector('.admin-form');
        if (fc) fc.prepend(errDiv);
    }
    errDiv.textContent = message;
    errDiv.style.display = 'block';
    setTimeout(() => errDiv.scrollIntoView({ behavior:'smooth', block:'center' }), 50);
    }
    function clearInlineError() {
    const e = document.getElementById('dynamic-form-error');
    if (e) e.style.display = 'none';
    }

    /* ── Load existing event data ─────────────────────── */
    async function loadEvent() {
    try {
        const res  = await fetch(`/api/admin/events/${eventId}`, {
        headers: { 'Authorization': 'Bearer ' + adminToken },
        });
        const data = await res.json();
        if (!res.ok) { alert(data.error || 'Failed to load event.'); window.location.href = 'admin_dashboard.html'; return; }

        // Populate fields
        document.getElementById('event-title').value       = data.title || '';
        document.getElementById('event-date').value        = data.date ? data.date.split('T')[0] : '';
        document.getElementById('start-time').value        = data.start_time ? data.start_time.slice(0,5) : '';
        document.getElementById('end-time').value          = data.end_time   ? data.end_time.slice(0,5)   : '';
        document.getElementById('event-description').value = data.description || '';
        document.getElementById('event-capacity').value    = data.capacity || '';

        // Show current image note if one exists
        const imgNote = document.getElementById('current-image-note');
        if (imgNote && data.image_url) {
        imgNote.textContent = '✅ Current image: ' + data.image_url.split('/').pop();
        }

        // Location select
        const locSel = document.getElementById('event-location');
        if (data.location) {
        for (const opt of locSel.options) {
            if (opt.value === data.location) { opt.selected = true; break; }
        }
        }

        // Category select
        const catSel = document.getElementById('event-category');
        if (data.category) {
        for (const opt of catSel.options) {
            if (opt.value === data.category) { opt.selected = true; break; }
        }
        }

        // Colleges
        const colleges = Array.isArray(data.target_colleges) ? data.target_colleges : [];
        if (colleges.includes('All')) {
        collegeAll.checked = true;
        } else {
        specificCollegeChecks.forEach(cb => { cb.checked = colleges.includes(cb.value); });
        }
        updateCollegePillState();

        // Year levels
        const years = Array.isArray(data.target_years) ? data.target_years : [];
        if (years.includes('All')) {
        yearAll.checked = true;
        } else {
        specificYearChecks.forEach(cb => { cb.checked = years.includes(cb.value); });
        }
        updateYearPillState();

    } catch (err) {
        alert('Could not reach the server.');
        window.location.href = 'admin_dashboard.html';
    }
    }

    /* ── Submit ──────────────────────────────────────── */
    const form       = document.getElementById('edit-event-form');
    const publishBtn = form?.querySelector('.btn-publish');

    form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const title    = document.getElementById('event-title').value.trim();
    const date     = document.getElementById('event-date').value;
    const startTime= document.getElementById('start-time').value;
    const endTime  = document.getElementById('end-time').value;
    const location = document.getElementById('event-location').value;
    const desc     = document.getElementById('event-description').value.trim();
    const category = document.getElementById('event-category').value;
    const capacity = document.getElementById('event-capacity').value;
    const colleges = getSelectedColleges();
    const years    = getSelectedYears();

    if (!title)    { showInlineError('❌ Please provide an event title.'); return; }
    if (!date)     { showInlineError('❌ Select a valid event date.'); return; }
    if (!startTime || !endTime) { showInlineError('❌ Fill in both start and end time.'); return; }
    if (!location) { showInlineError('❌ Choose a venue / location.'); return; }
    if (!desc)     { showInlineError('❌ Event description is required.'); return; }
    if (!category) { showInlineError('❌ Please select an event category.'); return; }
    if (!capacity || capacity < 1 || capacity > 300) { showInlineError('❌ Capacity must be between 1 and 300.'); return; }
    if (!colleges.length) { showInlineError('🎯 Select at least one target college (or "All Colleges").'); return; }
    if (!years.length)    { showInlineError('📆 Select at least one target year level (or "All Years").'); return; }

    clearInlineError();

    publishBtn.innerHTML = 'Saving…';
    publishBtn.style.opacity = '0.7';
    publishBtn.style.pointerEvents = 'none';

    try {
        const formData = new FormData();
        formData.append('title',           title);
        formData.append('date',            date);
        formData.append('start_time',      startTime);
        formData.append('end_time',        endTime);
        formData.append('location',        location);
        formData.append('description',     desc);
        formData.append('category',        category);
        formData.append('capacity',        String(parseInt(capacity, 10)));
        formData.append('target_colleges', JSON.stringify(colleges));
        formData.append('target_years',    JSON.stringify(years));

        const imageFile = document.getElementById('event-image').files[0];
        if (imageFile) formData.append('event_image', imageFile);

        const res  = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + adminToken },
        body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
        showInlineError(data.error || 'Failed to save changes.');
        publishBtn.innerHTML = 'Save Changes →';
        publishBtn.style.opacity = '';
        publishBtn.style.pointerEvents = '';
        return;
        }
        alert('✅ Event updated successfully! Redirecting to dashboard…');
        window.location.href = 'admin_dashboard.html';
    } catch {
        showInlineError('Could not reach the server. Is it running?');
        publishBtn.innerHTML = 'Save Changes →';
        publishBtn.style.opacity = '';
        publishBtn.style.pointerEvents = '';
    }
    });

    loadEvent();
    })();