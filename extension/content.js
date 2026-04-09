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
              const valid = source.offers.filter((o) => o.price != null);
              if (valid.length > 0) {
                offer = valid.reduce((min, o) => parseFloat(o.price) < parseFloat(min.price) ? o : min);
              }
            }
          }
          const { price, currency } = parsePrice(offer?.price);
          const images = Array.isArray(item.image) ? item.image.filter((i) => typeof i === "string") : typeof item.image === "string" ? [item.image] : [];
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
          if (source !== item) extractAdditionalProps(source);
          const tryStr = (v) => typeof v === "string" && v ? v : typeof v === "object" && v !== null ? typeof v.value === "string" ? v.value : typeof v.name === "string" ? v.name : null : null;
          for (const field of ["material", "color", "size"]) {
            const v = tryStr(item[field] ?? source[field]);
            if (v) rawSpecs[field] = v;
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
      // Price handled by extractFromJsonLd() via ProductGroup > hasVariant[0] > offers
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
        return specs;
      })()
    }),
    "sephora.": () => ({
      name: document.querySelector('h1[class*="product"], h1[data-comp*="Name"], .product-name h1, h1')?.textContent?.trim() ?? null,
      price: (() => {
        const raw = document.querySelector('[data-comp="Price"] [class*="current"], [class*="product-price"] .value, [itemprop="price"], [class*="price-sales"], [class*="price__value"]')?.textContent ?? document.querySelector('meta[itemprop="price"]')?.content ?? document.querySelector('meta[property="product:price:amount"]')?.content;
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
      specs: normalizeSpecs({
        ...jsonLd.specs ?? {},
        // JSON-LD as base (generic, works on any site)
        ...storeData.specs ?? {}
        // Store-specific overrides (more precise)
      })
    };
    merged.name = merged.name.trim().slice(0, 300);
    return merged;
  }

  // src/content.ts
  var BUTTON_ID = "comparecart-save-btn";
  var TOAST_ID = "comparecart-toast";
  function isOwnApp() {
    try {
      return window.location.origin === new URL(APP_URL).origin;
    } catch {
      return false;
    }
  }
  function isLikelyProductPage() {
    const hasJsonLd = !!document.querySelector('script[type="application/ld+json"]');
    const hasOgProduct = !!document.querySelector('meta[property="og:type"][content="product"]');
    return hasJsonLd || hasOgProduct;
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
      chrome.runtime.sendMessage({
        type: "UPDATE_PRICE_IF_SAVED",
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
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initWithRetry);
    } else {
      initWithRetry();
    }
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
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
  }
})();
