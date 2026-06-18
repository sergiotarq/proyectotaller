/* ==========================================
   DRAKOTEC - INTERACTIVIDAD MULTI-PÁGINA
   ========================================== */

const API_URL = ''; // Ruta relativa para unificación de entornos

// SVGs Premium de Respaldo en caso de error de imagen
const SVGS_FALLBACK = {
    celulares: `
        <svg viewBox="0 0 120 180" width="100" height="120">
            <rect x="15" y="10" width="90" height="160" rx="18" fill="#1e1212" stroke="#dc2626" stroke-width="3"/>
            <rect x="18" y="13" width="84" height="154" rx="15" fill="#0f0505"/>
            <rect x="22" y="17" width="76" height="146" rx="11" fill="#381010"/>
            <rect x="45" y="22" width="30" height="7" rx="3.5" fill="#000"/>
        </svg>
    `,
    audio: `
        <svg viewBox="0 0 120 180" width="100" height="120">
            <path d="M 25 90 A 35 35 0 0 1 95 90" fill="none" stroke="#dc2626" stroke-width="6" stroke-linecap="round"/>
            <rect x="15" y="80" width="16" height="36" rx="8" fill="#1c1010" stroke="#d97706" stroke-width="2"/>
            <rect x="89" y="80" width="16" height="36" rx="8" fill="#1c1010" stroke="#d97706" stroke-width="2"/>
        </svg>
    `,
    smartwatches: `
        <svg viewBox="0 0 120 180" width="100" height="120">
            <rect x="46" y="15" width="28" height="150" rx="8" fill="#1c1010"/>
            <circle cx="60" cy="90" r="38" fill="#120a0a" stroke="#dc2626" stroke-width="3"/>
            <circle cx="60" cy="90" r="32" fill="#d97706" fill-opacity="0.8"/>
            <text x="60" y="94" fill="#ffffff" font-size="10" font-weight="700" text-anchor="middle">10:45</text>
        </svg>
    `,
    accesorios: `
        <svg viewBox="0 0 120 180" width="100" height="120">
            <rect x="35" y="45" width="50" height="80" rx="8" fill="#1c1010" stroke="#dc2626" stroke-width="2"/>
            <circle cx="60" cy="65" r="8" fill="#090505"/>
            <rect x="48" y="90" width="24" height="6" rx="1.5" fill="#d97706"/>
        </svg>
    `
};

const REPAIR_MODELS = {
    apple: [
        { name: "iPhone 15 Pro Max", priceMultiplier: 1.4 },
        { name: "iPhone 15", priceMultiplier: 1.25 },
        { name: "iPhone 14 Pro", priceMultiplier: 1.2 },
        { name: "iPhone 13", priceMultiplier: 1.05 },
        { name: "iPhone 12", priceMultiplier: 0.95 }
    ],
    samsung: [
        { name: "Galaxy S24 Ultra", priceMultiplier: 1.35 },
        { name: "Galaxy S23 Ultra", priceMultiplier: 1.2 },
        { name: "Galaxy S22", priceMultiplier: 1.0 },
        { name: "Galaxy A54", priceMultiplier: 0.8 },
        { name: "Galaxy A34", priceMultiplier: 0.7 }
    ],
    xiaomi: [
        { name: "Xiaomi 14 Ultra", priceMultiplier: 1.15 },
        { name: "Xiaomi 13T Pro", priceMultiplier: 0.95 },
        { name: "Redmi Note 13 Pro", priceMultiplier: 0.75 },
        { name: "Poco F5", priceMultiplier: 0.7 }
    ],
    motorola: [
        { name: "Edge 40 Pro", priceMultiplier: 1.05 },
        { name: "Moto G84", priceMultiplier: 0.75 },
        { name: "Moto G54", priceMultiplier: 0.65 },
        { name: "Edge 30", priceMultiplier: 0.8 }
    ]
};

const REPAIR_ISSUES = {
    screen: { name: "Cambio de Pantalla", basePrice: 100, time: "2 - 3 horas" },
    battery: { name: "Degradación de Batería", basePrice: 45, time: "1 - 2 horas" },
    port: { name: "Puerto de Carga", basePrice: 35, time: "1 hora" },
    camera: { name: "Cámara delantera/trasera", basePrice: 65, time: "24 horas" },
    diagnostic: { name: "Diagnóstico general", basePrice: 25, time: "24 - 48 horas" }
};

// ESTADO GLOBAL
let productosList = [];
let ordenesList = [];
let carrito = JSON.parse(localStorage.getItem('drakotec_cart')) || [];
let currentUser = JSON.parse(sessionStorage.getItem('drakotec_user')) || null;
let currentFilter = 'all';
let currentSort = 'default';

// ==========================================
// INICIALIZADOR POR PÁGINA ACTIVA
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // Inicialización compartida (Tema, Navbar, Badge de Carrito)
    initTheme();
    initNavbar();
    updateCartCountBadge();
    updatePortalNavLink();

    const path = window.location.pathname;

    // Detectar página
    if (path.endsWith('reparaciones.html')) {
        initRepairCalculator();
        initRepairTracker();
        fetchOrdenes();
    } 
    else if (path.endsWith('carrito.html')) {
        // Carga productos para cotejar precios reales y stock actualizados en el carrito
        await fetchProductos(false); // No renderiza catálogo general
        initCartPage();
    } 
    else if (path.endsWith('portal.html')) {
        // Si ya hay sesión activa, redirección automática
        if (currentUser) {
            window.location.replace(currentUser.role === 'admin' ? 'admin.html' : 'tecnico.html');
            return;
        }
        initPortalAuth();
    } 
    else if (path.endsWith('tecnico.html')) {
        initPortalForms();
        initLogoutBtn();
        fetchOrdenes();
    } 
    else if (path.endsWith('admin.html')) {
        initPortalForms();
        initLogoutBtn();
        fetchProductos(true); // Carga productos y renderiza tabla del administrador
    } 
    else if (path.endsWith('tienda.html')) {
        await fetchProductos(true); // Carga productos y renderiza catálogo de tienda
        initCatalogFilters();
    }
    else if (path.endsWith('contacto.html')) {
        initContactForms();
    }
    else {
        // Por defecto: index.html (Inicio y Showcase Hero)
    }
});

// ==========================================
// LÓGICA DE COMPORTAMIENTO COMPARTIDO
// ==========================================

// Alternancia de Tema Claro/Oscuro
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    const storedTheme = localStorage.getItem('drakotec_theme');
    if (storedTheme === 'light') {
        document.body.classList.add('light-mode');
        updateThemeIcon(true);
    } else {
        document.body.classList.remove('light-mode');
        updateThemeIcon(false);
    }

    themeToggle.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-mode');
        localStorage.setItem('drakotec_theme', isLight ? 'light' : 'dark');
        updateThemeIcon(isLight);
    });
}

function updateThemeIcon(isLight) {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    if (isLight) {
        themeToggle.innerHTML = `
            <svg class="icon-sun" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
        `;
    } else {
        themeToggle.innerHTML = `
            <svg class="icon-moon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
        `;
    }
}

// Inicializar la navegación responsiva
function initNavbar() {
    const header = document.getElementById('header');
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    }

    window.addEventListener('scroll', () => {
        // Solo aplicar scroll dinámico si no tiene la clase estática de scrolled obligatoria (ej: en subpáginas ya viene con clase scrolled)
        const isSubpage = window.location.pathname.endsWith('reparaciones.html') || 
                           window.location.pathname.endsWith('carrito.html') || 
                           window.location.pathname.endsWith('portal.html') || 
                           window.location.pathname.endsWith('tecnico.html') || 
                           window.location.pathname.endsWith('admin.html') ||
                           window.location.pathname.endsWith('tienda.html') ||
                           window.location.pathname.endsWith('contacto.html');
                           
        if (window.scrollY > 50 || isSubpage) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('open');
            menuToggle.classList.toggle('active');
            if (navMenu.classList.contains('open')) {
                menuToggle.children[0].style.transform = 'rotate(45deg) translate(5px, 6px)';
                menuToggle.children[1].style.opacity = '0';
                menuToggle.children[2].style.transform = 'rotate(-45deg) translate(5px, -6px)';
            } else {
                menuToggle.children[0].style.transform = 'none';
                menuToggle.children[1].style.opacity = '1';
                menuToggle.children[2].style.transform = 'none';
            }
        });
    }
}

// Sincronizar el badge del carrito en el navbar de todas las páginas
function updateCartCountBadge() {
    const cartCount = document.getElementById('cartCount');
    if (!cartCount) return;

    const totalItems = carrito.reduce((acc, curr) => acc + curr.quantity, 0);
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
}

// Ajustar el texto del enlace de portal según sesión activa
function updatePortalNavLink() {
    const link = document.getElementById('navPortalLink');
    if (!link) return;

    if (currentUser) {
        link.textContent = currentUser.role === 'admin' ? "Panel Admin" : "Panel Técnico";
        link.setAttribute('href', currentUser.role === 'admin' ? 'admin.html' : 'tecnico.html');
    } else {
        link.textContent = "Portal Personal";
        link.setAttribute('href', 'portal.html');
    }
}

// Botón de cerrar sesión para paneles protegidos
function initLogoutBtn() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('drakotec_user');
            currentUser = null;
            showToast("Sesión cerrada.");
            setTimeout(() => {
                window.location.replace('portal.html');
            }, 1000);
        });
    }
}

// ==========================================
// MÓDULO: TIENDA (CATÁLOGO EN INDEX.HTML)
// ==========================================
async function fetchProductos(render = true) {
    try {
        const res = await fetch(`${API_URL}/api/productos`);
        if (!res.ok) throw new Error("Error al obtener productos");
        productosList = await res.json();
        
        if (render) {
            const path = window.location.pathname;
            if (path.endsWith('admin.html')) {
                renderAdminProducts();
            } else if (path.endsWith('index.html') || path === '/' || path.endsWith('/') || path.endsWith('tienda.html')) {
                renderCatalog();
            }
        }
    } catch (err) {
        console.error(err);
        showToast("Error al conectar con la base de datos.", "danger");
    }
}

function renderCatalog() {
    const shopGrid = document.getElementById('shopGrid');
    if (!shopGrid) return;
    
    shopGrid.innerHTML = '';

    // Filtrar
    let filtered = currentFilter === 'all' 
        ? productosList 
        : productosList.filter(p => p.category === currentFilter);

    // Ordenar
    if (currentSort === 'price-asc') {
        filtered = [...filtered].sort((a, b) => a.price - b.price);
    } else if (currentSort === 'price-desc') {
        filtered = [...filtered].sort((a, b) => b.price - a.price);
    }

    filtered.forEach(p => {
        const isOutOfStock = p.stock <= 0;
        
        const card = document.createElement('div');
        card.className = `product-card glass-card`;
        card.setAttribute('data-id', p.id);
        
        const tagHtml = isOutOfStock
            ? `<span class="product-tag" style="background: var(--danger); color: #fff;">Agotado</span>`
            : p.stock <= 2 
                ? `<span class="product-tag" style="background: var(--warning); color: #000;">¡Pocas unidades!</span>`
                : '';

        const fallbackSvg = SVGS_FALLBACK[p.category] || SVGS_FALLBACK['accesorios'];

        card.innerHTML = `
            <div class="product-img-container">
                ${tagHtml}
                <div class="product-img-wrapper" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    <img src="${p.imagePath}" alt="${p.name}" style="max-height: 140px; object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div style="display: none;">${fallbackSvg}</div>
                </div>
            </div>
            <div class="product-details">
                <span class="product-category">${p.category}</span>
                <h4 class="product-title">${p.name}</h4>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 12px; height: 38px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                    ${p.specs}
                </p>
                <div class="product-meta">
                    <div>
                        <span class="product-price">${p.price.toLocaleString('es-BO')} Bs.</span>
                    </div>
                    <button class="btn btn-icon btn-add-cart" data-id="${p.id}" ${isOutOfStock ? 'disabled' : ''} title="${isOutOfStock ? 'Agotado' : 'Añadir al Carrito'}" aria-label="Añadir al Carrito">
                        ${isOutOfStock ? `
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                <circle cx="9" cy="21" r="1"></circle>
                                <circle cx="20" cy="21" r="1"></circle>
                            </svg>
                        ` : `
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        `}
                    </button>
                </div>
                ${isOutOfStock ? `<span class="stock-out-notice">Sin Stock disponible</span>` : ''}
            </div>
        `;

        shopGrid.appendChild(card);
    });

    // Añadir listener
    document.querySelectorAll('.btn-add-cart').forEach(button => {
        if (!button.disabled) {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(button.getAttribute('data-id'));
                addToCart(id);
            });
        }
    });
}

function initCatalogFilters() {
    const filters = document.querySelectorAll('.filter-btn');
    const sortSelect = document.getElementById('sortSelect');

    filters.forEach(btn => {
        btn.addEventListener('click', () => {
            filters.forEach(f => f.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderCatalog();
        });
    });

    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            currentSort = sortSelect.value;
            renderCatalog();
        });
    }
}

function addToCart(productId) {
    const product = productosList.find(p => p.id === productId);
    if (!product) return;

    if (product.stock <= 0) {
        showToast("Este producto no tiene stock.", "danger");
        return;
    }

    const existing = carrito.find(item => item.product.id === productId);
    
    if (existing) {
        if (existing.quantity >= product.stock) {
            showToast(`Límite alcanzado. Solo hay ${product.stock} unidades en stock.`, "danger");
            return;
        }
        existing.quantity++;
    } else {
        carrito.push({ product, quantity: 1 });
    }

    saveCart();
    updateCartCountBadge();
    showToast(`¡${product.name} añadido al carrito!`);
}

function saveCart() {
    localStorage.setItem('drakotec_cart', JSON.stringify(carrito));
}

// ==========================================
// MÓDULO: PAGINA DE CARRITO DEDICADA
// ==========================================
function initCartPage() {
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (!checkoutBtn) return;

    renderCartPage();

    checkoutBtn.addEventListener('click', () => {
        if (carrito.length === 0) {
            showToast("Tu carrito está vacío.");
            return;
        }
        
        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = `Procesando pago seguro...`;

        setTimeout(() => {
            showToast("¡Pago procesado con éxito! Tu orden de compra fue generada.");
            carrito = [];
            saveCart();
            updateCartCountBadge();
            renderCartPage();
            
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = "Proceder al Pago Seguro";
        }, 2000);
    });
}

function renderCartPage() {
    const layout = document.getElementById('cartPageLayout');
    const emptyState = document.getElementById('cartPageEmptyState');
    const itemsContainer = document.getElementById('cartPageItemsContainer');
    const subtotalVal = document.getElementById('cartSubtotalVal');
    const totalVal = document.getElementById('cartTotalVal');

    if (!itemsContainer) return;

    // Sincronizar cantidades con stock más reciente del servidor
    carrito.forEach(item => {
        const newestProduct = productosList.find(p => p.id === item.product.id);
        if (newestProduct) {
            item.product.price = newestProduct.price;
            item.product.stock = newestProduct.stock;
            if (item.quantity > newestProduct.stock) {
                item.quantity = newestProduct.stock;
            }
        }
    });
    
    // Filtrar los de cantidad 0
    carrito = carrito.filter(item => item.quantity > 0);
    saveCart();
    updateCartCountBadge();

    if (carrito.length === 0) {
        layout.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    layout.style.display = 'grid';
    emptyState.style.display = 'none';

    itemsContainer.innerHTML = '';
    let totalPrice = 0;

    carrito.forEach(item => {
        const itemPrice = item.product.price * item.quantity;
        totalPrice += itemPrice;
        
        const fallbackSvg = SVGS_FALLBACK[item.product.category] || SVGS_FALLBACK['accesorios'];

        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div class="cart-item-img" style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
                <img src="${item.product.imagePath}" alt="${item.product.name}" style="max-height: 70px; object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div style="display: none; scale: 0.8;">${fallbackSvg}</div>
            </div>
            <div class="cart-item-info">
                <h4 class="cart-item-title" style="font-size: 1.1rem;">${item.product.name}</h4>
                <span class="cart-item-price" style="font-size: 1rem;">${item.product.price.toLocaleString('es-BO')} Bs.</span>
                <div class="cart-item-qty" style="margin-top: 10px;">
                    <button class="qty-btn dec-qty-page" data-id="${item.product.id}">-</button>
                    <span style="font-weight: 700;">${item.quantity}</span>
                    <button class="qty-btn inc-qty-page" data-id="${item.product.id}">+</button>
                </div>
            </div>
            <div class="cart-item-remove" data-id="${item.product.id}" title="Eliminar artículo" style="padding: 10px;">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </div>
        `;
        itemsContainer.appendChild(itemElement);
    });

    subtotalVal.textContent = `${totalPrice.toLocaleString('es-BO')} Bs.`;
    totalVal.textContent = `${totalPrice.toLocaleString('es-BO')} Bs.`;

    // Eventos
    document.querySelectorAll('.dec-qty-page').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'));
            const current = carrito.find(item => item.product.id === id);
            if (current) {
                updateCartQuantity(id, current.quantity - 1);
                renderCartPage();
            }
        });
    });

    document.querySelectorAll('.inc-qty-page').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'));
            const current = carrito.find(item => item.product.id === id);
            if (current) {
                updateCartQuantity(id, current.quantity + 1);
                renderCartPage();
            }
        });
    });

    document.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'));
            carrito = carrito.filter(item => item.product.id !== id);
            saveCart();
            updateCartCountBadge();
            renderCartPage();
        });
    });
}

function updateCartQuantity(productId, newQty) {
    const product = productosList.find(p => p.id === productId);
    const item = carrito.find(item => item.product.id === productId);
    if (!item) return;

    if (newQty <= 0) {
        carrito = carrito.filter(item => item.product.id !== productId);
    } else {
        if (product && newQty > product.stock) {
            showToast(`Solo quedan ${product.stock} unidades en inventario.`, "danger");
            item.quantity = product.stock;
        } else {
            item.quantity = newQty;
        }
    }
    saveCart();
    updateCartCountBadge();
}

// ==========================================
// MÓDULO: SERVICIO TÉCNICO (REPARACIONES.HTML)
// ==========================================
function initRepairCalculator() {
    const brandSelect = document.getElementById('repairBrand');
    const modelSelect = document.getElementById('repairModel');
    const issueSelect = document.getElementById('repairIssue');
    const calcResult = document.getElementById('calcResult');
    const calcPrice = document.getElementById('calcPrice');
    const calcTime = document.getElementById('calcTime');
    const bookRepairBtn = document.getElementById('bookRepairBtn');

    if (!brandSelect) return;

    brandSelect.addEventListener('change', () => {
        const brand = brandSelect.value;
        const models = REPAIR_MODELS[brand] || [];

        modelSelect.disabled = false;
        modelSelect.innerHTML = `<option value="" disabled selected>Selecciona el modelo</option>`;
        
        models.forEach(model => {
            modelSelect.innerHTML += `<option value="${model.name}" data-mult="${model.priceMultiplier}">${model.name}</option>`;
        });
        resetResult();
    });

    const checkCalculation = () => {
        const brand = brandSelect.value;
        const model = modelSelect.value;
        const issue = issueSelect.value;

        if (brand && model && issue) {
            const selectedOption = modelSelect.options[modelSelect.selectedIndex];
            const multiplier = parseFloat(selectedOption.getAttribute('data-mult'));
            const issueData = REPAIR_ISSUES[issue];

            // Precio aproximado
            const finalPrice = Math.round(issueData.basePrice * multiplier * 7);
            
            calcPrice.textContent = `${finalPrice.toLocaleString('es-BO')} Bs.`;
            calcTime.innerHTML = `<strong>Tiempo de entrega:</strong> ${issueData.time} <br><strong>Garantía:</strong> 6 meses en repuesto y mano de obra.`;
            calcResult.style.display = 'block';
        }
    };

    modelSelect.addEventListener('change', checkCalculation);
    issueSelect.addEventListener('change', checkCalculation);

    function resetResult() {
        calcResult.style.display = 'none';
        issueSelect.selectedIndex = 0;
    }

    bookRepairBtn.addEventListener('click', () => {
        const model = modelSelect.value;
        const issueName = REPAIR_ISSUES[issueSelect.value].name;
        showToast(`Cita confirmada para tu ${model} (${issueName}).`);
        brandSelect.selectedIndex = 0;
        modelSelect.innerHTML = `<option value="" disabled selected>Elige primero una marca</option>`;
        modelSelect.disabled = true;
        resetResult();
    });
}

async function fetchOrdenes() {
    try {
        const res = await fetch(`${API_URL}/api/ordenes`);
        if (!res.ok) throw new Error("Error al obtener órdenes");
        ordenesList = await res.json();
        
        const path = window.location.pathname;
        if (path.endsWith('tecnico.html')) {
            renderTechOrders();
        }
    } catch (err) {
        console.error(err);
    }
}

function initRepairTracker() {
    const trackerCode = document.getElementById('trackerCode');
    const trackerBtn = document.getElementById('trackerBtn');
    const trackerResults = document.getElementById('trackerResults');
    const resCode = document.getElementById('resCode');
    const resDevice = document.getElementById('resDevice');
    const resState = document.getElementById('resState');
    const demoCode1 = document.getElementById('demoCode1');
    const demoCode2 = document.getElementById('demoCode2');

    if (!trackerBtn) return;

    const steps = {
        recibido: document.getElementById('step-recibido'),
        diagnostico: document.getElementById('step-diagnostico'),
        reparacion: document.getElementById('step-reparacion'),
        listo: document.getElementById('step-listo')
    };

    const track = async () => {
        const code = trackerCode.value.trim().toUpperCase();
        await fetchOrdenes();
        
        const ticket = ordenesList.find(o => o.code === code);

        if (!ticket) {
            showToast("Orden no encontrada.", "danger");
            trackerResults.style.display = 'none';
            return;
        }

        resCode.textContent = ticket.code;
        resDevice.textContent = ticket.brandModel;
        
        let stateLabel = "";
        let stateClass = "";
        if (ticket.status === 'recibido') {
            stateLabel = "Recibido";
            stateClass = "state-diag";
        } else if (ticket.status === 'diagnostico') {
            stateLabel = "En Diagnóstico";
            stateClass = "state-diag";
        } else if (ticket.status === 'reparacion') {
            stateLabel = "En Reparación";
            stateClass = "state-repair";
        } else if (ticket.status === 'listo') {
            stateLabel = "Listo para Entrega";
            stateClass = "state-ready";
        }
        resState.textContent = stateLabel;
        resState.className = `tracker-state ${stateClass}`;

        // Limpiar timeline
        Object.values(steps).forEach(s => s.classList.remove('completed', 'active'));

        if (ticket.status === 'recibido') {
            steps.recibido.classList.add('active');
        } else if (ticket.status === 'diagnostico') {
            steps.recibido.classList.add('completed');
            steps.diagnostico.classList.add('active');
        } else if (ticket.status === 'reparacion') {
            steps.recibido.classList.add('completed');
            steps.diagnostico.classList.add('completed');
            steps.reparacion.classList.add('active');
        } else if (ticket.status === 'listo') {
            steps.recibido.classList.add('completed');
            steps.diagnostico.classList.add('completed');
            steps.reparacion.classList.add('completed');
            steps.listo.classList.add('active');
        }

        trackerResults.style.display = 'block';
        trackerResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    trackerBtn.addEventListener('click', track);
    trackerCode.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') track();
    });

    demoCode1.addEventListener('click', () => {
        trackerCode.value = "DRAKO-101";
        track();
    });
    demoCode2.addEventListener('click', () => {
        trackerCode.value = "DRAKO-202";
        track();
    });
}

// ==========================================
// MÓDULO: LOGIN DEL PERSONAL (PORTAL.HTML)
// ==========================================
function initPortalAuth() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const role = document.getElementById('loginRole').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const res = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, password })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Fallo al iniciar sesión");
            }

            const user = await res.json();
            sessionStorage.setItem('drakotec_user', JSON.stringify(user));
            currentUser = user;
            
            showToast("Acceso autorizado.");
            
            // Redireccionar al panel correspondiente
            setTimeout(() => {
                window.location.replace(user.role === 'admin' ? 'admin.html' : 'tecnico.html');
            }, 1000);
            
        } catch (err) {
            showToast(err.message, "danger");
        }
    });
}

// ==========================================
// MÓDULO: FORMULARIOS DE CARGA (TECNICO & ADMIN)
// ==========================================
function initPortalForms() {
    // Formulario de Técnico
    const registerOrderForm = document.getElementById('registerOrderForm');
    if (registerOrderForm) {
        registerOrderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const client = document.getElementById('ordClient').value;
            const brandModel = document.getElementById('ordBrandModel').value;
            const issues = document.getElementById('ordIssues').value;
            const accessories = document.getElementById('ordAccessories').value;

            try {
                const res = await fetch(`${API_URL}/api/ordenes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ client, brandModel, issues, accessories })
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.errors ? errData.errors.join(', ') : "Error");
                }

                const data = await res.json();
                showToast(`Orden creada: ${data.orden.code}`);
                registerOrderForm.reset();
                
                await fetchOrdenes();
            } catch (err) {
                showToast(err.message, "danger");
            }
        });
    }

    // Formulario de Administrador
    const productForm = document.getElementById('productForm');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const id = document.getElementById('prodId').value;
            const name = document.getElementById('prodName').value;
            const price = parseFloat(document.getElementById('prodPrice').value);
            const stock = parseInt(document.getElementById('prodStock').value);
            const category = document.getElementById('prodCategory').value;
            const specs = document.getElementById('prodSpecs').value;
            const imageFile = document.getElementById('prodImage').files[0];

            if (price < 0 || stock < 0) {
                showToast("Precio y Stock no pueden ser negativos.", "danger");
                return;
            }

            const formData = new FormData();
            formData.append('name', name);
            formData.append('price', price);
            formData.append('stock', stock);
            formData.append('category', category);
            formData.append('specs', specs);
            if (imageFile) {
                formData.append('imagen', imageFile);
            }

            try {
                let url = `${API_URL}/api/productos`;
                let method = 'POST';

                if (id) {
                    url = `${API_URL}/api/productos/${id}`;
                    method = 'PUT';
                } else {
                    if (!imageFile) {
                        showToast("La foto de producto es obligatoria.", "danger");
                        return;
                    }
                }

                const res = await fetch(url, {
                    method: method,
                    body: formData
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || (errData.errors ? errData.errors.join(', ') : "Fallo al guardar"));
                }

                const data = await res.json();
                showToast(data.message);
                
                resetProductForm();
                await fetchProductos(true);
            } catch (err) {
                showToast(err.message, "danger");
            }
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', resetProductForm);
    }
}

function resetProductForm() {
    const productForm = document.getElementById('productForm');
    if (!productForm) return;
    
    productForm.reset();
    document.getElementById('prodId').value = '';
    document.getElementById('productFormTitle').textContent = "Publicar Nuevo Producto";
    document.getElementById('prodSubmitBtn').textContent = "Publicar Producto";
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('imageRequiredNotice').textContent = "Requerido para nuevos productos.";
}

function renderTechOrders() {
    const tbody = document.getElementById('techOrdersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const sorted = [...ordenesList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    sorted.forEach(o => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${o.code}</strong></td>
            <td>${o.client}</td>
            <td>${o.brandModel}</td>
            <td title="${o.accessories ? 'Accesorios: ' + o.accessories : ''}">${o.issues}</td>
            <td>
                <select class="form-select state-changer" data-code="${o.code}">
                    <option value="recibido" ${o.status === 'recibido' ? 'selected' : ''}>Recibido</option>
                    <option value="diagnostico" ${o.status === 'diagnostico' ? 'selected' : ''}>Diagnóstico</option>
                    <option value="reparacion" ${o.status === 'reparacion' ? 'selected' : ''}>Reparación</option>
                    <option value="listo" ${o.status === 'listo' ? 'selected' : ''}>Listo para entrega</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.state-changer').forEach(select => {
        select.addEventListener('change', async () => {
            const code = select.getAttribute('data-code');
            const newStatus = select.value;

            try {
                const res = await fetch(`${API_URL}/api/ordenes/${code}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });

                if (!res.ok) throw new Error("Fallo");
                showToast(`Código ${code} cambiado a ${newStatus}`);
                fetchOrdenes();
            } catch (err) {
                showToast("Fallo al actualizar el estado.", "danger");
            }
        });
    });
}

function renderAdminProducts() {
    const tbody = document.getElementById('adminProductsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    productosList.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.id}</td>
            <td>${p.name}</td>
            <td>${p.price.toLocaleString('es-BO')} Bs.</td>
            <td><span class="${p.stock === 0 ? 'gradient-text' : ''}" style="font-weight:700;">${p.stock}</span></td>
            <td>
                <button class="btn-edit-inline edit-product-btn" data-id="${p.id}">Editar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.edit-product-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'));
            const p = productosList.find(item => item.id === id);
            
            if (p) {
                document.getElementById('prodId').value = p.id;
                document.getElementById('prodName').value = p.name;
                document.getElementById('prodPrice').value = p.price;
                document.getElementById('prodStock').value = p.stock;
                document.getElementById('prodCategory').value = p.category;
                document.getElementById('prodSpecs').value = p.specs;
                
                document.getElementById('productFormTitle').textContent = "Editar Producto ID: " + p.id;
                document.getElementById('prodSubmitBtn').textContent = "Guardar Cambios";
                document.getElementById('cancelEditBtn').style.display = 'inline-flex';
                document.getElementById('imageRequiredNotice').textContent = "Opcional. Sube una nueva para reemplazar.";
                
                document.getElementById('productForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    });
}

// ==========================================
// TOAST NOTIFICATIONS (TOAST GLOBAL)
// ==========================================
function showToast(message, type = "success") {
    const toast = document.getElementById('toastNotification');
    const toastMsg = document.getElementById('toastMessage');
    const toastIcon = toast.querySelector('.toast-icon');

    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    
    if (type === "success") {
        toast.style.borderLeftColor = 'var(--success)';
        toastIcon.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
    } else if (type === "danger") {
        toast.style.borderLeftColor = 'var(--danger)';
        toastIcon.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--danger)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
    }

    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// ==========================================
// FORMULARIOS CONTACTO (INDEX.HTML ONLY)
// ==========================================
function initContactForms() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('contactName').value;
            showToast(`¡Gracias, ${name}! Tu consulta ha sido recibida.`);
            contactForm.reset();
        });
    }
}
