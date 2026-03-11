let mapInstance = null;
let markersLayer = null;

async function loadBases() {
  try {
    const response = await fetch("/api/bases", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Ошибка загрузки данных");
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

function getUniqueValues(data, key) {
  const set = new Set();
  data.forEach((item) => {
    const value = item[key];
    if (Array.isArray(value)) {
      value.forEach((v) => set.add(v));
    } else if (value) {
      set.add(value);
    }
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
}

function describePriceRange(base) {
  if (!base.priceFrom && !base.priceTo) return "цена по запросу";
  if (base.priceFrom && base.priceTo) {
    return `${base.priceFrom.toLocaleString("ru-RU")}–${base.priceTo.toLocaleString(
      "ru-RU"
    )} ₽ / ночь`;
  }
  if (base.priceFrom) {
    return `от ${base.priceFrom.toLocaleString("ru-RU")} ₽ / ночь`;
  }
  return `до ${base.priceTo.toLocaleString("ru-RU")} ₽ / ночь`;
}

function getPriceBucket(base) {
  const from = base.priceFrom || base.priceTo || 0;
  if (from <= 3000) return 1;
  if (from <= 6000) return 2;
  if (from <= 10000) return 3;
  return 4;
}

function buildSummaryText(filtered, all) {
  if (!filtered.length) {
    return "Попробуйте изменить фильтры или Очистить поиск.";
  }

  const regions = getUniqueValues(filtered, "region");
  const types = getUniqueValues(filtered, "accommodationType");
  const avgPrice =
    filtered.reduce((sum, item) => sum + (item.priceFrom || 0), 0) /
    Math.max(filtered.length, 1);

  const parts = [];
  parts.push(
    `Сейчас показано ${filtered.length} из ${all.length} баз отдыха.`
  );
  if (regions.length) {
    parts.push(`Районы: ${regions.slice(0, 3).join(", ")}.`);
  }
  if (types.length) {
    parts.push(`Типы размещения: ${types.slice(0, 4).join(", ")}.`);
  }
  if (avgPrice) {
    parts.push(
      `Средняя стартовая цена — примерно ${Math.round(
        avgPrice
      ).toLocaleString("ru-RU")} ₽ за ночь.`
    );
  }
  return parts.join(" ");
}

function renderCards(data) {
  const container = document.getElementById("cardsContainer");
  container.innerHTML = "";

  if (!data.length) {
    const div = document.createElement("div");
    div.className = "no-results";
    div.innerHTML =
      "<strong>Ничего не найдено.</strong> Попробуйте изменить фильтры, снять часть опций или очистить строку поиска.";
    container.appendChild(div);
    return;
  }

  data.forEach((base) => {
    const card = document.createElement("article");
    card.className = "card";
    if (base.id != null) {
      card.dataset.id = String(base.id);
    }

    const header = document.createElement("div");
    header.className = "card-header";

    const titleRow = document.createElement("div");
    titleRow.className = "card-title-row";

    const title = document.createElement("h3");
    title.textContent = base.name;

    const badge = document.createElement("div");
    badge.className = "card-badge";
    badge.textContent = base.season || "Круглый год";

    titleRow.appendChild(title);
    titleRow.appendChild(badge);

    const location = document.createElement("div");
    location.className = "card-location";
    const distance =
      typeof base.distanceFromCityKm === "number"
        ? `, ~${base.distanceFromCityKm} км от ${base.nearestCity}`
        : "";
    location.textContent = `${base.region}${distance}`;

    header.appendChild(titleRow);
    header.appendChild(location);

    const body = document.createElement("div");
    body.className = "card-body";

    const description = document.createElement("p");
    description.textContent = base.description;
    description.style.margin = "0 0 4px";
    description.style.fontSize = "0.88rem";
    description.style.color = "#d1d5db";

    const chips = document.createElement("div");
    chips.className = "chips";

    (base.accommodationType || []).forEach((t) => {
      const chip = document.createElement("span");
      chip.className = "chip chip--accent";
      chip.textContent = t;
      chips.appendChild(chip);
    });

    (base.features || []).forEach((f) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = f.replace("_", " ");
      chips.appendChild(chip);
    });

    const metaRow = document.createElement("div");
    metaRow.className = "meta-row";

    const price = document.createElement("div");
    price.className = "price";
    price.textContent = describePriceRange(base);

    const rating = document.createElement("div");
    rating.className = "rating";
    rating.textContent = base.rating ? `★ ${base.rating.toFixed(1)}` : "";

    metaRow.appendChild(price);
    metaRow.appendChild(rating);

    body.appendChild(description);
    body.appendChild(chips);
    body.appendChild(metaRow);

    const footer = document.createElement("div");
    footer.className = "card-footer";

    const actions = document.createElement("div");
    actions.className = "card-actions";

    if (base.website) {
      const siteBtn = document.createElement("a");
      siteBtn.href = base.website;
      siteBtn.target = "_blank";
      siteBtn.rel = "noopener noreferrer";
      siteBtn.className = "btn btn-primary";
      siteBtn.textContent = "Сайт базы";
      actions.appendChild(siteBtn);
    }

    if (base.mapsLink) {
      const mapBtn = document.createElement("a");
      mapBtn.href = base.mapsLink;
      mapBtn.target = "_blank";
      mapBtn.rel = "noopener noreferrer";
      mapBtn.className = "btn btn-ghost";
      mapBtn.textContent = "На карте";
      actions.appendChild(mapBtn);
    }

    if (!actions.children.length) {
      const stub = document.createElement("span");
      stub.style.fontSize = "0.78rem";
      stub.style.color = "#6b7280";
      stub.textContent = "Контакты можно добавить позже.";
      actions.appendChild(stub);
    }

    const season = document.createElement("div");
    season.style.fontSize = "0.78rem";
    season.style.color = "#9ca3af";
    season.textContent = base.water || "";

    footer.appendChild(actions);
    footer.appendChild(season);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);

    container.appendChild(card);
  });
}

function applyFilters(data, filters) {
  return data.filter((base) => {
    if (filters.search) {
      const needle = filters.search.toLowerCase();
      const haystack = [
        base.name,
        base.region,
        base.water,
        base.nearestCity,
        base.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(needle)) return false;
    }

    if (filters.region && base.region !== filters.region) {
      return false;
    }

    if (filters.type) {
      const types = base.accommodationType || [];
      if (!types.includes(filters.type)) return false;
    }

    if (filters.priceBucket) {
      const bucket = getPriceBucket(base);
      if (bucket !== filters.priceBucket) return false;
    }

    if (filters.features && filters.features.length) {
      const baseFeatures = new Set(base.features || []);
      const everySelected = filters.features.every((f) => baseFeatures.has(f));
      if (!everySelected) return false;
    }

    return true;
  });
}

function fillFilterOptions(data) {
  const regionSelect = document.getElementById("regionSelect");
  const typeSelect = document.getElementById("typeSelect");

  const regions = getUniqueValues(data, "region");
  const types = getUniqueValues(data, "accommodationType");

  regions.forEach((region) => {
    const opt = document.createElement("option");
    opt.value = region;
    opt.textContent = region;
    regionSelect.appendChild(opt);
  });

  types.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    typeSelect.appendChild(opt);
  });
}

function initMap(allBases) {
  const mapContainer = document.getElementById("map");
  if (!mapContainer || typeof L === "undefined") {
    return;
  }

  if (!mapInstance) {
    mapInstance = L.map("map").setView([54.5, 56.1], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapInstance);
  }

  if (markersLayer) {
    markersLayer.clearLayers();
  } else {
    markersLayer = L.layerGroup().addTo(mapInstance);
  }

  const markers = [];

  allBases.forEach((base) => {
    if (typeof base.lat === "number" && typeof base.lng === "number") {
      const marker = L.marker([base.lat, base.lng]);
      marker.bindPopup(
        `<strong>${base.name}</strong><br />${base.region || ""}`
      );
      marker.on("click", () => {
        const card = document.querySelector(`[data-id="${base.id}"]`);
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.classList.add("card--highlight");
          setTimeout(() => card.classList.remove("card--highlight"), 1200);
        }
      });
      marker.addTo(markersLayer);
      markers.push(marker);
    }
  });

  if (markers.length) {
    const group = L.featureGroup(markers);
    mapInstance.fitBounds(group.getBounds().pad(0.2));
  }

  const latInput = document.getElementById("lat");
  const lngInput = document.getElementById("lng");
  if (latInput && lngInput) {
    mapInstance.off("click");
    mapInstance.on("click", (e) => {
      latInput.value = e.latlng.lat.toFixed(6);
      lngInput.value = e.latlng.lng.toFixed(6);
    });
  }
}

function updateMap(filteredBases) {
  if (!mapInstance || !markersLayer || typeof L === "undefined") return;

  markersLayer.clearLayers();
  const markers = [];

  filteredBases.forEach((base) => {
    if (typeof base.lat === "number" && typeof base.lng === "number") {
      const marker = L.marker([base.lat, base.lng]);
      marker.bindPopup(
        `<strong>${base.name}</strong><br />${base.region || ""}`
      );
      marker.on("click", () => {
        const card = document.querySelector(`[data-id="${base.id}"]`);
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.classList.add("card--highlight");
          setTimeout(() => card.classList.remove("card--highlight"), 1200);
        }
      });
      marker.addTo(markersLayer);
      markers.push(marker);
    }
  });

  if (markers.length) {
    const group = L.featureGroup(markers);
    mapInstance.fitBounds(group.getBounds().pad(0.2));
  }
}

function setupApp(initialBases) {
  let allBases = [...initialBases];
  const searchInput = document.getElementById("searchInput");
  const regionSelect = document.getElementById("regionSelect");
  const typeSelect = document.getElementById("typeSelect");
  const priceSelect = document.getElementById("priceSelect");
  const featuresSelect = document.getElementById("featuresSelect");
  const resetBtn = document.getElementById("resetFiltersBtn");
  const totalCount = document.getElementById("totalCount");
  const summaryText = document.getElementById("summaryText");
  const formEl = document.getElementById("baseForm");
  const toggleFormBtn = document.getElementById("toggleFormBtn");

  function collectFilters() {
    const selectedFeatures = Array.from(featuresSelect.selectedOptions).map(
      (o) => o.value
    );

    const priceBucket = priceSelect.value
      ? parseInt(priceSelect.value, 10)
      : null;

    return {
      search: searchInput.value.trim(),
      region: regionSelect.value,
      type: typeSelect.value,
      priceBucket,
      features: selectedFeatures,
    };
  }

  function render() {
    const filters = collectFilters();
    const filtered = applyFilters(allBases, filters);
    totalCount.textContent = filtered.length.toString();
    summaryText.textContent = buildSummaryText(filtered, allBases);
    renderCards(filtered);
    updateMap(filtered);
  }

  searchInput.addEventListener("input", () => {
    render();
  });

  [regionSelect, typeSelect, priceSelect, featuresSelect].forEach((el) => {
    el.addEventListener("change", render);
  });

  resetBtn.addEventListener("click", () => {
    searchInput.value = "";
    regionSelect.value = "";
    typeSelect.value = "";
    priceSelect.value = "";
    Array.from(featuresSelect.options).forEach((o) => {
      o.selected = false;
    });
    render();
  });

  fillFilterOptions(allBases);
  initMap(allBases);
  render();

  if (toggleFormBtn && formEl) {
    toggleFormBtn.addEventListener("click", () => {
      const isHidden = formEl.style.display === "none";
      formEl.style.display = isHidden ? "grid" : "none";
    });
  }

  if (formEl) {
    formEl.addEventListener("submit", (event) => {
      event.preventDefault();

      const name = document.getElementById("baseName").value.trim();
      const region = document.getElementById("baseRegion").value.trim();
      if (!name || !region) {
        alert("Заполните минимум название и район базы.");
        return;
      }

      const water = document.getElementById("baseWater").value.trim();
      const typesRaw = document.getElementById("baseTypes").value.trim();
      const priceFromVal = document.getElementById("priceFrom").value;
      const priceToVal = document.getElementById("priceTo").value;
      const featuresRaw = document.getElementById("baseFeatures").value.trim();
      const season = document.getElementById("season").value.trim();
      const distanceVal = document.getElementById("distance").value;
      const nearestCity = document.getElementById("nearestCity").value.trim();
      const website = document.getElementById("website").value.trim();
      const mapsLink = document.getElementById("mapsLink").value.trim();
      const latVal = document.getElementById("lat").value;
      const lngVal = document.getElementById("lng").value;

      const parseList = (str) =>
        str
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

      const newBase = {
        name,
        region,
        water: water || "",
        accommodationType: parseList(typesRaw),
        priceFrom: priceFromVal ? Number(priceFromVal) : undefined,
        priceTo: priceToVal ? Number(priceToVal) : undefined,
        features: parseList(featuresRaw),
        rating: undefined,
        season: season || "круглый год",
        distanceFromCityKm: distanceVal ? Number(distanceVal) : undefined,
        nearestCity: nearestCity || "",
        website,
        mapsLink,
        lat: latVal ? Number(latVal) : undefined,
        lng: lngVal ? Number(lngVal) : undefined,
        description: "Новая база, добавленная через интерфейс.",
      };

      fetch("/api/bases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newBase),
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error("Ошибка сохранения базы на сервере");
          }
          return res.json();
        })
        .then((created) => {
          allBases = [...allBases, created];

          document.getElementById("baseName").value = "";
          document.getElementById("baseRegion").value = "";
          document.getElementById("baseWater").value = "";
          document.getElementById("baseTypes").value = "";
          document.getElementById("priceFrom").value = "";
          document.getElementById("priceTo").value = "";
          document.getElementById("baseFeatures").value = "";
          document.getElementById("season").value = "";
          document.getElementById("distance").value = "";
          document.getElementById("nearestCity").value = "";
          document.getElementById("website").value = "";
          document.getElementById("mapsLink").value = "";
          document.getElementById("lat").value = "";
          document.getElementById("lng").value = "";

          fillFilterOptions(allBases);
          initMap(allBases);
          render();
        })
        .catch((err) => {
          console.error(err);
          alert("Не удалось сохранить базу на сервере. Проверьте, что сервер запущен.");
        });
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const bases = await loadBases();
  setupApp(bases);
});

