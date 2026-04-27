"use strict";
(() => {
  // src/popup.ts
  var APP_URL = "https://comparecart.app";
  var UI_PREFS_KEY = "ui_prefs";
  function getDefaultPrefs() {
    return { hiddenDomains: [], saveButtonPos: null };
  }
  var loggedOutEl = document.getElementById("logged-out");
  var loggedInEl = document.getElementById("logged-in");
  var userEmailEl = document.getElementById("user-email");
  var emailInput = document.getElementById("email");
  var passwordInput = document.getElementById("password");
  var signinBtn = document.getElementById("signin-btn");
  var signoutBtn = document.getElementById("signout-btn");
  var dashboardBtn = document.getElementById("dashboard-btn");
  var signupLink = document.getElementById("signup-link");
  var errorEl = document.getElementById("error");
  var hideSiteRow = document.getElementById("hide-site-row");
  var hideSiteToggle = document.getElementById("hide-site-toggle");
  var hideSiteLabel = document.getElementById("hide-site-label");
  var hiddenSitesSection = document.getElementById("hidden-sites-section");
  var hiddenSitesList = document.getElementById("hidden-sites-list");
  var resetPositionBtn = document.getElementById("reset-position-btn");
  dashboardBtn.href = `${APP_URL}/dashboard`;
  signupLink.href = `${APP_URL}/signup`;
  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = "block";
  }
  function showLoggedIn(email) {
    userEmailEl.textContent = email;
    loggedInEl.style.display = "block";
    loggedOutEl.style.display = "none";
  }
  function showLoggedOut() {
    loggedInEl.style.display = "none";
    loggedOutEl.style.display = "block";
  }
  [dashboardBtn, signupLink].forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: btn.href });
      window.close();
    });
  });
  signinBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
      showError("Enter your email and password.");
      return;
    }
    signinBtn.disabled = true;
    signinBtn.textContent = "Signing in...";
    errorEl.style.display = "none";
    chrome.runtime.sendMessage({ type: "SIGN_IN", email, password }, (response) => {
      signinBtn.disabled = false;
      signinBtn.textContent = "Sign in";
      if (response?.ok) {
        showLoggedIn(email);
      } else {
        showError(response?.error ?? "Sign in failed. Check your credentials.");
      }
    });
  });
  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") signinBtn.click();
  });
  signoutBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "SIGN_OUT" }, () => showLoggedOut());
  });
  chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" }, (response) => {
    if (response?.loggedIn) {
      showLoggedIn(response.email ?? "");
    } else {
      showLoggedOut();
    }
  });
  function renderHiddenSites(prefs) {
    if (prefs.hiddenDomains.length === 0) {
      hiddenSitesSection.style.display = "none";
      return;
    }
    hiddenSitesSection.style.display = "block";
    hiddenSitesList.innerHTML = "";
    for (const domain of prefs.hiddenDomains) {
      const li = document.createElement("li");
      const nameSpan = document.createElement("span");
      nameSpan.textContent = domain;
      const showBtn = document.createElement("button");
      showBtn.textContent = "Show";
      showBtn.className = "show-site-btn";
      showBtn.addEventListener("click", () => {
        chrome.storage.local.get(UI_PREFS_KEY, (d) => {
          const p = d[UI_PREFS_KEY] ?? getDefaultPrefs();
          p.hiddenDomains = p.hiddenDomains.filter((h) => h !== domain);
          chrome.storage.local.set({ [UI_PREFS_KEY]: p }, () => renderHiddenSites(p));
        });
      });
      li.appendChild(nameSpan);
      li.appendChild(showBtn);
      hiddenSitesList.appendChild(li);
    }
  }
  async function initPrefs() {
    const hostname = await new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0]?.url;
        if (!url) {
          resolve(null);
          return;
        }
        try {
          const parsed = new URL(url);
          resolve(parsed.protocol.startsWith("http") ? parsed.hostname : null);
        } catch {
          resolve(null);
        }
      });
    });
    const data = await new Promise((resolve) => {
      chrome.storage.local.get(UI_PREFS_KEY, resolve);
    });
    const prefs = data[UI_PREFS_KEY] ?? getDefaultPrefs();
    if (hostname) {
      hideSiteToggle.disabled = false;
      hideSiteToggle.checked = prefs.hiddenDomains.includes(hostname);
      hideSiteLabel.textContent = `Hide button on ${hostname}`;
      hideSiteToggle.addEventListener("change", () => {
        chrome.storage.local.get(UI_PREFS_KEY, (d) => {
          const p = d[UI_PREFS_KEY] ?? getDefaultPrefs();
          if (hideSiteToggle.checked) {
            if (!p.hiddenDomains.includes(hostname)) p.hiddenDomains.push(hostname);
          } else {
            p.hiddenDomains = p.hiddenDomains.filter((h) => h !== hostname);
          }
          chrome.storage.local.set({ [UI_PREFS_KEY]: p }, () => renderHiddenSites(p));
        });
      });
    } else {
      hideSiteRow.classList.add("disabled");
      hideSiteToggle.disabled = true;
      hideSiteLabel.textContent = "Hide button on this site";
    }
    renderHiddenSites(prefs);
    resetPositionBtn.disabled = !prefs.saveButtonPos;
    resetPositionBtn.addEventListener("click", () => {
      chrome.storage.local.get(UI_PREFS_KEY, (d) => {
        const p = d[UI_PREFS_KEY] ?? getDefaultPrefs();
        p.saveButtonPos = null;
        chrome.storage.local.set({ [UI_PREFS_KEY]: p }, () => {
          resetPositionBtn.disabled = true;
        });
      });
    });
  }
  initPrefs();
})();
