"use strict";
(() => {
  // src/popup.ts
  var APP_URL = "http://localhost:3000";
  var loggedOutEl = document.getElementById("logged-out");
  var loggedInEl = document.getElementById("logged-in");
  var userEmailEl = document.getElementById("user-email");
  var signinBtn = document.getElementById("signin-btn");
  var dashboardBtn = document.getElementById("dashboard-btn");
  var signoutBtn = document.getElementById("signout-btn");
  signinBtn.href = `${APP_URL}/login`;
  dashboardBtn.href = `${APP_URL}/dashboard`;
  [signinBtn, dashboardBtn].forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: btn.href });
      window.close();
    });
  });
  signoutBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "SIGN_OUT" }, () => {
      loggedInEl.style.display = "none";
      loggedOutEl.style.display = "block";
    });
  });
  chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" }, (response) => {
    if (response?.loggedIn) {
      userEmailEl.textContent = response.email ?? "";
      loggedInEl.style.display = "block";
      loggedOutEl.style.display = "none";
    } else {
      loggedOutEl.style.display = "block";
      loggedInEl.style.display = "none";
    }
  });
})();
