"use strict";
(() => {
  // src/extractor.ts
  function getMetaContent(property) {
    return document.querySelector(`meta[property="${property}"]`)?.content ?? document.querySelector(`meta[name="${property}"]`)?.content ?? null;
  }
  function parsePrice(raw) {
    if (raw == null) return { price: null, currency: "USD" };
    if (typeof raw === "number") return { price: raw, currency: "USD" };
    const str = String(raw).trim();
    const currency = str.includes("\u20AC") ? "EUR" : str.includes("\xA3") ? "GBP" : "USD";
    let cleaned = str.replace(/[^0-9.,]/g, "");
    if (/\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(",", ".");
    }
    const price = parseFloat(cleaned);
    return { price: isNaN(price) ? null : price, currency };
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
          const isProductGroup = type === "ProductGroup";
          if (!isProduct && !isProductGroup) continue;
          const source = isProductGroup ? Array.isArray(item.hasVariant) ? item.hasVariant[0] : null : item;
          if (!source) continue;
          let offer = null;
          if (source.offers) {
            const offersType = source.offers["@type"];
            if (offersType === "Offer") {
              offer = source.offers;
            } else if (offersType === "AggregateOffer") {
              offer = { price: source.offers.lowPrice, priceCurrency: source.offers.priceCurrency };
            } else if (Array.isArray(source.offers)) {
              offer = source.offers[0];
            }
          }
          const { price, currency } = parsePrice(offer?.price);
          const images = Array.isArray(item.image) ? item.image.filter((i) => typeof i === "string") : typeof item.image === "string" ? [item.image] : [];
          return {
            name: item.name ?? null,
            price,
            currency: offer?.priceCurrency ?? currency,
            image_url: images[0] ?? null,
            images
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
    "amazon.": () => ({
      name: document.querySelector("#productTitle")?.textContent?.trim() ?? null,
      price: (() => {
        const whole = document.querySelector(".a-price-whole")?.textContent?.replace(/[^0-9]/g, "");
        const frac = document.querySelector(".a-price-fraction")?.textContent?.replace(/[^0-9]/g, "");
        if (!whole) return null;
        return parseFloat(`${whole}.${frac ?? "0"}`);
      })(),
      currency: window.location.hostname.includes(".nl") || window.location.hostname.includes(".de") || window.location.hostname.includes(".fr") ? "EUR" : "USD",
      image_url: (() => {
        const img = document.querySelector("#landingImage, #imgTagWrapperId img");
        return img?.getAttribute("data-old-hires") || img?.src || null;
      })(),
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
    "ebay.": () => ({
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
    }),
    "zalando.": () => ({
      name: document.querySelector('h1[class*="Title"], span[class*="title"], h1')?.textContent?.trim() ?? null,
      // Price handled by extractFromJsonLd() via ProductGroup > hasVariant[0] > offers
      price: null,
      currency: "EUR",
      image_url: (() => {
        const img = document.querySelector('img[src*="img01.ztat"], img[srcset*="img01.ztat"]');
        if (img?.src && img.src.includes("img01.ztat")) return img.src;
        const srcset = img?.getAttribute("srcset") ?? "";
        const first = srcset.split(",")[0]?.trim().split(" ")[0];
        return first || document.querySelector('meta[property="og:image"]')?.content || null;
      })()
    }),
    "zara.": () => ({
      name: document.querySelector('h1[class*="product-detail-info__name"], h1')?.textContent?.trim() ?? null,
      price: (() => {
        const raw = document.querySelector('[class*="price__amount"], .price span, [data-price]')?.textContent;
        return raw ? parsePrice(raw).price : null;
      })(),
      currency: "EUR",
      // og:image is always the product image on Zara - much more reliable than DOM selectors
      // which pick up campaign/editorial banners instead of the actual item photo.
      image_url: document.querySelector('meta[property="og:image"]')?.content ?? null
    }),
    "thenorthface.": () => ({
      name: document.querySelector('h1[class*="product-name"], h1')?.textContent?.trim() ?? null,
      price: (() => {
        const raw = document.querySelector('[class*="product-price"], [itemprop="price"], .price')?.textContent ?? document.querySelector('meta[itemprop="price"]')?.content;
        return raw ? parsePrice(raw).price : null;
      })(),
      currency: "EUR",
      image_url: (() => {
        const img = document.querySelector('[class*="product-image"] img, .primary-image, [class*="pdp"] img');
        const srcset = img?.getAttribute("srcset") ?? img?.getAttribute("data-srcset") ?? "";
        const first = srcset.split(",")[0]?.trim().split(" ")[0];
        if (first) return first;
        if (img?.src && img.src.startsWith("http")) return img.src;
        return document.querySelector('meta[property="og:image"]')?.content ?? null;
      })()
    }),
    "asos.": () => ({
      name: document.querySelector('h1[class*="product-hero"], h1[data-testid*="product-title"]')?.textContent?.trim() ?? null,
      price: (() => {
        const raw = document.querySelector('[data-testid="current-price"], [class*="current-price"]')?.textContent;
        return raw ? parsePrice(raw).price : null;
      })(),
      currency: "EUR",
      image_url: document.querySelector('[class*="product-photo"] img, #hero-image')?.src ?? null
    }),
    "hm.": () => ({
      name: document.querySelector('h1[class*="product-item-headline"]')?.textContent?.trim() ?? null,
      price: (() => {
        const raw = document.querySelector('[class*="product-item-price"] .price, [data-testid="price"]')?.textContent;
        return raw ? parsePrice(raw).price : null;
      })(),
      currency: "EUR",
      image_url: document.querySelector('[class*="product-detail-main-image-container"] img')?.src ?? null
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
    const allImages = (jsonLd.images ?? []).length > 0 ? jsonLd.images : [storeData.image_url ?? jsonLd.image_url ?? og.image_url].filter((u) => !!u);
    const merged = {
      name: storeData.name ?? jsonLd.name ?? og.name ?? document.title ?? "Unknown product",
      price: storeData.price ?? jsonLd.price ?? og.price ?? null,
      currency: storeData.currency ?? jsonLd.currency ?? og.currency ?? "USD",
      image_url: allImages[0] ?? storeData.image_url ?? jsonLd.image_url ?? og.image_url ?? null,
      images: allImages,
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
  var TOAST_ID = "comparecart-toast";
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
    all: initial;
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: #C4603C;
    color: white;
    border: none;
    border-radius: 100px;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(196, 96, 60, 0.4);
    transition: all 0.15s ease;
    line-height: 1;
    white-space: nowrap;
    display: block;
  `;
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#A84E30";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "#C4603C";
    });
    return btn;
  }
  function showToast(message, type = "success") {
    document.getElementById(TOAST_ID)?.remove();
    const toast = document.createElement("div");
    toast.id = TOAST_ID;
    toast.textContent = message;
    toast.style.cssText = `
    all: initial;
    position: fixed;
    bottom: 80px;
    right: 24px;
    z-index: 2147483647;
    background: ${type === "success" ? "#059669" : "#dc2626"};
    color: white;
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    max-width: 280px;
    display: block;
  `;
    document.documentElement.appendChild(toast);
    setTimeout(() => toast.remove(), 3e3);
  }
  function handleSave(btn) {
    if (!chrome.runtime?.id) {
      showToast("Extension was updated - reload the page", "error");
      return;
    }
    btn.textContent = "Saving...";
    btn.style.opacity = "0.7";
    const product = extractProduct();
    function reset() {
      btn.textContent = "\u{1F6D2} Save to Compare";
      btn.style.opacity = "1";
    }
    const timer = window.setTimeout(() => {
      reset();
      showToast("Timed out - try again", "error");
    }, 1e4);
    try {
      chrome.runtime.sendMessage({ type: "SAVE_PRODUCT", product }, (response) => {
        window.clearTimeout(timer);
        reset();
        if (chrome.runtime.lastError) {
          if (chrome.runtime?.id) {
            window.setTimeout(() => handleSave(btn), 1500);
          } else {
            showToast("Extension was updated - reload the page", "error");
          }
          return;
        }
        if (!response?.ok) {
          const msg = response?.error ?? "";
          if (msg.includes("not logged in")) {
            showToast("Sign in via the extension popup first", "error");
          } else {
            showToast("Could not save: " + msg, "error");
          }
        } else if (response?.duplicate) {
          showToast("Already in your collection!");
        } else {
          showToast("Saved to CompareCart!");
        }
      });
    } catch {
      window.clearTimeout(timer);
      reset();
      showToast("Extension was updated - reload the page", "error");
    }
  }
  function init() {
    if (document.getElementById(BUTTON_ID)) return;
    if (!isLikelyProductPage()) return;
    const btn = createButton();
    btn.addEventListener("click", () => handleSave(btn));
    document.documentElement.appendChild(btn);
  }
  function initWithRetry() {
    init();
    if (!document.getElementById(BUTTON_ID)) {
      window.setTimeout(init, 2e3);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWithRetry);
  } else {
    initWithRetry();
  }
  var APP_URL = "https://shopping-compare.vercel.app";
  window.addEventListener("message", (event) => {
    try {
      if (event.origin !== new URL(APP_URL).origin) return;
    } catch {
      return;
    }
    if (event.data?.type !== "COMPARECART_AUTH") return;
    const { access_token, refresh_token } = event.data;
    if (typeof access_token !== "string" || typeof refresh_token !== "string") return;
    if (!access_token || !refresh_token) return;
    if (!chrome.runtime?.id) return;
    chrome.runtime.sendMessage({ type: "SHARE_SESSION", access_token, refresh_token });
  });
  var lastUrl = location.href;
  var observer = new MutationObserver(() => {
    if (!chrome.runtime?.id) {
      observer.disconnect();
      return;
    }
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      document.getElementById(BUTTON_ID)?.remove();
      window.setTimeout(init, 600);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
