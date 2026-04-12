"use strict";
(() => {
  // src/normalize-specs.ts
  var KEY_MAP = {
    // Brand
    "brand": "Brand",
    "marca": "Brand",
    "marque": "Brand",
    "marke": "Brand",
    "merk": "Brand",
    "brand name": "Brand",
    // Color
    "color": "Color",
    "colour": "Color",
    "couleur": "Color",
    "farbe": "Color",
    "kleur": "Color",
    "colore": "Color",
    "color name": "Color",
    "colour name": "Color",
    // Material (outer/main fabric)
    "material": "Material",
    "materials": "Material",
    "matiere": "Material",
    "materiaal": "Material",
    "materiale": "Material",
    "fabric type": "Material",
    "fabric": "Material",
    "outer": "Material",
    "outer shell": "Material",
    "shell": "Material",
    "outer material": "Material",
    "upper": "Material",
    "upper material": "Material",
    // Composition (fiber breakdown, often percentage-based)
    "composition": "Composition",
    "composicion": "Composition",
    "zusammensetzung": "Composition",
    "samenstelling": "Composition",
    "composizione": "Composition",
    "fiber content": "Composition",
    "content": "Composition",
    // Size
    "size": "Size",
    "taille": "Size",
    "grosse": "Size",
    "maat": "Size",
    "taglia": "Size",
    "size type": "Size",
    "fit type": "Size",
    // Fit / Cut
    "fit": "Fit",
    "coupe": "Fit",
    "schnitt": "Fit",
    "snit": "Fit",
    "taglio": "Fit",
    // Sole (shoes)
    "sole": "Sole",
    "semelle": "Sole",
    "sohle": "Sole",
    "zool": "Sole",
    "suola": "Sole",
    "sole material": "Sole",
    "outsole": "Sole",
    // Lining
    "lining": "Lining",
    "doublure": "Lining",
    "futter": "Lining",
    "voering": "Lining",
    // Weight
    "weight": "Weight",
    "poids": "Weight",
    "gewicht": "Weight",
    "gewigt": "Weight",
    "peso": "Weight",
    // Volume / Size for beauty
    "volume": "Volume",
    "net weight": "Volume",
    "net content": "Volume",
    // Care instructions
    "care": "Care",
    "care instructions": "Care",
    "pflegehinweise": "Care",
    "onderhoud": "Care",
    "washing instructions": "Care",
    "lavage": "Care",
    // Country of origin
    "country of origin": "Country of Origin",
    "made in": "Country of Origin",
    "hergestellt in": "Country of Origin",
    "fabricado en": "Country of Origin",
    "pays d'origine": "Country of Origin",
    "land van herkomst": "Country of Origin",
    // Season / Collection
    "season": "Season",
    "collection": "Collection",
    "saison": "Season",
    "temporada": "Season",
    // Type / Category
    "type": "Type",
    "product type": "Type",
    "style": "Style",
    "style name": "Style",
    // Gender
    "gender": "Gender",
    "department": "Gender",
    // Pattern
    "pattern": "Pattern",
    "motif": "Pattern",
    "muster": "Pattern",
    // Closure
    "closure": "Closure",
    "fastening": "Closure",
    "fermeture": "Closure",
    // Neckline
    "neckline": "Neckline",
    "collar": "Neckline",
    "encolure": "Neckline",
    // Sleeve
    "sleeve": "Sleeve",
    "sleeve length": "Sleeve",
    "manche": "Sleeve",
    // Length
    "length": "Length",
    "longueur": "Length",
    "lange": "Length",
    // Fragrance / Scent
    "scent": "Scent",
    "fragrance": "Scent",
    "parfum": "Scent",
    "fragrance family": "Scent"
  };
  var KEY_SUBSTRING_MAP = [
    ["composic", "Composition"],
    ["zusammensetz", "Composition"],
    ["samenstell", "Composition"],
    ["material", "Material"],
    ["fabric", "Material"],
    ["fibre", "Material"],
    ["fiber", "Material"],
    ["colour", "Color"],
    ["color", "Color"],
    ["farbe", "Color"],
    ["kleur", "Color"],
    ["composition", "Composition"],
    ["lining", "Lining"],
    ["country of origin", "Country of Origin"],
    ["made in", "Country of Origin"],
    ["care", "Care"],
    ["washing", "Care"],
    ["lavage", "Care"],
    ["sole", "Sole"],
    ["brand", "Brand"],
    ["weight", "Weight"],
    ["volume", "Volume"],
    ["season", "Season"],
    ["closure", "Closure"],
    ["neckline", "Neckline"],
    ["sleeve", "Sleeve"],
    ["pattern", "Pattern"],
    ["gender", "Gender"]
  ];
  function toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
  }
  function normalizeKey(raw) {
    const lower = raw.toLowerCase().trim();
    if (KEY_MAP[lower]) return KEY_MAP[lower];
    for (const [pattern, canonical] of KEY_SUBSTRING_MAP) {
      if (lower.includes(pattern)) return canonical;
    }
    return toTitleCase(raw.trim());
  }
  var VALUE_MAP = {
    // Materials - ES
    "algodon": "Cotton",
    "algod\xF3n": "Cotton",
    "poliester": "Polyester",
    "poli\xE9ster": "Polyester",
    "cuero": "Leather",
    "lana": "Wool",
    "seda": "Silk",
    "nailon": "Nylon",
    "lino": "Linen",
    "viscosa": "Viscose",
    "elastano": "Elastane",
    "acrilico": "Acrylic",
    "acr\xEDlico": "Acrylic",
    "poliamida": "Polyamide",
    "ante": "Suede",
    "terciopelo": "Velvet",
    "denim": "Denim",
    "goma": "Rubber",
    "caucho": "Rubber",
    "plastico": "Plastic",
    "pl\xE1stico": "Plastic",
    "sintetico": "Synthetic",
    "sint\xE9tico": "Synthetic",
    // Materials - FR
    "coton": "Cotton",
    "polyester": "Polyester",
    "cuir": "Leather",
    "laine": "Wool",
    "soie": "Silk",
    "nylon": "Nylon",
    "lin": "Linen",
    "viscose": "Viscose",
    "\xE9lasthanne": "Elastane",
    "elasthanne": "Elastane",
    "acrylique": "Acrylic",
    "polyamide": "Polyamide",
    "daim": "Suede",
    "velours": "Velvet",
    "caoutchouc": "Rubber",
    "synth\xE9tique": "Synthetic",
    "synthetique": "Synthetic",
    // Materials - DE
    "baumwolle": "Cotton",
    "wolle": "Wool",
    "seide": "Silk",
    "leinen": "Linen",
    "leder": "Leather",
    "wildleder": "Suede",
    "samt": "Velvet",
    "gummi": "Rubber",
    "kunststoff": "Plastic",
    "synthetik": "Synthetic",
    "kunstfaser": "Synthetic",
    // Materials - NL
    "katoen": "Cotton",
    "wol": "Wool",
    "zijde": "Silk",
    "linnen": "Linen",
    "leer": "Leather",
    "suede": "Suede",
    "fluweel": "Velvet",
    "rubber": "Rubber",
    // Materials - IT (lana/lino already in ES)
    "cotone": "Cotton",
    "poliestere": "Polyester",
    "pelle": "Leather",
    "seta": "Silk",
    "gomma": "Rubber",
    // Colors - ES
    "rojo": "Red",
    "azul": "Blue",
    "verde": "Green",
    "amarillo": "Yellow",
    "negro": "Black",
    "blanco": "White",
    "gris": "Grey",
    "naranja": "Orange",
    "rosa": "Pink",
    "morado": "Purple",
    "violeta": "Purple",
    "marron": "Brown",
    "marr\xF3n": "Brown",
    "beige": "Beige",
    "crema": "Cream",
    "dorado": "Gold",
    "plateado": "Silver",
    "marino": "Navy",
    "burdeos": "Burgundy",
    // Colors - FR (gris/marron already in ES)
    "rouge": "Red",
    "bleu": "Blue",
    "vert": "Green",
    "jaune": "Yellow",
    "noir": "Black",
    "blanc": "White",
    "orange": "Orange",
    "rose": "Pink",
    "violet": "Purple",
    "or": "Gold",
    "argent": "Silver",
    "marine": "Navy",
    "bordeaux": "Burgundy",
    // Colors - DE (orange/rosa/marine already in FR/ES)
    "rot": "Red",
    "blau": "Blue",
    "grun": "Green",
    "gr\xFCn": "Green",
    "gelb": "Yellow",
    "schwarz": "Black",
    "weiss": "White",
    "wei\xDF": "White",
    "grau": "Grey",
    "lila": "Purple",
    "braun": "Brown",
    "gold": "Gold",
    "silber": "Silver",
    // Colors - NL
    "rood": "Red",
    "blauw": "Blue",
    "groen": "Green",
    "geel": "Yellow",
    "zwart": "Black",
    "wit": "White",
    "grijs": "Grey",
    "roze": "Pink",
    "paars": "Purple",
    "bruin": "Brown",
    "goud": "Gold",
    "zilver": "Silver"
  };
  function normalizeValue(value, key) {
    const isTranslateable = ["Material", "Composition", "Color", "Sole", "Lining", "Upper"].includes(key);
    if (!isTranslateable) return value;
    return value.replace(/[a-záéíóúàèìòùâêîôûäëïöüñ]+/gi, (word) => {
      const lower = word.toLowerCase();
      return VALUE_MAP[lower] ?? word;
    });
  }
  function normalizeSpecs(raw) {
    const result = {};
    for (const [rawKey, rawValue] of Object.entries(raw)) {
      const trimmedValue = rawValue.trim();
      if (!trimmedValue) continue;
      const canonicalKey = normalizeKey(rawKey);
      const canonicalValue = normalizeValue(trimmedValue, canonicalKey);
      result[canonicalKey] = canonicalValue;
    }
    return result;
  }

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
  function isOfferAvailable(offer) {
    const avail = typeof offer?.availability === "string" ? offer.availability.toLowerCase() : "";
    if (!avail) return true;
    if (avail.includes("outofstock") || avail.includes("soldout") || avail.includes("discontinued")) return false;
    return true;
  }
  function isVariantAvailable(variant) {
    if (!variant?.offers) return true;
    const offers = Array.isArray(variant.offers) ? variant.offers : [variant.offers];
    return offers.some(isOfferAvailable);
  }
  var NON_SIZE_TEXT = /^(toevoegen|add to (cart|bag)|add|buy|order|checkout|submit|notify\s*me|size\s*guide|maten?wijzer|herinnering|wishlist|save|share|zoom|view|select|kies|choose|pick|afhandelen|winkelwagen|bekijk)$/i;
  var SIZE_VAL = /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d{2,3}(\/\d{2,3})?)$/i;
  function extractAvailableSizes(selectors) {
    const sizes = [];
    document.querySelectorAll(selectors).forEach((el) => {
      const text = el.textContent?.trim();
      if (!text || text.length > 20) return;
      if (NON_SIZE_TEXT.test(text)) return;
      const isUnavailable = el.disabled === true || el.getAttribute("aria-disabled") === "true" || el.hasAttribute("data-disabled") || /disabled|unavailable|sold-?out|out-of-stock|notify/i.test(el.className) || /disabled|unavailable|sold-?out|out-of-stock/i.test(el.getAttribute("data-state") ?? "") || /herinnering/i.test(el.textContent ?? "") || el.querySelector("del, s") !== null;
      if (!isUnavailable) sizes.push(text);
    });
    return sizes;
  }
  function extractSelectedColor() {
    const selectors = [
      '[class*="color-swatch"][aria-checked="true"]',
      '[class*="color-swatch"][aria-selected="true"]',
      '[class*="color"][aria-current="true"]',
      '[class*="selected-color"]',
      '[class*="color-name"]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const text = el?.getAttribute("aria-label") || el?.getAttribute("title") || el?.textContent?.trim();
      if (text && text.length < 60) return text;
    }
    return null;
  }
  function extractGenericSizeColor() {
    const SIZE_KW = /\b(size|maat|taille|taglia|gr[öo](?:ss?|ße?)|tamaño|rozmiar)\b/i;
    const COLOR_KW = /\b(colou?r|kleur|couleur|farbe|colore|cor|renk)\b/i;
    let size = null;
    let color = null;
    function getLabelText(el) {
      const labelledBy = el.getAttribute("aria-labelledby");
      if (labelledBy) {
        const labelEl = document.getElementById(labelledBy);
        if (labelEl) return labelEl.textContent?.trim() ?? "";
      }
      const ariaLabel = el.getAttribute("aria-label");
      if (ariaLabel) return ariaLabel;
      const id = el.id;
      if (id) {
        try {
          const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
          if (label) return label.textContent?.trim() ?? "";
        } catch {
        }
      }
      const parent = el.parentElement;
      if (parent) {
        const heading = parent.querySelector('legend, label, [class*="label"], [class*="title"], [class*="heading"]');
        if (heading && !heading.contains(el)) return heading.textContent?.trim() ?? "";
      }
      return "";
    }
    function isAvailable(el) {
      const text = el.textContent?.trim() ?? "";
      return !el.disabled && el.getAttribute("aria-disabled") !== "true" && !el.hasAttribute("data-disabled") && !/disabled|unavailable|sold-?out|out-of-stock|notify/i.test(el.className) && !/herinnering/i.test(text) && !NON_SIZE_TEXT.test(text) && el.querySelector("del, s") === null;
    }
    document.querySelectorAll("select").forEach((select) => {
      if (size && color) return;
      const label = getLabelText(select) || select.getAttribute("name") || select.getAttribute("data-option-name") || "";
      const available = Array.from(select.options).filter((o) => !o.disabled && o.value !== "" && o.textContent?.trim()).map((o) => o.textContent.trim());
      if (available.length === 0) return;
      if (!size && SIZE_KW.test(label)) size = available.join(", ");
      if (!color && COLOR_KW.test(label)) color = available[0];
    });
    if (!size) {
      const sizeContainer = document.querySelector(
        '[class*="size-selector"], [class*="size-list"], [class*="size-picker"], [class*="size-dropdown"], [class*="product-size"], [data-testid*="size"]'
      );
      const containerSelect = sizeContainer?.querySelector("select");
      if (containerSelect) {
        const opts = Array.from(containerSelect.options).filter((o) => !o.disabled && o.value !== "" && o.textContent?.trim()).map((o) => o.textContent.trim()).filter((t) => t.length <= 20 && !NON_SIZE_TEXT.test(t));
        if (opts.length > 0) size = opts.join(", ");
      }
    }
    const CONTAINER_SEL = [
      '[role="radiogroup"]',
      '[role="listbox"]',
      '[class*="size-selector"]',
      '[class*="size-picker"]',
      '[class*="size-options"]',
      '[class*="size-list"]',
      '[class*="color-selector"]',
      '[class*="color-picker"]',
      '[class*="color-options"]',
      '[class*="variant-selector"]',
      '[class*="swatch-container"]',
      '[class*="swatches"]'
    ].join(", ");
    document.querySelectorAll(CONTAINER_SEL).forEach((container) => {
      if (size && color) return;
      const label = getLabelText(container) + " " + container.className;
      const items = Array.from(container.querySelectorAll(
        'button, [role="radio"], [role="option"], [role="menuitem"], li'
      )).filter((el) => isAvailable(el));
      const values = items.map((el) => el.getAttribute("aria-label") || el.textContent?.trim()).filter((v) => !!v && v.length > 0 && v.length <= 20);
      if (values.length === 0) return;
      if (!size && SIZE_KW.test(label)) size = values.join(", ");
      if (!color && COLOR_KW.test(label)) color = values[0];
    });
    document.querySelectorAll("[data-option-name], [data-attribute-name]").forEach((container) => {
      if (size && color) return;
      const name = container.getAttribute("data-option-name") ?? container.getAttribute("data-attribute-name") ?? "";
      const items = Array.from(container.querySelectorAll('[data-value], input[type="radio"]')).filter((el) => isAvailable(el)).map((el) => el.getAttribute("data-value") || el.value || el.textContent?.trim()).filter((v) => !!v && v.length <= 20);
      if (items.length === 0) return;
      if (!size && SIZE_KW.test(name)) size = items.join(", ");
      if (!color && COLOR_KW.test(name)) color = items[0];
    });
    if (!size) {
      document.querySelectorAll("select").forEach((sel) => {
        if (size) return;
        const unique = [...new Set(
          Array.from(sel.options).filter((o) => !o.disabled && o.value !== "" && o.textContent?.trim()).map((o) => o.textContent.trim()).filter((t) => t.length <= 6 && !t.includes(" ") && !NON_SIZE_TEXT.test(t))
        )];
        if (unique.length >= 2 && unique.every((o) => SIZE_VAL.test(o))) {
          size = unique.join(", ");
        }
      });
    }
    return { size, color };
  }
  function extractFromJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent ?? "");
        const rawItems = Array.isArray(data) ? data : [data];
        const items = [];
        for (const raw of rawItems) {
          const r = raw;
          if (r["@graph"] && Array.isArray(r["@graph"])) {
            items.push(...r["@graph"]);
          } else {
            items.push(raw);
          }
        }
        for (const item of items) {
          const type = item["@type"];
          if (!type) continue;
          const isProduct = type === "Product" || Array.isArray(type) && type.includes("Product");
          const isProductGroup = type === "ProductGroup";
          if (!isProduct && !isProductGroup) continue;
          const tryStr = (v) => typeof v === "string" && v ? v : typeof v === "object" && v !== null ? typeof v.value === "string" ? v.value : typeof v.name === "string" ? v.name : null : null;
          const rawSpecs = {};
          const extractAdditionalProps = (node) => {
            if (!Array.isArray(node?.additionalProperty)) return;
            for (const prop of node.additionalProperty) {
              const name = typeof prop.name === "string" ? prop.name : null;
              const val = typeof prop.value === "string" ? prop.value : typeof prop.value === "number" ? String(prop.value) : null;
              if (name && val) rawSpecs[name] = val;
            }
          };
          extractAdditionalProps(item);
          let source = isProductGroup ? null : item;
          if (isProductGroup && Array.isArray(item.hasVariant)) {
            const variants = item.hasVariant;
            const availableSizes = /* @__PURE__ */ new Set();
            const availableColors = /* @__PURE__ */ new Set();
            for (const v of variants) {
              const available = isVariantAvailable(v);
              if (available) {
                const sz = tryStr(v.size);
                if (sz) availableSizes.add(sz);
                const col = tryStr(v.color);
                if (col) availableColors.add(col);
              }
              if (!source && available) source = v;
            }
            if (!source) source = variants[0];
            if (availableSizes.size > 0) rawSpecs["size"] = Array.from(availableSizes).join(", ");
            if (availableColors.size > 0) rawSpecs["color"] = Array.from(availableColors).join(", ");
            extractAdditionalProps(source);
          } else if (source !== item) {
            extractAdditionalProps(source);
          }
          if (!source) continue;
          let offer = null;
          if (source.offers) {
            const offersType = source.offers["@type"];
            if (offersType === "Offer") {
              offer = source.offers;
            } else if (offersType === "AggregateOffer") {
              offer = { price: source.offers.lowPrice, priceCurrency: source.offers.priceCurrency };
            } else if (Array.isArray(source.offers)) {
              const valid = source.offers.filter((o) => o.price != null);
              if (valid.length > 0) {
                offer = valid.reduce((min, o) => parseFloat(o.price) < parseFloat(min.price) ? o : min);
              }
            }
          }
          const { price, currency } = parsePrice(offer?.price);
          const images = Array.isArray(item.image) ? item.image.filter((i) => typeof i === "string") : typeof item.image === "string" ? [item.image] : [];
          if (!isProductGroup) {
            for (const field of ["material", "color", "size"]) {
              const v = tryStr(item[field] ?? source[field]);
              if (v) rawSpecs[field] = v;
            }
          }
          const brandStr = tryStr(item.brand ?? source.brand);
          if (brandStr) rawSpecs["brand"] = brandStr;
          return {
            name: item.name ?? null,
            price,
            currency: offer?.priceCurrency ?? currency,
            image_url: images[0] ?? null,
            images,
            specs: rawSpecs
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
        document.querySelectorAll(
          "#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr, #productDetails_feature_div tr, #prodDetails tr"
        ).forEach((row) => {
          const cells = row.querySelectorAll("td, th");
          if (cells.length >= 2) {
            const key = cells[0].textContent?.trim().replace(/\s+/g, " ").replace(/:$/, "") ?? "";
            const val = cells[1].textContent?.trim().replace(/\s+/g, " ") ?? "";
            if (key && val && key.length < 60) specs[key] = val;
          }
        });
        document.querySelectorAll("#detailBullets_feature_div li .a-list-item").forEach((item) => {
          const bold = item.querySelector(".a-text-bold");
          if (!bold) return;
          const key = bold.textContent?.trim().replace(/\s*:\s*$/, "").replace(/\s+/g, " ") ?? "";
          const val = item.textContent?.replace(bold.textContent ?? "", "").trim().replace(/\s+/g, " ") ?? "";
          if (key && val && key.length < 60) specs[key] = val;
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
      image_url: document.querySelector(".ux-image-carousel img, #icImg")?.src ?? null,
      specs: (() => {
        const specs = {};
        document.querySelectorAll(".ux-labels-values, .itemAttr").forEach((row) => {
          const label = row.querySelector(".ux-labels-values__labels, .attrLabels")?.textContent?.trim().replace(/:$/, "");
          const value = row.querySelector(".ux-labels-values__values, .attrValues")?.textContent?.trim();
          if (label && value && label.length < 60) specs[label] = value;
        });
        return specs;
      })()
    }),
    "aliexpress.com": () => ({
      name: document.querySelector(".title--wrap--UUHae_g h1")?.textContent?.trim() ?? null,
      price: (() => {
        const raw = document.querySelector(".price--current--I3Zeidd")?.textContent;
        return raw ? parsePrice(raw).price : null;
      })(),
      currency: "USD",
      image_url: document.querySelector(".slider--img--K0YbWQO img")?.src ?? null,
      specs: (() => {
        const specs = {};
        document.querySelectorAll('[class*="specification--prop"], [class*="ProductProps"] [class*="item"]').forEach((prop) => {
          const label = prop.querySelector('[class*="title"], [class*="label"]')?.textContent?.trim();
          const value = prop.querySelector('[class*="value"], [class*="desc"]')?.textContent?.trim();
          if (label && value && label.length < 60) specs[label] = value;
        });
        return specs;
      })()
    }),
    "etsy.com": () => ({
      name: document.querySelector("h1[data-buy-box-listing-title]")?.textContent?.trim() ?? null,
      price: (() => {
        const raw = document.querySelector('[data-selector="price-only"]')?.textContent;
        return raw ? parsePrice(raw).price : null;
      })(),
      currency: "USD",
      image_url: document.querySelector("[data-carousel-first-image]")?.src ?? null,
      specs: (() => {
        const specs = {};
        document.querySelectorAll('[class*="product-details"] li, [class*="listing-page-overview"] li, [data-region="product_details"] li').forEach((li) => {
          const text = li.textContent?.trim() ?? "";
          const colonIdx = text.indexOf(":");
          if (colonIdx > 0 && colonIdx < 60) {
            specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
          }
        });
        return specs;
      })()
    }),
    "zalando.": () => ({
      name: document.querySelector('h1[class*="Title"], span[class*="title"], h1')?.textContent?.trim() ?? null,
      // Price handled by extractFromJsonLd() via ProductGroup > hasVariant offers
      price: null,
      currency: "EUR",
      image_url: (() => {
        const img = document.querySelector('img[src*="img01.ztat"], img[srcset*="img01.ztat"]');
        if (img?.src && img.src.includes("img01.ztat")) return img.src;
        const srcset = img?.getAttribute("srcset") ?? "";
        const first = srcset.split(",")[0]?.trim().split(" ")[0];
        return first || document.querySelector('meta[property="og:image"]')?.content || null;
      })(),
      specs: (() => {
        const specs = {};
        document.querySelectorAll('[class*="Detail"] li, [data-testid*="detail"] li, [class*="details"] li').forEach((li) => {
          const text = li.textContent?.trim() ?? "";
          const colonIdx = text.indexOf(":");
          if (colonIdx > 0 && colonIdx < 60) {
            specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
          }
        });
        const sizes = extractAvailableSizes(
          '[data-testid*="size"] option, [class*="size"] select option, [class*="SizeSelector"] [role="option"], button[class*="size"], [class*="size-selector"] button, [data-testid*="size-selector"] button'
        );
        if (sizes.length > 0) specs["size"] = sizes.join(", ");
        if (!specs["kleur"] && !specs["Kleur"] && !specs["color"] && !specs["Color"]) {
          const colorFromText = (() => {
            let found = null;
            document.querySelectorAll('[class*="Detail"] span, [data-testid*="detail"] span, [class*="color"] span').forEach((el) => {
              if (found) return;
              const text = el.textContent?.trim() ?? "";
              if (/^kleur:/i.test(text)) found = text.replace(/^kleur:\s*/i, "").trim();
            });
            return found;
          })();
          const colorFromSwatch = document.querySelector(
            '[class*="color-swatch"][aria-checked="true"], [class*="color-swatch"][aria-selected="true"]'
          );
          const color = colorFromText || colorFromSwatch?.getAttribute("aria-label") || colorFromSwatch?.getAttribute("title");
          if (color) specs["color"] = color;
        }
        return specs;
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
      image_url: document.querySelector('meta[property="og:image"]')?.content ?? null,
      specs: (() => {
        const specs = {};
        const compositionEl = document.querySelector('[class*="product-detail-extra-detail"], [class*="composition"]');
        if (compositionEl?.textContent?.trim()) specs["Composition"] = compositionEl.textContent.trim();
        document.querySelectorAll('[class*="expandable-text"] li, [class*="product-detail-extra-detail"] li').forEach((li) => {
          const text = li.textContent?.trim() ?? "";
          const colonIdx = text.indexOf(":");
          if (colonIdx > 0 && colonIdx < 60) {
            specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
          }
        });
        const sizeByDataQa = document.querySelectorAll(
          '[data-qa-qualifier*="size"] li, [data-qa-qualifier*="size"] button, [data-qa-action*="size-selector"] li, [data-qa-action*="size"] button'
        );
        if (sizeByDataQa.length >= 2) {
          const sizes = [...new Set(
            Array.from(sizeByDataQa).filter((el) => !/unavailable|disabled/i.test(el.className) && el.getAttribute("aria-disabled") !== "true").map((el) => (el.textContent ?? "").trim()).filter((t) => t.length > 0 && t.length <= 6 && !t.includes(" ") && !NON_SIZE_TEXT.test(t) && SIZE_VAL.test(t))
          )];
          if (sizes.length >= 2) specs["size"] = sizes.join(", ");
        }
        if (!specs["size"]) {
          const containers = document.querySelectorAll('[role="listbox"], [role="radiogroup"]');
          for (const container of containers) {
            const ariaLabel = (container.getAttribute("aria-label") ?? "").toLowerCase();
            const labelledById = container.getAttribute("aria-labelledby");
            const labelledText = labelledById ? (document.getElementById(labelledById)?.textContent ?? "").toLowerCase() : "";
            if (!/size|maat|taille|taglia/i.test(ariaLabel + " " + labelledText + " " + container.className)) continue;
            const items = container.querySelectorAll('[role="option"], [role="radio"], li, button');
            const sizes = [...new Set(
              Array.from(items).filter((el) => el.getAttribute("aria-disabled") !== "true" && !/unavailable|disabled/i.test(el.className)).map((el) => (el.getAttribute("aria-label") ?? el.textContent ?? "").trim()).filter((t) => t.length > 0 && t.length <= 6 && !t.includes(" ") && !NON_SIZE_TEXT.test(t) && SIZE_VAL.test(t))
            )];
            if (sizes.length >= 2) {
              specs["size"] = sizes.join(", ");
              break;
            }
          }
        }
        if (!specs["size"]) {
          const sizeUlItems = document.querySelectorAll(
            'ul.size-selector-sizes li, [class*="size-selector-sizes"] li'
          );
          if (sizeUlItems.length >= 2) {
            const sizes = [...new Set(
              Array.from(sizeUlItems).filter((li) => !/unavailable|disabled/i.test(li.className)).map((li) => {
                const label = li.querySelector('[class*="size-selector-sizes-size__label"], [class*="label"]');
                return (label?.textContent ?? li.textContent ?? "").trim();
              }).filter((t) => t.length > 0 && t.length <= 6 && !t.includes(" ") && !NON_SIZE_TEXT.test(t) && SIZE_VAL.test(t))
            )];
            if (sizes.length >= 2) specs["size"] = sizes.join(", ");
          }
        }
        if (!specs["size"]) {
          for (const sel of document.querySelectorAll("select")) {
            const unique = [...new Set(
              Array.from(sel.options).filter((o) => !o.disabled && o.value !== "" && o.textContent?.trim()).map((o) => o.textContent.trim()).filter((t) => t.length <= 6 && !t.includes(" ") && !NON_SIZE_TEXT.test(t))
            )];
            if (unique.length >= 2 && unique.every((o) => SIZE_VAL.test(o))) {
              specs["size"] = unique.join(", ");
              break;
            }
          }
        }
        if (!specs["color"] && !specs["Color"]) {
          const colorEl = document.querySelector(
            '[class*="product-detail-info__color"], [class*="color-selector"] [aria-checked="true"], [data-qa-qualifier*="color"]'
          );
          const color = colorEl?.getAttribute("aria-label") || colorEl?.getAttribute("title") || colorEl?.textContent?.replace(/^colou?r[:\s]*/i, "").trim();
          if (color && color.length < 60) specs["color"] = color;
        }
        return specs;
      })()
    }),
    "sephora.": () => ({
      name: document.querySelector('h1[class*="product"], h1[data-comp*="Name"], .product-name h1, h1')?.textContent?.trim() ?? null,
      price: (() => {
        const metaRaw = document.querySelector('meta[property="product:price:amount"]')?.content ?? document.querySelector('meta[itemprop="price"]')?.content ?? document.querySelector('meta[property="og:price:amount"]')?.content;
        if (metaRaw) return parsePrice(metaRaw).price;
        const raw = document.querySelector('[data-comp="Price"] [class*="current"], [class*="product-price"] .value, [class*="price-sales"], [class*="price__value"]')?.textContent;
        return raw ? parsePrice(raw).price : null;
      })(),
      currency: window.location.hostname.includes(".fr") ? "EUR" : window.location.hostname.includes(".co.uk") ? "GBP" : "USD",
      image_url: document.querySelector('meta[property="og:image"]')?.content ?? null,
      specs: (() => {
        const specs = {};
        document.querySelectorAll('[data-comp*="Detail"] li, [class*="product-details"] li, [class*="ProductDetails"] li').forEach((li) => {
          const text = li.textContent?.trim() ?? "";
          const colonIdx = text.indexOf(":");
          if (colonIdx > 0 && colonIdx < 60) {
            specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
          }
        });
        return specs;
      })()
    }),
    "thenorthface.": () => ({
      name: document.querySelector('h1[class*="product-name"], h1[class*="ProductName"], h1[class*="pdp"], h1')?.textContent?.trim() ?? null,
      price: (() => {
        const raw = document.querySelector('[class*="product-price__value"], [class*="ProductPrice"], [class*="pdp-price"], [class*="product-price"], [itemprop="price"], .price')?.textContent ?? document.querySelector('meta[itemprop="price"]')?.content ?? document.querySelector('meta[property="product:price:amount"]')?.content;
        return raw ? parsePrice(raw).price : null;
      })(),
      currency: window.location.hostname.includes(".com") && window.location.pathname.includes("/nl-") ? "EUR" : window.location.hostname.includes(".com") && window.location.pathname.includes("/de-") ? "EUR" : window.location.hostname.includes(".com") && window.location.pathname.includes("/fr-") ? "EUR" : window.location.hostname.includes(".co.uk") ? "GBP" : "EUR",
      image_url: (() => {
        const img = document.querySelector('[class*="product-image"] img, .primary-image, [class*="pdp"] img');
        const srcset = img?.getAttribute("srcset") ?? img?.getAttribute("data-srcset") ?? "";
        const first = srcset.split(",")[0]?.trim().split(" ")[0];
        if (first) return first;
        if (img?.src && img.src.startsWith("http")) return img.src;
        return document.querySelector('meta[property="og:image"]')?.content ?? null;
      })(),
      specs: (() => {
        const specs = {};
        document.querySelectorAll('[class*="product-details"] li, [class*="pdp-description"] li, [class*="description-content"] li').forEach((li) => {
          const text = li.textContent?.trim() ?? "";
          const colonIdx = text.indexOf(":");
          if (colonIdx > 0 && colonIdx < 60) {
            specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
          }
        });
        const sizes = extractAvailableSizes(
          '[class*="size-selector"] button, [class*="SizeSelector"] button, [class*="pdp-size"] button, [data-testid*="size"] button, [class*="size-picker"] button, [class*="size-grid"] button'
        );
        if (sizes.length > 0) specs["size"] = sizes.join(", ");
        if (!specs["kleur"] && !specs["Kleur"] && !specs["color"] && !specs["Color"]) {
          const color = extractSelectedColor();
          if (color) specs["color"] = color;
        }
        return specs;
      })()
    }),
    "vans.": () => ({
      name: document.querySelector('h1[class*="product-name"], h1[class*="ProductName"], h1[data-testid*="product-title"], h1')?.textContent?.trim() ?? null,
      price: (() => {
        const raw = document.querySelector('[class*="product-price__value"], [class*="ProductPrice"], [data-testid*="price"], [itemprop="price"], .price')?.textContent ?? document.querySelector('meta[itemprop="price"]')?.content ?? document.querySelector('meta[property="product:price:amount"]')?.content;
        return raw ? parsePrice(raw).price : null;
      })(),
      currency: "EUR",
      image_url: document.querySelector('meta[property="og:image"]')?.content ?? document.querySelector('[class*="product-image"] img, [class*="pdp"] img')?.src ?? null,
      specs: (() => {
        const specs = {};
        document.querySelectorAll('[class*="product-details"] li, [class*="pdp-description"] li, [class*="description-content"] li').forEach((li) => {
          const text = li.textContent?.trim() ?? "";
          const colonIdx = text.indexOf(":");
          if (colonIdx > 0 && colonIdx < 60) specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
        });
        const sizes = extractAvailableSizes(
          '[class*="size-selector"] button, [class*="size-picker"] button, [data-testid*="size"] button, [class*="pdp-size"] button, [class*="SizeButton"], [class*="size-option"]'
        );
        if (sizes.length > 0) specs["size"] = sizes.join(", ");
        if (!specs["color"] && !specs["Color"]) {
          const color = extractSelectedColor() || document.querySelector('[class*="color-name"], [class*="product-color"]')?.textContent?.trim();
          if (color && color.length < 60) specs["color"] = color;
        }
        return specs;
      })()
    }),
    "asos.": () => ({
      name: document.querySelector('h1[class*="product-hero"], h1[data-testid*="product-title"]')?.textContent?.trim() ?? null,
      price: (() => {
        const raw = document.querySelector('[data-testid="current-price"], [class*="current-price"]')?.textContent;
        return raw ? parsePrice(raw).price : null;
      })(),
      currency: "EUR",
      image_url: document.querySelector('[class*="product-photo"] img, #hero-image')?.src ?? null,
      specs: (() => {
        const specs = {};
        document.querySelectorAll('[class*="product-description"] li, [data-testid*="description"] li, [class*="ProductDescription"] li').forEach((li) => {
          const text = li.textContent?.trim() ?? "";
          const colonIdx = text.indexOf(":");
          if (colonIdx > 0 && colonIdx < 60) {
            specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
          }
        });
        return specs;
      })()
    }),
    "hm.": () => ({
      name: document.querySelector('h1[class*="product-item-headline"]')?.textContent?.trim() ?? null,
      price: (() => {
        const raw = document.querySelector('[class*="product-item-price"] .price, [data-testid="price"]')?.textContent;
        return raw ? parsePrice(raw).price : null;
      })(),
      currency: "EUR",
      image_url: document.querySelector('[class*="product-detail-main-image-container"] img')?.src ?? null,
      specs: (() => {
        const specs = {};
        document.querySelectorAll('[class*="description-accordion"] [class*="description-item"], [class*="product-description"] li, [data-testid*="description"] li').forEach((el) => {
          const text = el.textContent?.trim() ?? "";
          const colonIdx = text.indexOf(":");
          if (colonIdx > 0 && colonIdx < 60) {
            specs[text.slice(0, colonIdx).trim()] = text.slice(colonIdx + 1).trim();
          }
        });
        return specs;
      })()
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
    function genericDomPrice() {
      const saleSelectors = [
        '[class*="sale-price"]',
        '[class*="selling-price"]',
        '[class*="current-price"]',
        '[class*="price-current"]',
        '[class*="price-now"]',
        '[class*="price__current"]',
        '[data-testid*="price"]:not([data-testid*="original"]):not([data-testid*="was"])',
        '[class*="product-price"]:not([class*="was"]):not([class*="old"]):not([class*="original"])'
      ];
      for (const sel of saleSelectors) {
        const el = document.querySelector(sel);
        const content2 = el?.getAttribute("content") ?? el?.getAttribute("data-price") ?? el?.textContent?.trim();
        if (content2) {
          const r = parsePrice(content2);
          if (r.price != null) return r;
        }
      }
      const itemprop = document.querySelector('[itemprop="price"]');
      const content = itemprop?.getAttribute("content") ?? itemprop?.getAttribute("data-price") ?? itemprop?.textContent?.trim();
      return content ? parsePrice(content) : { price: null, currency: "USD" };
    }
    function textScanPrice() {
      const h1 = document.querySelector("h1");
      if (!h1) return { price: null, currency: "USD" };
      let scope = h1.parentElement;
      for (let i = 0; i < 3 && scope; i++) {
        const text = scope.innerText ?? "";
        const result = scanTextForPrice(text);
        if (result.price != null) return result;
        scope = scope.parentElement;
      }
      return { price: null, currency: "USD" };
    }
    function scanTextForPrice(text) {
      const pricePattern = /([€$£])\s?([\d.,]+)/g;
      const matches = [];
      let m;
      while ((m = pricePattern.exec(text)) !== null) {
        const symbol = m[1];
        const currency = symbol === "\u20AC" ? "EUR" : symbol === "\xA3" ? "GBP" : "USD";
        const parsed = parsePrice(m[0]);
        if (parsed.price != null && parsed.price > 0) {
          matches.push({ price: parsed.price, currency });
        }
      }
      if (matches.length === 0) return { price: null, currency: "USD" };
      return matches.reduce((min, p) => p.price < min.price ? p : min);
    }
    const domFallback = (storeData.price ?? jsonLd.price ?? og.price) == null ? genericDomPrice() : null;
    const textFallback = (storeData.price ?? jsonLd.price ?? og.price ?? domFallback?.price) == null ? textScanPrice() : null;
    const merged = {
      name: storeData.name ?? jsonLd.name ?? og.name ?? document.title ?? "Unknown product",
      price: storeData.price ?? jsonLd.price ?? og.price ?? domFallback?.price ?? textFallback?.price ?? null,
      currency: storeData.currency ?? jsonLd.currency ?? og.currency ?? domFallback?.currency ?? textFallback?.currency ?? "USD",
      image_url: allImages[0] ?? storeData.image_url ?? jsonLd.image_url ?? og.image_url ?? null,
      images: allImages,
      product_url: productUrl,
      store_name: storeName,
      store_domain: domain,
      specs: (() => {
        const jsonLdSpecs = jsonLd.specs ?? {};
        const domSpecs = storeData.specs ?? {};
        const merged2 = { ...jsonLdSpecs, ...domSpecs };
        const jsonLdSize = jsonLdSpecs["size"] ?? "";
        const domSize = domSpecs["size"] ?? "";
        if (jsonLdSize && domSize) {
          const jsonLdCount = jsonLdSize.split(",").length;
          const domCount = domSize.split(",").length;
          if (jsonLdCount > domCount) merged2["size"] = jsonLdSize;
        }
        return normalizeSpecs(merged2);
      })()
    };
    merged.name = merged.name.trim().slice(0, 300);
    const generic = extractGenericSizeColor();
    if (generic.size) {
      const tokens = generic.size.split(",").map((s) => s.trim()).filter(Boolean);
      const allValidSizes = tokens.every((t) => SIZE_VAL.test(t));
      if (allValidSizes) {
        const existingCount = (merged.specs["Size"] ?? "").split(",").filter((s) => s.trim()).length;
        if (!merged.specs["Size"] || tokens.length > existingCount) merged.specs["Size"] = generic.size;
      }
    }
    if (!merged.specs["Color"] && generic.color) merged.specs["Color"] = generic.color;
    return merged;
  }

  // src/content.ts
  var BUTTON_ID = "comparecart-save-btn";
  var TOAST_ID = "comparecart-toast";
  var bestSizeForUrl = { url: "", size: "", count: 0 };
  function isOwnApp() {
    try {
      return window.location.origin === new URL(APP_URL).origin;
    } catch {
      return false;
    }
  }
  function isLikelyProductPage() {
    if (document.querySelector('script[type="application/ld+json"]')) return true;
    if (document.querySelector('meta[property="og:type"][content="product"]')) return true;
    if (document.querySelector('[itemprop="offers"], [itemprop="price"]')) return true;
    if (/\/dp\/[A-Z0-9]{10}/i.test(window.location.pathname) && document.getElementById("productTitle")) return true;
    return false;
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
    if (isOwnApp()) return;
    if (!isLikelyProductPage()) return;
    const btn = createButton();
    btn.addEventListener("click", () => handleSave(btn));
    document.documentElement.appendChild(btn);
  }
  function tryUpdateSavedPrice() {
    if (!chrome.runtime?.id) return;
    if (isOwnApp()) return;
    try {
      const product = extractProduct();
      if (product.price == null && Object.keys(product.specs ?? {}).length === 0) return;
      const currentSize = product.specs["Size"] ?? "";
      const sizeTokens = currentSize.split(",").filter((s) => s.trim()).length;
      if (product.product_url === bestSizeForUrl.url) {
        if (sizeTokens > bestSizeForUrl.count) {
          bestSizeForUrl = { url: product.product_url, size: currentSize, count: sizeTokens };
        } else if (sizeTokens < bestSizeForUrl.count && bestSizeForUrl.count > 0) {
          product.specs["Size"] = bestSizeForUrl.size;
        }
      } else {
        bestSizeForUrl = { url: product.product_url, size: currentSize, count: sizeTokens };
      }
      chrome.runtime.sendMessage({
        type: "UPDATE_PRICE_IF_SAVED",
        url: product.product_url,
        price: product.price,
        currency: product.currency,
        specs: product.specs
      });
      chrome.runtime.sendMessage({
        type: "ENRICH_PRODUCT",
        url: product.product_url,
        price: product.price,
        currency: product.currency,
        specs: product.specs
      });
    } catch {
    }
  }
  function initWithRetry() {
    init();
    for (const delay of [2e3, 5e3, 8e3]) {
      window.setTimeout(() => {
        init();
        tryUpdateSavedPrice();
      }, delay);
    }
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
  if (!isOwnApp()) {
    if (chrome.runtime?.id) {
      const startAfterLoad = () => {
        initWithRetry();
        window.setTimeout(() => {
          let lastUrl = location.href;
          const observer = new MutationObserver(() => {
            if (!chrome.runtime?.id) {
              observer.disconnect();
              return;
            }
            if (location.href !== lastUrl) {
              lastUrl = location.href;
              document.getElementById(BUTTON_ID)?.remove();
              bestSizeForUrl = { url: "", size: "", count: 0 };
              window.setTimeout(init, 600);
            }
          });
          observer.observe(document.documentElement, { childList: true, subtree: true });
        }, 3e3);
      };
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startAfterLoad);
      } else {
        startAfterLoad();
      }
    }
  }
})();
