"use strict";
(() => {
  // src/extractor.ts
  function getMetaContent(property) {
    return document.querySelector(`meta[property="${property}"]`)?.content ?? document.querySelector(`meta[name="${property}"]`)?.content ?? null;
  }
  function parsePrice(raw) {
    if (raw == null) return { price: null, currency: "USD" };
    if (typeof raw === "number") return { price: raw, currency: "USD" };
    const cleaned = String(raw).replace(/[^0-9.,]/g, "").replace(",", ".");
    const price = parseFloat(cleaned);
    return { price: isNaN(price) ? null : price, currency: "USD" };
  }
  function extractFromJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent ?? "");
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const type = item["@type"];
          if (!type) continue;
          const isProduct = type === "Product" || Array.isArray(type) && type.includes("Product");
          if (!isProduct) continue;
          const offer = item.offers?.["@type"] === "Offer" ? item.offers : item.offers?.[0];
          const { price, currency } = parsePrice(offer?.price);
          return {
            name: item.name ?? null,
            price,
            currency: offer?.priceCurrency ?? currency,
            image_url: typeof item.image === "string" ? item.image : item.image?.[0] ?? null
          };
        }
      } catch {
      }
    }
    return null;
  }
  function extractFromOpenGraph() {
    return {
      name: getMetaContent("og:title") ?? document.title ?? "",
      image_url: getMetaContent("og:image"),
      price: (() => {
        const raw = getMetaContent("product:price:amount") ?? getMetaContent("og:price:amount");
        return raw ? parsePrice(raw).price : null;
      })(),
      currency: getMetaContent("product:price:currency") ?? getMetaContent("og:price:currency") ?? "USD"
    };
  }
  var STORE_EXTRACTORS = {
    "amazon.com": () => ({
      name: document.querySelector("#productTitle")?.textContent?.trim() ?? null,
      price: (() => {
        const whole = document.querySelector(".a-price-whole")?.textContent?.replace(/[^0-9]/g, "");
        const frac = document.querySelector(".a-price-fraction")?.textContent?.replace(/[^0-9]/g, "");
        if (!whole) return null;
        return parseFloat(`${whole}.${frac ?? "0"}`);
      })(),
      currency: "USD",
      image_url: document.querySelector("#landingImage, #imgTagWrapperId img")?.src ?? null,
      specs: (() => {
        const specs = {};
        document.querySelectorAll("#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr").forEach((row) => {
          const cells = row.querySelectorAll("td, th");
          if (cells.length >= 2) {
            const key = cells[0].textContent?.trim().replace(/\s+/g, " ") ?? "";
            const val = cells[1].textContent?.trim().replace(/\s+/g, " ") ?? "";
            if (key && val && key.length < 60) specs[key] = val;
          }
        });
        return specs;
      })()
    }),
    "ebay.com": () => ({
      name: document.querySelector("#itemTitle")?.textContent?.replace("Details about\xA0", "").trim() ?? document.querySelector(".x-item-title__mainTitle")?.textContent?.trim() ?? null,
      price: (() => {
        const raw = document.querySelector('[itemprop="price"]')?.getAttribute("content") ?? document.querySelector(".x-price-primary .ux-textspans")?.textContent;
        return raw ? parsePrice(raw).price : null;
      })(),
      currency: "USD",
      image_url: document.querySelector(".ux-image-carousel img, #icImg")?.src ?? null
    }),
    "aliexpress.com": () => ({
      name: document.querySelector(".title--wrap--UUHae_g h1")?.textContent?.trim() ?? null,
      price: (() => {
        const raw = document.querySelector(".price--current--I3Zeidd")?.textContent;
        return raw ? parsePrice(raw).price : null;
      })(),
      currency: "USD",
      image_url: document.querySelector(".slider--img--K0YbWQO img")?.src ?? null
    }),
    "etsy.com": () => ({
      name: document.querySelector("h1[data-buy-box-listing-title]")?.textContent?.trim() ?? null,
      price: (() => {
        const raw = document.querySelector('[data-selector="price-only"]')?.textContent;
        return raw ? parsePrice(raw).price : null;
      })(),
      currency: "USD",
      image_url: document.querySelector("[data-carousel-first-image]")?.src ?? null
    })
  };
  function getStoreDomain() {
    return window.location.hostname.replace("www.", "");
  }
  function getStoreName(domain) {
    const parts = domain.split(".");
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  function extractProduct() {
    const domain = getStoreDomain();
    const storeName = getStoreName(domain);
    const productUrl = window.location.href;
    const jsonLd = extractFromJsonLd() ?? {};
    const og = extractFromOpenGraph();
    const storeKey = Object.keys(STORE_EXTRACTORS).find((k) => domain.includes(k));
    const storeData = storeKey ? STORE_EXTRACTORS[storeKey]() : {};
    const merged = {
      name: storeData.name ?? jsonLd.name ?? og.name ?? document.title ?? "Unknown product",
      price: storeData.price ?? jsonLd.price ?? og.price ?? null,
      currency: storeData.currency ?? jsonLd.currency ?? og.currency ?? "USD",
      image_url: storeData.image_url ?? jsonLd.image_url ?? og.image_url ?? null,
      product_url: productUrl,
      store_name: storeName,
      store_domain: domain,
      specs: storeData.specs ?? {}
    };
    merged.name = merged.name.trim().slice(0, 300);
    return merged;
  }

  // src/content.ts
  var BUTTON_ID = "comparecart-save-btn";
  function isLikelyProductPage() {
    const hasJsonLd = !!document.querySelector('script[type="application/ld+json"]');
    const hasOgProduct = !!document.querySelector('meta[property="og:type"][content="product"]');
    const hasPriceText = /\$[\d,]+\.?\d{0,2}|€[\d,]+\.?\d{0,2}|£[\d,]+/.test(document.body.innerText.slice(0, 5e3));
    return hasJsonLd || hasOgProduct || hasPriceText;
  }
  function createButton() {
    const btn = document.createElement("button");
    btn.id = BUTTON_ID;
    btn.textContent = "\u{1F6D2} Save to Compare";
    btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 100px;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4);
    transition: all 0.15s ease;
    line-height: 1;
    white-space: nowrap;
  `;
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#4338ca";
      btn.style.transform = "scale(1.03)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "#4f46e5";
      btn.style.transform = "scale(1)";
    });
    return btn;
  }
  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: ${type === "success" ? "#059669" : "#dc2626"};
    color: white;
    border-radius: 12px;
    padding: 12px 18px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    animation: ccFadeIn 0.2s ease;
    max-width: 300px;
  `;
    const style = document.createElement("style");
    style.textContent = `@keyframes ccFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`;
    document.head.appendChild(style);
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3e3);
  }
  async function handleSave(btn) {
    btn.textContent = "Saving...";
    btn.style.opacity = "0.7";
    const product = extractProduct();
    chrome.runtime.sendMessage({ type: "SAVE_PRODUCT", product }, (response) => {
      btn.textContent = "\u{1F6D2} Save to Compare";
      btn.style.opacity = "1";
      if (chrome.runtime.lastError || !response?.ok) {
        const msg = response?.error ?? chrome.runtime.lastError?.message ?? "Unknown error";
        if (msg.includes("not logged in") || msg.includes("JWT")) {
          showToast("Sign in to CompareCart to save products", "error");
        } else {
          showToast("Failed to save - " + msg, "error");
        }
      } else if (response?.duplicate) {
        showToast("Already saved!");
      } else {
        showToast("Saved to CompareCart!");
      }
    });
  }
  function init() {
    if (document.getElementById(BUTTON_ID)) return;
    if (!isLikelyProductPage()) return;
    const btn = createButton();
    btn.addEventListener("click", () => handleSave(btn));
    document.body.appendChild(btn);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  var lastUrl = location.href;
  var observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      document.getElementById(BUTTON_ID)?.remove();
      setTimeout(init, 500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
