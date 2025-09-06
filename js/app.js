// Estado de la aplicación
let currentUser = null;
let products = [];
let importData = [];
let token = null;

// Datos de ejemplo (pueden eliminarse al usar el backend completamente)
const sampleProducts = [
    {
        id: 1,
        code: 'TORN-001',
        name: 'Tornillo M8 x 20mm',
        description: 'Tornillo hexagonal galvanizado',
        category: 'Ferretería',
        quantity: 150,
        unit: 'unidades',
        lastUpdated: '30/08/2025 14:30'
    },
    {
        id: 2,
        code: 'CABLE-002',
        name: 'Cable UTP Cat 6',
        description: 'Cable de red categoría 6',
        category: 'Electrónica',
        quantity: 45,
        unit: 'metros',
        lastUpdated: '30/08/2025 12:15'
    },
    {
        id: 3,
        code: 'PAPEL-003',
        name: 'Papel Bond A4',
        description: 'Papel blanco 75g para impresión',
        category: 'Oficina',
        quantity: 25,
        unit: 'paquetes',
        lastUpdated: '29/08/2025 16:45'
    }
];

// Configuración de pantallas por rol
const roleScreens = {
    admin: ['dashboard', 'inventory', 'reports', 'import', 'profile'],
    user: ['dashboard', 'inventory', 'reports']
};

// Funciones de autenticación
async function login(event) {
    if (event) event.preventDefault();
    console.log('Iniciando proceso de login...');
    showLoading('Verificando credenciales...');

    const email = document.querySelector('#loginForm input[type="text"]').value;
    const password = document.querySelector('#loginForm input[type="password"]').value;
    const team = document.querySelector('#loginForm #equipoSelect').value;

    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            token = data.token;
            currentUser = { ...data.user, team };
            hideLoading();
            document.getElementById('loginScreen').classList.add('hidden');
            document.getElementById('appScreen').classList.remove('hidden');
            document.getElementById('currentTeam').textContent = currentUser.team;
            document.getElementById('welcomeMessage').textContent = `Bienvenido de vuelta, ${currentUser.name}`;
            showAlert('¡Bienvenido al sistema!', 'success');
            await loadProducts();
            updateSidebar();
            showScreen('dashboard');
        } else {
            hideLoading();
            showAlert(data.message || 'Credenciales incorrectas', 'error');
        }
    } catch (error) {
        hideLoading();
        showAlert('Error al conectar con el servidor. Verifica que el backend esté activo en http://localhost:3000', 'error');
        console.error('Login error:', error);
    }
}

// Logout
function logout() {
    showConfirm('Cerrar Sesión', '¿Estás seguro de que deseas salir del sistema?', () => {
        currentUser = null;
        token = null;
        document.getElementById('appScreen').classList.add('hidden');
        document.getElementById('loginScreen').classList.remove('hidden');
        showScreen('dashboard');
    });
}

// Navegación
function showScreen(screenName, element = null) {
    console.log('Mostrando pantalla:', screenName);
    
    const contents = document.querySelectorAll('[id$="Content"]');
    contents.forEach(content => {
        content.classList.add('hidden');
    });
    
    const targetScreen = document.getElementById(`${screenName}Content`);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
    } else {
        console.warn(`Pantalla ${screenName} no encontrada`);
        return;
    }
    
    const titles = {
        dashboard: 'Dashboard',
        inventory: 'Gestión de Inventario',
        reports: 'Reportes y Análisis',
        import: 'Importar desde Excel',
        profile: 'Mi Perfil'
    };
    
    const titleElement = document.getElementById('pageTitle');
    if (titleElement && titles[screenName]) {
        titleElement.textContent = titles[screenName];
    }
    
    if (element) {
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        element.classList.add('active');
    }
}

// Actualizar sidebar según rol
function updateSidebar() {
    const sidebarNav = document.getElementById('sidebarNav');
    if (!sidebarNav || !currentUser) return;

    sidebarNav.innerHTML = '';
    const screens = roleScreens[currentUser.role] || ['dashboard'];

    screens.forEach(screen => {
        const item = document.createElement('div');
        item.className = 'sidebar-item' + (screen === 'dashboard' ? ' active' : '');
        item.innerHTML = `<span>${getScreenIcon(screen)}</span> ${getScreenTitle(screen)}`;
        item.onclick = (e) => {
            e.preventDefault();
            showScreen(screen, item);
        };
        sidebarNav.appendChild(item);
    });
}

// Iconos y títulos de pantallas
function getScreenIcon(screen) {
    const icons = {
        dashboard: '📊',
        inventory: '📦',
        reports: '📋',
        import: '📥',
        profile: '👤'
    };
    return icons[screen] || '📄';
}

function getScreenTitle(screen) {
    const titles = {
        dashboard: 'Dashboard',
        inventory: 'Gestión de Inventario',
        reports: 'Reportes y Análisis',
        import: 'Importar desde Excel',
        profile: 'Mi Perfil'
    };
    return titles[screen] || 'Pantalla Desconocida';
}

// Gestión de productos
async function loadProducts() {
    if (!token) return; // Evitar cargar si no hay token
    showLoading('Cargando productos...');
    try {
        const response = await fetch('http://localhost:3000/inventory', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Error en la respuesta del servidor');
        products = await response.json();
        hideLoading();
        console.log('Productos cargados:', products.length);
        updateProductTable();
        updateDashboardMetrics();
        updateRecentProducts();
    } catch (error) {
        hideLoading();
        showAlert('Error al cargar productos. Verifica tu conexión o el backend.', 'error');
        console.error('Load products error:', error);
    }
}

async function saveProduct() {
    if (!token) {
        hideLoading();
        showAlert('Debes iniciar sesión para guardar un producto.', 'error');
        return;
    }

    const form = document.getElementById('addProductForm');
    if (!form.checkValidity()) {
        hideLoading();
        showAlert('Por favor, completa todos los campos requeridos', 'error');
        return;
    }

    showLoading('Guardando producto...');
    const productData = {
        code: form.querySelector('input[placeholder="Ej: PROD-001"]').value,
        name: form.querySelector('input[placeholder="Ej: Tornillo hexagonal M8"]').value,
        description: form.querySelector('textarea').value,
        category: form.querySelector('select[required]').value,
        quantity: parseInt(form.querySelector('input[type="number"]').value),
        unit: form.querySelector('select[title="Unidad de Medida"]').value || 'unidades'
    };

    try {
        const response = await fetch('http://localhost:3000/inventory', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productData)
        });
        if (!response.ok) throw new Error('Error al guardar el producto');
        hideLoading();
        closeModal('addProductModal');
        showAlert('Producto agregado exitosamente', 'success');
        await loadProducts();
    } catch (error) {
        hideLoading();
        showAlert('Error al guardar el producto. Verifica el backend.', 'error');
        console.error('Save product error:', error);
    }
}

function editProduct(id) {
    showAlert('Función de edición en desarrollo', 'info');
}

async function deleteProduct(id) {
    if (!token) {
        hideLoading();
        showAlert('Debes iniciar sesión para eliminar un producto.', 'error');
        return;
    }

    showConfirm('Eliminar Producto', '¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.', async () => {
        showLoading('Eliminando producto...');
        try {
            const response = await fetch(`http://localhost:3000/inventory/${id}`, {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason: 'Eliminación manual' })
            });
            if (!response.ok) throw new Error('Error al eliminar el producto');
            hideLoading();
            showAlert('Producto eliminado exitosamente', 'success');
            await loadProducts();
        } catch (error) {
            hideLoading();
            showAlert('Error al eliminar el producto. Verifica el backend.', 'error');
            console.error('Delete product error:', error);
        }
    });
}

// Importación de Excel
function downloadTemplate() {
    showLoading('Generando plantilla...');
    setTimeout(() => {
        hideLoading();
        showAlert('Plantilla descargada exitosamente', 'success');
    }, 1000);
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    showLoading('Procesando archivo...');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        importData = XLSX.utils.sheet_to_json(sheet).map(row => ({
            code: row.code || '',
            name: row.name || '',
            description: row.description || '',
            category: row.category || '',
            quantity: parseInt(row.quantity) || 0,
            status: row.code && row.name && row.quantity ? 'valid' : 'error'
        }));

        hideLoading();
        showImportPreview();
    };
    reader.onerror = () => {
        hideLoading();
        showAlert('Error al procesar el archivo', 'error');
    };
    reader.readAsArrayBuffer(file);
}

function showImportPreview() {
    const preview = document.getElementById('importPreview');
    const stats = document.getElementById('importStats');
    const table = document.getElementById('previewTable');
    
    if (!preview || !stats || !table) {
        hideLoading();
        return;
    }
    
    const validRows = importData.filter(row => row.status === 'valid').length;
    const errorRows = importData.filter(row => row.status === 'error').length;
    
    stats.innerHTML = `
        <div style="display: flex; gap: 24px;">
            <div><strong>Total filas:</strong> ${importData.length}</div>
            <div><strong style="color: var(--color-success);">Válidas:</strong> ${validRows}</div>
            <div><strong style="color: var(--color-error);">Con errores:</strong> ${errorRows}</div>
        </div>
    `;
    
    table.innerHTML = importData.map(row => `
        <tr style="${row.status === 'error' ? 'background-color: var(--color-error-light);' : ''}">
            <td>${row.code || '<span style="color: var(--color-error);">FALTA</span>'}</td>
            <td>${row.name}</td>
            <td>${row.description}</td>
            <td>${row.category}</td>
            <td>${row.quantity}</td>
            <td>
                ${row.status === 'valid' 
                    ? '<span style="color: var(--color-success);">✅ Válido</span>'
                    : '<span style="color: var(--color-error);">❌ Error</span>'
                }
            </td>
        </tr>
    `).join('');
    
    preview.classList.remove('hidden');
}

async function confirmImport() {
    if (!token) {
        hideLoading();
        showAlert('Debes iniciar sesión para importar productos.', 'error');
        return;
    }

    showLoading('Importando productos...');
    
    try {
        for (const row of importData.filter(r => r.status === 'valid')) {
            const response = await fetch('http://localhost:3000/inventory', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    code: row.code,
                    name: row.name,
                    description: row.description,
                    category: row.category,
                    quantity: row.quantity,
                    unit: 'unidades'
                })
            });
            if (!response.ok) throw new Error('Error al importar un producto');
        }
        hideLoading();
        cancelImport();
        showAlert(`${importData.filter(row => row.status === 'valid').length} productos importados exitosamente`, 'success');
        await loadProducts();
    } catch (error) {
        hideLoading();
        showAlert('Error al importar productos. Verifica el backend.', 'error');
        console.error('Import error:', error);
    }
}

function cancelImport() {
    const preview = document.getElementById('importPreview');
    const fileInput = document.getElementById('fileInput');
    
    if (preview) preview.classList.add('hidden');
    if (fileInput) fileInput.value = '';
    importData = [];
}

// Reportes
function generateReport() {
    showLoading('Generando reporte...');
    
    setTimeout(() => {
        hideLoading();
        showAlert('Reporte generado exitosamente', 'success');
    }, 2000);
}

// Utilidades de UI
function openModal(modalId) {
    console.log('Abriendo modal:', modalId); // Depuración
    // Evitar abrir el modal de agregar producto si no hay sesión iniciada
    if (modalId === 'addProductModal' && !token) {
        return;
    }
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeModal(modalId) {
    console.log('Cerrando modal:', modalId); // Depuración
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

function showLoading(message = 'Cargando...') {
    console.log('Mostrando loading:', message); // Depuración
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
        loadingMessage.textContent = message;
    }
    openModal('loadingModal');
}

function hideLoading() {
    console.log('Ocultando loading'); // Depuración
    closeModal('loadingModal');
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.cssText = `
        padding: 12px 16px;
        margin-bottom: 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        ${type === 'success' ? 'background: var(--color-success-light); color: var(--color-success); border: 1px solid var(--color-success);' : ''}
        ${type === 'error' ? 'background: var(--color-error-light); color: var(--color-error); border: 1px solid var(--color-error);' : ''}
        ${type === 'warning' ? 'background: var(--color-warning-light); color: var(--color-warning); border: 1px solid var(--color-warning);' : ''}
        ${type === 'info' ? 'background: var(--color-primary-light); color: var(--color-primary); border: 1px solid var(--color-primary);' : ''}
    `;
    alertDiv.textContent = message;
    
    const content = document.querySelector('.content');
    if (content) {
        content.insertBefore(alertDiv, content.firstChild);
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }
}

function showConfirm(title, message, onConfirm) {
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmButton = document.getElementById('confirmButton');
    
    if (confirmTitle) confirmTitle.textContent = title;
    if (confirmMessage) confirmMessage.textContent = message;
    if (confirmButton) {
        confirmButton.onclick = () => {
            closeModal('confirmModal');
            onConfirm();
        };
    }
    
    openModal('confirmModal');
}

// Drag & Drop
function setupDragDrop() {
    const dropzone = document.getElementById('dropzone');
    if (!dropzone) return;
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const fileInput = document.getElementById('fileInput');
            if (fileInput) {
                fileInput.files = files;
                handleFileUpload({ target: { files } });
            }
        }
    });
}

// Actualizar tabla de productos
function updateProductTable() {
    const table = document.getElementById('productTable');
    if (!table) return;
    table.innerHTML = '';
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    
    products.filter(product => 
        (product.name.toLowerCase().includes(searchTerm) || product.code.toLowerCase().includes(searchTerm)) &&
        (!categoryFilter || product.category === categoryFilter)
    ).forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><code>${product.code}</code></td>
            <td><strong>${product.name}</strong><br><small style="color: var(--color-gray-500);">${product.description || ''}</small></td>
            <td><span style="background: var(--color-${product.category === 'Ferretería' ? 'success' : product.category === 'Electrónica' ? 'primary' : 'warning'}-light); color: var(--color-${product.category === 'Ferretería' ? 'success' : product.category === 'Electrónica' ? 'primary' : 'warning'}); padding: 4px 8px; border-radius: 4px; font-size: 12px;">${product.category}</span></td>
            <td>${product.quantity} ${product.unit}</td>
            <td class="text-sm" style="color: var(--color-gray-500);">${product.lastUpdated || product.created}</td>
            <td>
                <button class="btn" style="padding: 6px 12px; margin-right: 4px;" onclick="editProduct(${product.id})">✏️</button>
                <button class="btn" style="padding: 6px 12px; color: var(--color-error);" onclick="deleteProduct(${product.id})">🗑️</button>
            </td>
        `;
        table.appendChild(row);
    });
}

// Actualizar métricas del dashboard
function updateDashboardMetrics() {
    document.getElementById('totalProducts').textContent = products.length;
    document.getElementById('todayAdded').textContent = products.filter(p => {
        const date = new Date(p.lastUpdated || p.created);
        return date.toDateString() === new Date().toDateString();
    }).length;
    document.getElementById('lowStock').textContent = products.filter(p => p.quantity < 10).length;
}

// Actualizar productos recientes
function updateRecentProducts() {
    const table = document.getElementById('recentProducts');
    if (!table) return;
    const recent = products.sort((a, b) => new Date(b.lastUpdated || b.created) - new Date(a.lastUpdated || a.created)).slice(0, 3);
    table.innerHTML = recent.map(product => `
        <tr>
            <td><strong>${product.name}</strong></td>
            <td><span style="background: var(--color-${product.category === 'Ferretería' ? 'success' : product.category === 'Electrónica' ? 'primary' : 'warning'}-light); color: var(--color-${product.category === 'Ferretería' ? 'success' : product.category === 'Electrónica' ? 'primary' : 'warning'}); padding: 4px 8px; border-radius: 4px; font-size: 12px;">${product.category}</span></td>
            <td>${product.quantity} ${product.unit}</td>
            <td class="text-sm" style="color: var(--color-gray-500);">${new Date(product.lastUpdated || product.created).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</td>
        </tr>
    `).join('');
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM completamente cargado');
    
    // Asegurar que solo se muestre la pantalla de login inicialmente
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('appScreen').classList.add('hidden');

    // Cerrar cualquier modal que pudiera haber quedado abierto por estilos o estado previo
    ['addProductModal','confirmModal','loadingModal'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('hidden')) el.classList.add('hidden');
    });
    
    // Event listeners
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', login);
    }
    
    // Filtros de inventario
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    if (searchInput) searchInput.addEventListener('input', updateProductTable);
    if (categoryFilter) categoryFilter.addEventListener('change', updateProductTable);
    
    // Setup drag & drop
    setupDragDrop();
    
    // No realizar ninguna llamada al backend aquí
    console.log('Aplicación inicializada correctamente');
});