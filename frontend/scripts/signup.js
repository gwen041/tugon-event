/* ── Cascade: College → Course → Major ──────────────── */
const COURSES = {
    'Computer Studies': ['BS in Computer Science', 'BS in Information Technology'],
    'Education':        ['Bachelor in Elementary Education (BEEd)', 'Bachelor in Secondary Education (BSEd)'],
};

const collegeEl = document.getElementById('signup-college');
const courseEl  = document.getElementById('signup-course');
const majorEl   = document.getElementById('signup-major');
const courseRow = document.getElementById('course-row');
const majorRow  = document.getElementById('major-row');

collegeEl.addEventListener('change', function () {
    const opts = COURSES[this.value];
    courseEl.innerHTML = '<option value="">-- Select Course --</option>';
    courseEl.required  = false;
    majorEl.required   = false;
    courseRow.classList.remove('visible');
    majorRow.classList.remove('visible');
    if (opts) {
    opts.forEach(c => {
        const o = document.createElement('option');
        o.value = o.textContent = c;
        courseEl.appendChild(o);
    });
    courseEl.required = true;
    courseRow.classList.add('visible');
    }
});

courseEl.addEventListener('change', function () {
    majorEl.required = false;
    majorRow.classList.remove('visible');
    if (this.value === 'Bachelor in Secondary Education (BSEd)') {
    majorEl.required = true;
    majorRow.classList.add('visible');
    }
});

/* ── Student ID: only digits and hyphens ─────────────── */
document.getElementById('signup-studentid').addEventListener('input', function () {
    this.value = this.value.replace(/[^0-9-]/g, '');
});

/* ── Signup form submission → real API ───────────────── */
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    const submitBtn = signupForm.querySelector('button[type="submit"]');
    signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.textContent = 'Creating account…';
    submitBtn.disabled    = true;

    const payload = {
        first_name: document.getElementById('signup-fname').value.trim(),
        last_name:  document.getElementById('signup-lname').value.trim(),
        email:      document.getElementById('signup-email').value.trim(),
        password:   document.getElementById('signup-password').value,
        student_id: document.getElementById('signup-studentid').value.trim(),
        college:    document.getElementById('signup-college').value,
        course:     document.getElementById('signup-course').value  || null,
        major:      document.getElementById('signup-major').value   || null,
        year_level: document.getElementById('signup-year').value,
    };

    /* Front-end validations */
    if (!payload.email.toLowerCase().endsWith('@plpasig.edu.ph')) {
        alert('Email must end with @plpasig.edu.ph (e.g. juandelacruz@plpasig.edu.ph).');
        submitBtn.textContent = 'Sign Up \u2192';
        submitBtn.disabled    = false;
        return;
    }
    if (!/^[0-9-]+$/.test(payload.student_id)) {
        alert('Student ID must contain only numbers (e.g. 2024-00001).');
        submitBtn.textContent = 'Sign Up \u2192';
        submitBtn.disabled    = false;
        return;
    }

    try {
        const res  = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
        alert(data.error || 'Sign-up failed. Please try again.');
        submitBtn.textContent = 'Sign Up \u2192';
        submitBtn.disabled    = false;
        return;
        }
        alert('Account created! You can now log in.');
        window.location.href = 'login.html';
    } catch {
        alert('Could not reach the server. Please make sure it is running.');
        submitBtn.textContent = 'Sign Up \u2192';
        submitBtn.disabled    = false;
    }
    });
}