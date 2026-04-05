const APP_URL = '__APP_URL__';

const loggedOutEl = document.getElementById('logged-out')!;
const loggedInEl = document.getElementById('logged-in')!;
const userEmailEl = document.getElementById('user-email')!;
const signinBtn = document.getElementById('signin-btn') as HTMLAnchorElement;
const dashboardBtn = document.getElementById('dashboard-btn') as HTMLAnchorElement;
const signoutBtn = document.getElementById('signout-btn')!;

signinBtn.href = `${APP_URL}/login`;
dashboardBtn.href = `${APP_URL}/dashboard`;

// Open links in new tab instead of popup
[signinBtn, dashboardBtn].forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: btn.href });
    window.close();
  });
});

signoutBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'SIGN_OUT' }, () => {
    loggedInEl.style.display = 'none';
    loggedOutEl.style.display = 'block';
  });
});

// Check auth status
chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (response) => {
  if (response?.loggedIn) {
    userEmailEl.textContent = response.email ?? '';
    loggedInEl.style.display = 'block';
    loggedOutEl.style.display = 'none';
  } else {
    loggedOutEl.style.display = 'block';
    loggedInEl.style.display = 'none';
  }
});
