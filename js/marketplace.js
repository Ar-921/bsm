/**
 * marketplace.js
 * Handles the logic for the Websites/Marketplace page including:
 * - Fetching Google Sheet data safely
 * - Rendering with pagination
 * - Filtering logic
 * - Cart management
 */

let allWebsites = [];
let filteredWebsites = [];
let currentPage = 1;
const itemsPerPage = 50;
let cart = JSON.parse(localStorage.getItem("bsm_cart") || "[]");

// ----------------------------------------
// DATA FETCHING (Using robust Google Visualization API via JSONP)
// ----------------------------------------
// We use JSONP to bypass CORS restrictions when the file is opened locally (file://).

function loadMarketplaceData() {
    updateCartCount();
    const tbody = document.querySelector("#websitesBody");
    if (!tbody) return;

    // Create a unique callback function name
    const callbackName = 'gvizCallback_' + Date.now();

    // Define the callback globally
    window[callbackName] = function (jsonData) {
        // Cleanup script tag
        const scriptEl = document.getElementById(callbackName);
        if (scriptEl) scriptEl.remove();
        delete window[callbackName];

        try {
            if (!jsonData || !jsonData.table || !jsonData.table.rows) {
                throw new Error("Invalid data format from Google Sheets");
            }

            const headers = jsonData.table.cols.map(c => c ? c.label : "");
            const mappedData = [];

            jsonData.table.rows.forEach(row => {
                if (!row || !row.c) return;
                const siteObj = {};
                headers.forEach((colName, index) => {
                    const cell = row.c[index];
                    siteObj[colName] = (cell && cell.v !== null && cell.v !== undefined) ? cell.v : "";
                });
                // Only push valid websites
                if (siteObj["WEBSITE"] && String(siteObj["WEBSITE"]).trim() !== "") {
                    mappedData.push(siteObj);
                }
            });

            console.log("✅ Loaded Rows via JSONP:", mappedData.length);
            allWebsites = mappedData;
            filteredWebsites = [...allWebsites];

            populateCategoryFilter();
            renderTablePage();

        } catch (e) {
            console.error("Error processing GViz data:", e);
            showLoadError();
        }
    };

    // Construct JSONP script
    const script = document.createElement('script');
    script.id = callbackName;
    script.src = `https://docs.google.com/spreadsheets/d/1xvC3V5g5Bv11UbEHbWBfEgxGL6lN9YrUyuui5eOQqFg/gviz/tq?tqx=out:json;responseHandler:${callbackName}&sheet=Total%20Websites`;

    script.onerror = function () {
        console.error("JSONP script failed to load (network or CORS issue).");
        showLoadError();
        delete window[callbackName];
    };

    document.body.appendChild(script);
}

function showLoadError() {
    const loader = document.getElementById("tableLoader");
    if (loader) {
        loader.style.display = "block";
        loader.innerHTML = `<h5 class="text-danger">Failed to load data. Please refresh...</h5>`;
    }
}

// ----------------------------------------
// RENDER & PAGINATION
// ----------------------------------------
function renderTablePage() {
    const tbody = document.querySelector("#websitesBody");
    const loader = document.getElementById("tableLoader");
    const tableWrap = document.getElementById("tableWrapper");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (loader && filteredWebsites.length > 0) loader.style.display = "none";
    if (tableWrap) tableWrap.classList.remove("d-none");

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = filteredWebsites.slice(startIndex, endIndex);

    if (paginatedItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="text-center py-5">No websites match your filters.</td></tr>`;
    }

    paginatedItems.forEach((site, index) => {
        const websiteDomain = site["WEBSITE"] || "-";
        const price = site["PayPal"] ? `$${site["PayPal"]}` : "-";
        const rawPrice = site["PayPal"] ? parseFloat(site["PayPal"]) : 0;

        // Ensure to escape quotes if present in domain
        const safeDomain = String(websiteDomain).replace(/"/g, '&quot;');
        const rowId = `site-details-${index}`;

        const row = `
        <tr class="fade-in align-middle">
            <td class="text-start fw-bold">
                <a href="https://${websiteDomain}" target="_blank" class="text-primary text-decoration-none site-link">
                    ${websiteDomain}
                </a>
            </td>
            <td class="d-none d-lg-table-cell"><span class="badge-metric">${site["DA"] || "-"}</span></td>
            <td class="d-none d-lg-table-cell"><span class="badge-metric">${site["AHRF DR"] || "-"}</span></td>
            <td class="d-none d-lg-table-cell">${site["AHRF TF"] || "-"}</td>
            <td class="d-none d-lg-table-cell">${site["Spam Score"] || "-"}</td>
            <td class="d-none d-lg-table-cell"><span class="traffic-badge">${site["Base Traffic"] || "-"}</span></td>
            <td class="d-none d-lg-table-cell"><span class="category-badge">${site["CATEGORY"] || "-"}</span></td>
            <td class="d-none d-lg-table-cell">${site["DOFOLLOW"] || "-"}</td>
            <td class="d-none d-lg-table-cell">${site["SPONSORED"] || "-"}</td>
            <td class="d-none d-lg-table-cell">${site["INDEXING"] || "-"}</td>
            
            <td class="d-lg-none text-center">
                <button class="btn btn-sm btn-light border d-flex justify-content-center align-items-center mx-auto text-secondary shadow-sm" type="button" data-bs-toggle="collapse" data-bs-target="#${rowId}" aria-expanded="false" aria-controls="${rowId}" style="width: 30px; height: 30px; border-radius: 8px;">
                    <iconify-icon icon="lucide:chevron-down" class="fs-6"></iconify-icon>
                </button>
            </td>

            <td class="text-center align-middle pe-4" style="min-width: 140px;">
                <div class="d-flex align-items-center justify-content-end gap-2">
                    <span class="fw-bold text-success me-2">${price}</span>
                    <button class="btn btn-sm btn-primary rounded-pill px-3 d-flex align-items-center justify-content-center shadow-sm"
                        title="Add to Cart" onclick="addToCart('${safeDomain}', ${rawPrice}, 'Link Insertion')">
                        <iconify-icon icon="lucide:shopping-cart"></iconify-icon>
                    </button>
                    <button class="btn btn-sm btn-primary rounded-pill px-3 shadow-sm"
                        onclick="buyNow('${safeDomain}', ${rawPrice}, 'Link Insertion')">Buy</button>
                </div>
            </td>
        </tr>
        
        <!-- Mobile Expandable Info Row -->
        <tr id="${rowId}" class="collapse d-lg-none border-0">
            <td colspan="3" class="p-0 border-0 bg-transparent">
                <div class="collapse-inner px-4 py-3 border border-light shadow-sm mt-1 mb-3 rounded-4 mx-2" style="background: linear-gradient(145deg, #ffffff, #f8f9fa);">
                    <div class="row g-2 fs-8">
                        <div class="col-6 d-flex flex-column py-1 border-bottom border-light"><span class="text-muted fw-semibold">DA</span> <span class="fw-bold text-dark fs-7">${site["DA"] || "-"}</span></div>
                        <div class="col-6 d-flex flex-column py-1 border-bottom border-light"><span class="text-muted fw-semibold">DR</span> <span class="fw-bold text-dark fs-7">${site["AHRF DR"] || "-"}</span></div>
                        <div class="col-6 d-flex flex-column py-1 border-bottom border-light"><span class="text-muted fw-semibold">Traffic Limit</span> <span class="fw-bold text-dark">${site["Base Traffic"] || "-"}</span></div>
                        <div class="col-6 d-flex flex-column py-1 border-bottom border-light"><span class="text-muted fw-semibold">Spam Score</span> <span class="fw-bold text-dark">${site["Spam Score"] || "-"}</span></div>
                        <div class="col-6 d-flex flex-column py-1 border-bottom border-light"><span class="text-muted fw-semibold">Trust Flow (<span class="text-lowercase">tf</span>)</span> <span class="fw-bold text-dark">${site["AHRF TF"] || "-"}</span></div>
                        <div class="col-6 d-flex flex-column py-1 border-bottom border-light"><span class="text-muted fw-semibold">Category</span> <span class="fw-bold text-primary">${site["CATEGORY"] || "-"}</span></div>
                        <div class="col-6 d-flex flex-column py-1"><span class="text-muted fw-semibold">Dofollow</span> <span class="fw-bold text-dark">${site["DOFOLLOW"] || "-"}</span></div>
                        <div class="col-6 d-flex flex-column py-1"><span class="text-muted fw-semibold">Sponsored</span> <span class="fw-bold text-dark">${site["SPONSORED"] || "-"}</span></div>
                        <div class="col-12 d-flex flex-column py-1"><span class="text-muted fw-semibold">Indexing</span> <span class="fw-bold text-dark">${site["INDEXING"] || "-"}</span></div>
                    </div>
                </div>
            </td>
        </tr>
        `;
        tbody.insertAdjacentHTML("beforeend", row);
    });

    renderPaginationControls();
}

function renderPaginationControls() {
    const paginationContainer = document.getElementById("paginationControls");
    if (!paginationContainer) return;

    paginationContainer.innerHTML = "";

    const totalPages = Math.ceil(filteredWebsites.length / itemsPerPage);
    if (totalPages <= 1) return;

    let html = `<ul class="pagination justify-content-center mt-4">`;

    // Prev
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <button class="page-link" onclick="changePage(${currentPage - 1})">Previous</button>
        </li>
    `;

    // Dynamic Page Numbers (Simplified to avoid 200 page buttons)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        html += `<li class="page-item"><button class="page-link" onclick="changePage(1)">1</button></li>`;
        if (startPage > 2) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <button class="page-link" onclick="changePage(${i})">${i}</button>
            </li>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        html += `<li class="page-item"><button class="page-link" onclick="changePage(${totalPages})">${totalPages}</button></li>`;
    }

    // Next
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <button class="page-link" onclick="changePage(${currentPage + 1})">Next</button>
        </li>
    `;

    html += `</ul>`;
    paginationContainer.innerHTML = html;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredWebsites.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTablePage();
    document.querySelector('.websites-hero').scrollIntoView({ behavior: 'smooth' });
}


// ----------------------------------------
// FILTERING
// ----------------------------------------
function populateCategoryFilter() {
    const categoryFilter = document.getElementById("filterCategory");
    const regionFilter = document.getElementById("filterRegion");
    if (!categoryFilter) return;

    const categories = new Set();
    const regions = new Set();

    allWebsites.forEach(site => {
        if (site["CATEGORY"]) categories.add(site["CATEGORY"].trim());
        if (site["Base Traffic"]) regions.add(site["Base Traffic"].trim());
    });

    const sortedCats = Array.from(categories).sort();
    sortedCats.forEach(cat => {
        categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
    });

    if (regionFilter) {
        const sortedRegions = Array.from(regions).sort();
        sortedRegions.forEach(reg => {
            regionFilter.innerHTML += `<option value="${reg}">${reg}</option>`;
        });
    }
}

function applyFilters() {
    const search = document.getElementById("searchInput")?.value.toLowerCase() || "";

    // Bounds parsing
    const minDa = document.getElementById("filterMinDa")?.value ? parseInt(document.getElementById("filterMinDa").value) : 0;
    const maxDa = document.getElementById("filterMaxDa")?.value ? parseInt(document.getElementById("filterMaxDa").value) : 100;

    const minDr = document.getElementById("filterMinDr")?.value ? parseInt(document.getElementById("filterMinDr").value) : 0;
    const maxDr = document.getElementById("filterMaxDr")?.value ? parseInt(document.getElementById("filterMaxDr").value) : 100;

    const minTraffic = document.getElementById("filterMinTraffic")?.value ? parseInt(document.getElementById("filterMinTraffic").value) : 0;
    const maxTraffic = document.getElementById("filterMaxTraffic")?.value ? parseInt(document.getElementById("filterMaxTraffic").value) : 999999999;

    const minPrice = document.getElementById("filterMinPrice")?.value ? parseInt(document.getElementById("filterMinPrice").value) : 0;
    const maxPrice = document.getElementById("filterMaxPrice")?.value ? parseInt(document.getElementById("filterMaxPrice").value) : 999999999;

    const category = document.getElementById("filterCategory")?.value || "";
    const region = document.getElementById("filterRegion")?.value || "";

    filteredWebsites = allWebsites.filter(site => {
        const siteDomain = (site["WEBSITE"] || "").toLowerCase();
        const siteDa = parseInt(site["DA"]) || 0;
        const siteDr = parseInt(site["AHRF DR"]) || 0;

        let rawTraffic = String(site["AHRF TF"] || "0").toUpperCase();
        let parsedTraffic = parseFloat(rawTraffic.replace(/,/g, ''));
        if (rawTraffic.includes('K')) parsedTraffic *= 1000;
        if (rawTraffic.includes('M')) parsedTraffic *= 1000000;
        if (isNaN(parsedTraffic)) parsedTraffic = 0;

        const rawPrice = site["PayPal"] ? parseFloat(site["PayPal"]) : 0;

        const siteCategory = (site["CATEGORY"] || "").trim();
        const siteRegion = (site["Base Traffic"] || "").trim();

        const matchSearch = siteDomain.includes(search);
        const matchDa = siteDa >= minDa && siteDa <= maxDa;
        const matchDr = siteDr >= minDr && siteDr <= maxDr;
        const matchTraffic = parsedTraffic >= minTraffic && parsedTraffic <= maxTraffic;
        const matchPrice = rawPrice >= minPrice && rawPrice <= maxPrice;
        const matchCat = category === "" || siteCategory === category;
        const matchRegion = region === "" || siteRegion === region;

        return matchSearch && matchDa && matchDr && matchTraffic && matchPrice && matchCat && matchRegion;
    });

    currentPage = 1;
    renderTablePage();
}

// Attach Event Listeners for Filters
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("searchInput")?.addEventListener("input", applyFilters);
    document.querySelectorAll(".filter-input").forEach(input => {
        input.addEventListener("input", applyFilters);
        input.addEventListener("change", applyFilters);
    });
});

// ----------------------------------------
// CART && ECOMMERCE
// ----------------------------------------
function updateCartCount() {
    const counts = document.querySelectorAll(".cart-count");
    counts.forEach(c => {
        c.innerText = cart.length;
        if (cart.length > 0) {
            c.classList.add("bg-danger");
            c.classList.remove("bg-secondary");
        } else {
            c.classList.remove("bg-danger");
            c.classList.add("bg-secondary");
        }
    });
}

function saveCart() {
    localStorage.setItem("bsm_cart", JSON.stringify(cart));
    updateCartCount();
}

function addToCart(domain, price, type) {
    if (price <= 0) {
        alert("This item does not have a valid price.");
        return;
    }

    // Check if already in cart
    const existing = cart.find(i => i.domain === domain);
    if (!existing) {
        cart.push({
            id: Date.now().toString(),
            domain,
            price,
            type
        });
        saveCart();
        showToast(`Added ${domain} to cart!`);
    } else {
        showToast(`${domain} is already in the cart!`);
    }
}

function buyNow(domain, price, type) {
    addToCart(domain, price, type);
    window.location.href = "checkout.html";
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    saveCart();
    // Re-render cart page if on it
    if (typeof renderCartPage === 'function') {
        renderCartPage();
    }
}

// Simple Toast Notification system
function showToast(message) {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.style.cssText = `
            position: fixed; 
            bottom: 20px; 
            right: 20px; 
            z-index: 1050;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast align-items-center text-white bg-dark border-0 show";
    toast.role = "alert";
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          <iconify-icon icon="lucide:check-circle" class="me-2 text-success"></iconify-icon> ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close" onclick="this.parentElement.parentElement.remove()"></button>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 3000);
}

// Start fetching data
document.addEventListener("DOMContentLoaded", () => {
    loadMarketplaceData();
});
