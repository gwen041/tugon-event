(function() {
    // ========== 1. MUTUAL EXCLUSION LOGIC: "All Colleges" / specific colleges ==========
    const collegeAll = document.getElementById('college-all');
    const allCollegeChecks = document.querySelectorAll('.college-check');
    const specificCollegeChecks = Array.from(allCollegeChecks).filter(cb => cb.value !== 'All');

    const yearAll = document.getElementById('year-all');
    const allYearChecks = document.querySelectorAll('.year-check');
    const specificYearChecks = Array.from(allYearChecks).filter(cb => cb.value !== 'All');

    // Helper: update visual disabled class for pills
    function updateCollegePillState() {
    if (collegeAll.checked) {
        specificCollegeChecks.forEach(cb => {
        cb.checked = false;
        const parentLabel = cb.closest('.pill-checkbox');
        if (parentLabel) parentLabel.classList.add('disabled');
        });
    } else {
        specificCollegeChecks.forEach(cb => {
        const parentLabel = cb.closest('.pill-checkbox');
        if (parentLabel) parentLabel.classList.remove('disabled');
        });
    }
    }

    function updateYearPillState() {
    if (yearAll.checked) {
        specificYearChecks.forEach(cb => {
        cb.checked = false;
        const parentLabel = cb.closest('.pill-checkbox');
        if (parentLabel) parentLabel.classList.add('disabled');
        });
    } else {
        specificYearChecks.forEach(cb => {
        const parentLabel = cb.closest('.pill-checkbox');
        if (parentLabel) parentLabel.classList.remove('disabled');
        });
    }
    }

    // College listeners
    if (collegeAll) {
    collegeAll.addEventListener('change', () => {
        if (collegeAll.checked) {
        specificCollegeChecks.forEach(cb => cb.checked = false);
        }
        updateCollegePillState();
    });
    specificCollegeChecks.forEach(cb => {
        cb.addEventListener('change', () => {
        if (cb.checked) {
            collegeAll.checked = false;
        }
        updateCollegePillState();
        });
    });
    }

    // Year listeners
    if (yearAll) {
    yearAll.addEventListener('change', () => {
        if (yearAll.checked) {
        specificYearChecks.forEach(cb => cb.checked = false);
        }
        updateYearPillState();
    });
    specificYearChecks.forEach(cb => {
        cb.addEventListener('change', () => {
        if (cb.checked) {
            yearAll.checked = false;
        }
        updateYearPillState();
        });
    });
    }

    // initial sync
    updateCollegePillState();
    updateYearPillState();

    // ========== 2. FORM SUBMIT HANDLER (keep original fields + new multi-checkbox targeting) ==========
    const form = document.getElementById('create-event-form');
    const publishBtn = form?.querySelector('.btn-publish');

    function getSelectedColleges() {
    const checked = Array.from(allCollegeChecks).filter(cb => cb.checked).map(cb => cb.value);
    if (checked.includes('All')) return ['All'];
    return checked;
    }

    function getSelectedYears() {
    const checked = Array.from(allYearChecks).filter(cb => cb.checked).map(cb => cb.value);
    if (checked.includes('All')) return ['All'];
    return checked;
    }

    function showInlineError(message) {
    // remove any existing temporary message
    let errDiv = document.getElementById('dynamic-form-error');
    if (!errDiv) {
        errDiv = document.createElement('div');
        errDiv.id = 'dynamic-form-error';
        errDiv.style.margin = '0 0 1rem 0';
        errDiv.style.padding = '0.8rem 1.2rem';
        errDiv.style.borderRadius = '12px';
        errDiv.style.backgroundColor = 'rgba(220, 38, 38, 0.15)';
        errDiv.style.border = '1px solid rgba(239, 68, 68, 0.4)';
        errDiv.style.color = '#fca5a5';
        errDiv.style.fontWeight = '500';
        const formContainer = document.querySelector('.admin-form');
        if (formContainer && formContainer.firstChild) {
        formContainer.insertBefore(errDiv, formContainer.firstChild);
        } else if (formContainer) {
        formContainer.prepend(errDiv);
        }
    }
    errDiv.textContent = message;
    errDiv.style.display = 'block';
    setTimeout(() => errDiv.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    }

    function clearInlineError() {
    const errDiv = document.getElementById('dynamic-form-error');
    if (errDiv) errDiv.style.display = 'none';
    }

    function validateAllFields() {
    const title = document.getElementById('event-title').value.trim();
    const date = document.getElementById('event-date').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const location = document.getElementById('event-location').value;
    const description = document.getElementById('event-description').value.trim();
    const category = document.getElementById('event-category').value;
    const capacity = document.getElementById('event-capacity').value;

    if (!title) { showInlineError('❌ Please provide an event title.'); return false; }
    if (!date) { showInlineError('❌ Select a valid event date.'); return false; }
    if (!startTime || !endTime) { showInlineError('❌ Fill in both start and end time.'); return false; }
    if (!location) { showInlineError('❌ Choose a venue / location.'); return false; }
    if (!description) { showInlineError('❌ Event description is required.'); return false; }
    if (!category) { showInlineError('❌ Please select an event category.'); return false; }
    if (!capacity || capacity < 1 || capacity > 300) { showInlineError('❌ Capacity must be between 1 and 300.'); return false; }

    const colleges = getSelectedColleges();
    const years = getSelectedYears();
    if (colleges.length === 0) { showInlineError('🎯 Select at least one target college (or "All Colleges").'); return false; }
    if (years.length === 0) { showInlineError('📆 Select at least one target year level (or "All Years").'); return false; }

    clearInlineError();
    return true;
    }

    form.addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!validateAllFields()) return;

    // gather final event data
    const colleges = getSelectedColleges();
    const years = getSelectedYears();
    const eventPayload = {
        title: document.getElementById('event-title').value.trim(),
        date: document.getElementById('event-date').value,
        start_time: document.getElementById('start-time').value,
        end_time: document.getElementById('end-time').value,
        location: document.getElementById('event-location').value,
        description: document.getElementById('event-description').value.trim(),
        category: document.getElementById('event-category').value,
        capacity: parseInt(document.getElementById('event-capacity').value, 10),
        target_colleges: colleges,
        target_years: years,
    };

    /* ── Real API call ─────────────────────────────── */
    const adminToken = localStorage.getItem('tugon_admin_token');
    if (!adminToken) { window.location.href = 'login.html'; return; }

    if (publishBtn) {
        publishBtn.innerHTML = 'Publishing…';
        publishBtn.style.opacity = '0.7';
        publishBtn.style.pointerEvents = 'none';
    }

    try {
        /* Use FormData so we can optionally include an image file */
        const formData = new FormData();
        formData.append('title',           document.getElementById('event-title').value.trim());
        formData.append('date',            document.getElementById('event-date').value);
        formData.append('start_time',      document.getElementById('start-time').value);
        formData.append('end_time',        document.getElementById('end-time').value);
        formData.append('location',        document.getElementById('event-location').value);
        formData.append('description',     document.getElementById('event-description').value.trim());
        formData.append('category',        document.getElementById('event-category').value);
        formData.append('capacity',        document.getElementById('event-capacity').value);
        formData.append('target_colleges', JSON.stringify(colleges));
        formData.append('target_years',    JSON.stringify(years));

        const imageFile = document.getElementById('event-image').files[0];
        if (imageFile) formData.append('event_image', imageFile);

        const res  = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + adminToken },
        /* NOTE: do NOT set Content-Type here; browser sets multipart boundary */
        body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
        showInlineError(data.error || 'Failed to publish event.');
        publishBtn.innerHTML = 'Publish Event →';
        publishBtn.style.opacity = '';
        publishBtn.style.pointerEvents = '';
        return;
        }
        alert('✅ Event published successfully! Redirecting to dashboard…');
        window.location.href = 'admin_dashboard.html';
    } catch {
        showInlineError('Could not reach the server. Is it running?');
        publishBtn.innerHTML = 'Publish Event →';
        publishBtn.style.opacity = '';
        publishBtn.style.pointerEvents = '';
    }
    });

    // optional: attach to any dynamic recheck
    })();