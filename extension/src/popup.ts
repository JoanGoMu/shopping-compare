const APP_URL = '__APP_URL__';
const UI_PREFS_KEY = 'ui_prefs';

interface UiPrefs {
  hiddenDomains: string[];
  saveButtonPos: { top: number; left: number } | null;
}

function getDefaultPrefs(): UiPrefs {
  return { hiddenDomains: [], saveButtonPos: null };
}

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

// Prefs elements
const hideSiteRow = document.getElementById('hide-site-row')!;
const hideSiteToggle = document.getElementById('hide-site-toggle') as HTMLInputElement;
const hideSiteLabel = document.getElementById('hide-site-label')!;
const hiddenSitesSection = document.getElementById('hidden-sites-section')!;
const hiddenSitesList = document.getElementById('hidden-sites-list')!;
const resetPositionBtn = document.getElementById('reset-position-btn') as HTMLButtonElement;

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

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

function renderHiddenSites(prefs: UiPrefs) {
  if (prefs.hiddenDomains.length === 0) {
    hiddenSitesSection.style.display = 'none';
    return;
  }
  hiddenSitesSection.style.display = 'block';
  hiddenSitesList.innerHTML = '';
  for (const domain of prefs.hiddenDomains) {
    const li = document.createElement('li');
    const nameSpan = document.createElement('span');
    nameSpan.textContent = domain;
    const showBtn = document.createElement('button');
    showBtn.textContent = 'Show';
    showBtn.className = 'show-site-btn';
    showBtn.addEventListener('click', () => {
      chrome.storage.local.get(UI_PREFS_KEY, (d) => {
        const p: UiPrefs = (d[UI_PREFS_KEY] as UiPrefs) ?? getDefaultPrefs();
        p.hiddenDomains = p.hiddenDomains.filter(h => h !== domain);
        chrome.storage.local.set({ [UI_PREFS_KEY]: p }, () => renderHiddenSites(p));
      });
    });
    li.appendChild(nameSpan);
    li.appendChild(showBtn);
    hiddenSitesList.appendChild(li);
  }
}

async function initPrefs() {
  // Get current tab's hostname using activeTab permission
  const hostname = await new Promise<string | null>((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url;
      if (!url) { resolve(null); return; }
      try {
        const parsed = new URL(url);
        resolve(parsed.protocol.startsWith('http') ? parsed.hostname : null);
      } catch {
        resolve(null);
      }
    });
  });

  // Load prefs from storage
  const data = await new Promise<Record<string, unknown>>((resolve) => {
    chrome.storage.local.get(UI_PREFS_KEY, resolve as (items: Record<string, unknown>) => void);
  });
  const prefs: UiPrefs = (data[UI_PREFS_KEY] as UiPrefs) ?? getDefaultPrefs();

  // "Hide on this site" toggle
  if (hostname) {
    hideSiteToggle.disabled = false;
    hideSiteToggle.checked = prefs.hiddenDomains.includes(hostname);
    hideSiteLabel.textContent = `Hide button on ${hostname}`;

    hideSiteToggle.addEventListener('change', () => {
      chrome.storage.local.get(UI_PREFS_KEY, (d) => {
        const p: UiPrefs = (d[UI_PREFS_KEY] as UiPrefs) ?? getDefaultPrefs();
        if (hideSiteToggle.checked) {
          if (!p.hiddenDomains.includes(hostname)) p.hiddenDomains.push(hostname);
        } else {
          p.hiddenDomains = p.hiddenDomains.filter(h => h !== hostname);
        }
        chrome.storage.local.set({ [UI_PREFS_KEY]: p }, () => renderHiddenSites(p));
      });
    });
  } else {
    hideSiteRow.classList.add('disabled');
    hideSiteToggle.disabled = true;
    hideSiteLabel.textContent = 'Hide button on this site';
  }

  // Hidden sites list
  renderHiddenSites(prefs);

  // Reset position button
  resetPositionBtn.disabled = !prefs.saveButtonPos;
  resetPositionBtn.addEventListener('click', () => {
    chrome.storage.local.get(UI_PREFS_KEY, (d) => {
      const p: UiPrefs = (d[UI_PREFS_KEY] as UiPrefs) ?? getDefaultPrefs();
      p.saveButtonPos = null;
      chrome.storage.local.set({ [UI_PREFS_KEY]: p }, () => {
        resetPositionBtn.disabled = true;
      });
    });
  });
}

initPrefs();
