// Variables para la gestión del inventario
    let currentView = 'table';
    let currentPage = 1;
    let itemsPerPage = 10;
    let totalPages = 1;
    let filteredProducts = [];
    let selectedProducts = new Set();

    // Inicializar la página de inventario
    function initInventoryPage() {
        loadInventoryStats();
        filterProducts();
        setupEventListeners();
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Debounce para la búsqueda
        let searchTimeout;
        document.getElementById('searchInput').addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => filterProducts(), 300);
        });

        // Eventos de teclado para navegación
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                clearSelection();
            }
        });
    }

    // Cargar estadísticas del inventario
    function loadInventoryStats() {
        const totalProducts = database.products.length;
        const criticalProducts = database.products.filter(p => p.quantity < 5).length;
        
        // Simular valor total (en un sistema real, tendrías precios)
        const totalValue = database.products.reduce((sum, product) => {
            const unitPrice = getProductPriceEstimate(product.category);
            return sum + (product.quantity * unitPrice);
        }, 0);

        document.getElementById('totalProductsCount').textContent = totalProducts.toLocaleString();
        document.getElementById('criticalProductsCount').textContent = criticalProducts.toLocaleString();
        document.getElementById('totalInventoryValue').textContent = `$${totalValue.toLocaleString()}`;
    }

    // Estimación de precios por categoría (para demo)
    function getProductPriceEstimate(category) {
        const prices = {
            'Ferretería': 2.50,
            'Electrónica': 15.75,
            'Oficina': 8.20,
            'Limpieza': 5.30
        };
        return prices[category] || 10.00;
    }

    // Filtrar y ordenar productos
    function filterProducts() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const categoryFilter = document.getElementById('categoryFilter').value;
        const stockFilter = document.getElementById('stockFilter').value;
        const sortBy = document.getElementById('sortFilter').value;

        // Aplicar filtros
        filteredProducts = database.products.filter(product => {
            // Filtro de búsqueda
            const matchesSearch = !searchTerm || 
                product.code.toLowerCase().includes(searchTerm) ||
                product.name.toLowerCase().includes(searchTerm) ||
                (product.description && product.description.toLowerCase().includes(searchTerm));

            // Filtro de categoría
            const matchesCategory = !categoryFilter || product.category === categoryFilter;

            // Filtro de stock
            let matchesStock = true;
            if (stockFilter) {
                switch(stockFilter) {
                    case 'critical':
                        matchesStock = product.quantity < 5;
                        break;
                    case 'low':
                        matchesStock = product.quantity < 10;
                        break;
                    case 'normal':
                        matchesStock = product.quantity >= 10 && product.quantity <= 50;
                        break;
                    case 'high':
                        matchesStock = product.quantity > 50;
                        break;
                }
            }

            return matchesSearch && matchesCategory && matchesStock;
        });

        // Ordenar productos
        sortProducts(sortBy);

        // Actualizar estadísticas de filtro
        updateFilterStats();

        // Resetear a primera página
        currentPage = 1;
        renderProducts();
        updatePagination();
    }

    // Ordenar productos
    function sortProducts(sortBy) {
        filteredProducts.sort((a, b) => {
            switch(sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'code':
                    return a.code.localeCompare(b.code);
                case 'quantity':
                    return a.quantity - b.quantity;
                case 'quantity-desc':
                    return b.quantity - a.quantity;
                case 'recent':
                    return new Date(b.lastUpdated) - new Date(a.lastUpdated);
                case 'oldest':
                    return new Date(a.lastUpdated) - new Date(b.lastUpdated);
                default:
                    return 0;
            }
        });
    }

    // Actualizar estadísticas del filtro
    function updateFilterStats() {
        const total = filteredProducts.length;
        const statsElement = document.getElementById('filterStats');
        
        if (total === database.products.length) {
            statsElement.textContent = `Mostrando todos los ${total.toLocaleString()} productos`;
        } else {
            statsElement.textContent = `Mostrando ${total.toLocaleString()} de ${database.products.length.toLocaleString()} productos`;
        }
    }

    // Renderizar productos según la vista actual
    function renderProducts() {
        if (currentView === 'table') {
            renderTableView();
        } else {
            renderGridView();
        }
    }

    // Renderizar vista de tabla
    function renderTableView() {
        const tbody = document.getElementById('productsTableBody');
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentProducts = filteredProducts.slice(startIndex, endIndex);

        if (currentProducts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center" style="padding: 3rem; color: var(--gray-500);">
                        <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                        <p>No se encontraron productos</p>
                        <p class="text-sm">Intenta ajustar tus filtros de búsqueda</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = currentProducts.map(product => {
            const stockLevel = getStockLevel(product.quantity);
            const progressWidth = Math.min((product.quantity / 100) * 100, 100);
            
            return `
                <tr class="${selectedProducts.has(product.id) ? 'selected' : ''}">
                    <td class="checkbox-column">
                        <input type="checkbox" ${selectedProducts.has(product.id) ? 'checked' : ''} 
                               onchange="toggleProductSelection(${product.id})">
                    </td>
                    <td>
                        <code class="product-code">${product.code}</code>
                    </td>
                    <td>
                        <div class="product-name">${product.name}</div>
                        ${product.description ? `
                            <div class="product-description">${product.description}</div>
                        ` : ''}
                    </td>
                    <td>
                        <span class="badge badge-info">${product.category}</span>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span>${product.quantity} ${product.unit}</span>
                            <div class="stock-progress">
                                <div class="stock-progress-bar ${stockLevel}" style="width: ${progressWidth}%"></div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="stock-level ${stockLevel}">
                            <i class="fas ${getStockIcon(stockLevel)}"></i>
                            ${getStockLabel(stockLevel)}
                        </span>
                    </td>
                    <td>
                        <span class="text-sm" style="color: var(--gray-500);">
                            ${formatDate(product.lastUpdated)}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-icon" onclick="editProduct(${product.id})" title="Editar">
                                <i class="fas fa-edit" style="color: var(--primary);"></i>
                            </button>
                            <button class="btn btn-icon" onclick="adjustStock(${product.id})" title="Ajustar stock">
                                <i class="fas fa-exchange-alt" style="color: var(--info);"></i>
                            </button>
                            <button class="btn btn-icon" onclick="deleteProduct(${product.id})" title="Eliminar">
                                <i class="fas fa-trash" style="color: var(--error);"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Renderizar vista de grid
    function renderGridView() {
        const grid = document.getElementById('productsGrid');
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentProducts = filteredProducts.slice(startIndex, endIndex);

        if (currentProducts.length === 0) {
            grid.innerHTML = `
                <div class="text-center" style="grid-column: 1 / -1; padding: 3rem; color: var(--gray-500);">
                    <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                    <p>No se encontraron productos</p>
                    <p class="text-sm">Intenta ajustar tus filtros de búsqueda</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = currentProducts.map(product => {
            const stockLevel = getStockLevel(product.quantity);
            
            return `
                <div class="product-card ${stockLevel}">
                    <div class="product-header">
                        <code class="product-code">${product.code}</code>
                        <input type="checkbox" ${selectedProducts.has(product.id) ? 'checked' : ''} 
                               onchange="toggleProductSelection(${product.id})">
                    </div>
                    
                    <h3 class="product-name">${product.name}</h3>
                    
                    ${product.description ? `
                        <p class="product-description">${product.description}</p>
                    ` : ''}
                    
                    <div class="product-details">
                        <div class="product-detail">
                            <span class="detail-label">Categoría</span>
                            <span class="detail-value">${product.category}</span>
                        </div>
                        <div class="product-detail">
                            <span class="detail-label">Stock</span>
                            <span class="detail-value">${product.quantity} ${product.unit}</span>
                        </div>
                        <div class="product-detail">
                            <span class="detail-label">Estado</span>
                            <span class="detail-value">
                                <span class="stock-level ${stockLevel}">
                                    <i class="fas ${getStockIcon(stockLevel)}"></i>
                                    ${getStockLabel(stockLevel)}
                                </span>
                            </span>
                        </div>
                        <div class="product-detail">
                            <span class="detail-label">Última actualización</span>
                            <span class="detail-value">${formatDate(product.lastUpdated)}</span>
                        </div>
                    </div>
                    
                    <div class="product-actions">
                        <button class="btn btn-icon" onclick="editProduct(${product.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-icon" onclick="adjustStock(${product.id})" title="Ajustar stock">
                            <i class="fas fa-exchange-alt"></i>
                        </button>
                        <button class="btn btn-icon" onclick="deleteProduct(${product.id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Funciones auxiliares
    function getStockLevel(quantity) {
        if (quantity < 5) return 'critical';
        if (quantity < 10) return 'low';
        if (quantity <= 50) return 'normal';
        return 'high';
    }

    function getStockIcon(level) {
        const icons = {
            'critical': 'fa-exclamation-triangle',
            'low': 'fa-exclamation-circle',
            'normal': 'fa-check-circle',
            'high': 'fa-arrow-up'
        };
        return icons[level];
    }

    function getStockLabel(level) {
        const labels = {
            'critical': 'Crítico',
            'low': 'Bajo',
            'normal': 'Normal',
            'high': 'Alto'
        };
        return labels[level];
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    // Gestión de selección
    function toggleProductSelection(productId) {
        if (selectedProducts.has(productId)) {
            selectedProducts.delete(productId);
        } else {
            selectedProducts.add(productId);
        }
        updateSelectionUI();
    }

    function toggleSelectAll() {
        const selectAll = document.getElementById('selectAll').checked;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentProducts = filteredProducts.slice(startIndex, endIndex);

        if (selectAll) {
            currentProducts.forEach(product => selectedProducts.add(product.id));
        } else {
            currentProducts.forEach(product => selectedProducts.delete(product.id));
        }
        
        renderProducts();
        updateSelectionUI();
    }

    function clearSelection() {
        selectedProducts.clear();
        document.getElementById('selectAll').checked = false;
        renderProducts();
        updateSelectionUI();
    }

    function updateSelectionUI() {
        const bulkActions = document.getElementById('bulkActions');
        const selectedCount = document.getElementById('selectedCount');
        
        selectedCount.textContent = `${selectedProducts.size} producto(s) seleccionado(s)`;
        
        if (selectedProducts.size > 0) {
            bulkActions.classList.remove('hidden');
        } else {
            bulkActions.classList.add('hidden');
        }
    }

    // Paginación
    function updatePagination() {
        totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
        
        document.getElementById('paginationInfo').textContent = 
            `Mostrando ${Math.min(filteredProducts.length, itemsPerPage)} de ${filteredProducts.length} productos`;
        
        document.getElementById('prevButton').disabled = currentPage === 1;
        document.getElementById('nextButton').disabled = currentPage === totalPages;
        
        updatePageNumbers();
    }

    function updatePageNumbers() {
        const pageNumbers = document.getElementById('pageNumbers');
        const pages = [];
        
        // Mostrar máximo 5 números de página
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        
        pageNumbers.innerHTML = pages.map(page => `
            <button class="page-button ${page === currentPage ? 'active' : ''}" 
                    onclick="goToPage(${page})">
                ${page}
            </button>
        `).join('');
    }

    function goToPage(page) {
        currentPage = page;
        renderProducts();
        updatePagination();
        window.scrollTo(0, 0);
    }

    function previousPage() {
        if (currentPage > 1) {
            goToPage(currentPage - 1);
        }
    }

    function nextPage() {
        if (currentPage < totalPages) {
            goToPage(currentPage + 1);
        }
    }

    function changeItemsPerPage() {
        itemsPerPage = parseInt(document.getElementById('itemsPerPage').value);
        currentPage = 1;
        renderProducts();
        updatePagination();
    }

    // Cambiar vista
    function toggleView(view) {
        currentView = view;
        document.getElementById('tableView').classList.toggle('hidden', view !== 'table');
        document.getElementById('gridView').classList.toggle('hidden', view !== 'grid');
        
        // Actualizar botones activos
        document.querySelectorAll('.view-toggle .btn-icon').forEach(btn => {
            btn.classList.toggle('active', btn.querySelector('i').classList.contains(
                view === 'table' ? 'fa-table' : 'fa-th'
            ));
        });
        
        renderProducts();
    }

    // Acciones
    function refreshProducts() {
        showNotification('Inventario actualizado', 'success');
        filterProducts();
    }

    function clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('stockFilter').value = '';
        document.getElementById('sortFilter').value = 'name';
        filterProducts();
    }

    function exportInventory() {
        showLoading('Generando exportación...');
        
        setTimeout(() => {
            const worksheet = XLSX.utils.json_to_sheet(filteredProducts.map(p => ({
                Código: p.code,
                Nombre: p.name,
                Descripción: p.description,
                Categoría: p.category,
                Cantidad: p.quantity,
                Unidad: p.unit,
                'Última actualización': formatDate(p.lastUpdated)
            })));
            
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
            
            XLSX.writeFile(workbook, `inventario_${new Date().toISOString().split('T')[0]}.xlsx`);
            
            hideLoading();
            showNotification('Inventario exportado correctamente', 'success');
        }, 1000);
    }

    function exportSelectedProducts() {
        if (selectedProducts.size === 0) {
            showNotification('Selecciona al menos un producto para exportar', 'warning');
            return;
        }

        const selected = database.products.filter(p => selectedProducts.has(p.id));
        const worksheet = XLSX.utils.json_to_sheet(selected.map(p => ({
            Código: p.code,
            Nombre: p.name,
            Descripción: p.description,
            Categoría: p.category,
            Cantidad: p.quantity,
            Unidad: p.unit,
            'Última actualización': formatDate(p.lastUpdated)
        })));
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos Seleccionados');
        
        XLSX.writeFile(workbook, `productos_seleccionados_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        showNotification('Productos seleccionados exportados', 'success');
    }

    function deleteSelectedProducts() {
        if (selectedProducts.size === 0) {
            showNotification('Selecciona al menos un producto para eliminar', 'warning');
            return;
        }

        if (!confirm(`¿Estás seguro de eliminar ${selectedProducts.size} producto(s)? Esta acción no se puede deshacer.`)) {
            return;
        }

        showLoading('Eliminando productos...');
        
        setTimeout(() => {
            database.products = database.products.filter(p => !selectedProducts.has(p.id));
            saveDatabase();
            
            selectedProducts.clear();
            filterProducts();
            updateSelectionUI();
            
            hideLoading();
            showNotification('Productos eliminados correctamente', 'success');
        }, 1500);
    }

    function adjustStock(productId) {
        // Implementar ajuste de stock
        showNotification('Funcionalidad de ajuste de stock en desarrollo', 'info');
    }

    // Inicializar la página cuando se carga
    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('inventoryContent')) {
            initInventoryPage();
        }
    });