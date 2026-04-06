const APP_URL = '__APP_URL__';

const loggedOutEl = document.getElementById('logged-out')!;
const loggedInEl = document.getElementById('logged-in')!;
const userEmailEl = document.getElementById('user-email')!;
const emailInput = document.getElementById('email') as HTMLInputElement;
const passwordInput = document.getElementById('password') as HTMLInputElement;
const signinBtn = document.getElementById('signin-btn') as HTMLButtonElement;
const signoutBtn = document.getElementById('signout-btn')!;
const dashboardBtn = document.getElementById('dashboard-btn') as HTMLAnchorElement;
const signupLink = document.getElementById('signup-link') as HTMLAnchorElement;
const errorEl = document.getElementById('error')!;

dashboardBtn.href = `${APP_URL}/dashboard`;
signupLink.href = `${APP_URL}/signup`;

function showError(msg: string) {
  errorEl.textContent = msg;
  errorEl.style.display = 'block';
}

function showLoggedIn(email: string) {
  userEmailEl.textContent = email;
  loggedInEl.style.display = 'block';
  loggedOutEl.style.display = 'none';
}

function showLoggedOut() {
  loggedInEl.style.display = 'none';
  loggedOutEl.style.display = 'block';
}

[dashboardBtn, signupLink].forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: btn.href });
    window.close();
  });
});

signinBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) { showError('Enter your email and password.'); return; }

  signinBtn.disabled = true;
  signinBtn.textContent = 'Signing in...';
  errorEl.style.display = 'none';

  chrome.runtime.sendMessage({ type: 'SIGN_IN', email, password }, (response) => {
    signinBtn.disabled = false;
    signinBtn.textContent = 'Sign in';
    if (response?.ok) {
      showLoggedIn(email);
    } else {
      showError(response?.error ?? 'Sign in failed. Check your credentials.');
    }
  });
});

passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') signinBtn.click();
});

signoutBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'SIGN_OUT' }, () => showLoggedOut());
});

// Check current auth status on open
chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (response) => {
  if (response?.loggedIn) {
    showLoggedIn(response.email ?? '');
  } else {
    showLoggedOut();
  }
});
