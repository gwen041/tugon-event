/* ── Student Login ──────────────────────────────────── */
const loginForm = document.getElementById('login-form');
if (loginForm) {
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    submitBtn.textContent = 'Logging in…';
    submitBtn.disabled    = true;
    try {
        const res  = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
        alert(data.error || 'Login failed.');
        submitBtn.textContent = 'Log In →';
        submitBtn.disabled    = false;
        return;
        }
        localStorage.setItem('tugon_token',   data.token);
        localStorage.setItem('tugon_student',  JSON.stringify(data.student));
        window.location.href = 'home.html';
    } catch {
        alert('Could not reach the server. Please make sure it is running.');
        submitBtn.textContent = 'Log In →';
        submitBtn.disabled    = false;
    }
    });
}

/* ── Secret Admin Portal Trigger (5 clicks on dot) ─── */
(function () {
    let clickCount = 0, clickTimer = null;
    const trigger  = document.getElementById('admin-trigger');
    const modal    = document.getElementById('admin-modal');
    const closeBtn = document.getElementById('close-admin-modal');

    if (trigger) {
    trigger.addEventListener('click', () => {
        clickCount++;
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => { clickCount = 0; }, 2000);
        if (clickCount === 5) {
        clickCount = 0;
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        }
    });
    }
    if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    });
    }

    /* ── Admin Login ────────────────────────────────── */
    const adminForm = document.getElementById('admin-login-form');
    if (adminForm) {
    const adminBtn = adminForm.querySelector('button[type="submit"]');
    adminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('admin-username').value.trim();
        const password = document.getElementById('admin-password').value;
        adminBtn.textContent = 'Signing in…';
        adminBtn.disabled    = true;
        try {
        const res  = await fetch('/api/admin/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) {
            alert(data.error || 'Invalid administrator credentials.');
            adminBtn.textContent = 'Sign In as Admin →';
            adminBtn.disabled    = false;
            return;
        }
        localStorage.setItem('tugon_admin_token', data.token);
        localStorage.setItem('tugon_admin',       JSON.stringify(data.admin));
        window.location.href = 'admin_dashboard.html';
        } catch {
        alert('Could not reach the server.');
        adminBtn.textContent = 'Sign In as Admin →';
        adminBtn.disabled    = false;
        }
    });
    }
})();