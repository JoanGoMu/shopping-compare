"use strict";
(() => {
  // src/popup.ts
  var APP_URL = "https://comparecart.app";
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
})();
