// Carrito de Compras
let carrito = [];

function cargarCarrito() {
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) {
        carrito = JSON.parse(carritoGuardado);
    }
    actualizarCarrito();
}

function guardarCarrito() {
    localStorage.setItem('carrito', JSON.stringify(carrito));
}

function agregarAlCarrito(producto) {
    // Verificar si el carrito está vacío
    if (carrito.length === 0) {
        // Carrito vacío, agregar producto normalmente
        carrito.push({
            _id: producto._id,
            producto: producto.producto,
            precio: producto.precio,
            foto: producto.foto,
            telefono: producto.telefono || '',
            nombre: producto.nombre || 'Vendedor',
            cantidad: 1
        });
        guardarCarrito();
        actualizarCarrito();
        mostrarNotificacionCarrito(`✅ ${producto.producto} agregado al carrito`);
        return;
    }
    
    // Obtener el teléfono del vendedor del primer producto en el carrito
    const vendedorActual = carrito[0].telefono;
    const telefonoNuevo = producto.telefono || '';
    
    // Verificar si es el mismo vendedor
    if (vendedorActual !== telefonoNuevo) {
        // Diferente vendedor - mostrar mensaje de error
        mostrarNotificacionCarrito(`⚠️ Solo puedes comprar productos de un vendedor a la vez. Elimina el carrito actual o finaliza tu compra antes de comprar a otro vendedor.`, 'error');
        return;
    }
    
    // Mismo vendedor, verificar si el producto ya existe
    const existe = carrito.find(item => item._id === producto._id);
    
    if (existe) {
        existe.cantidad++;
    } else {
        carrito.push({
            _id: producto._id,
            producto: producto.producto,
            precio: producto.precio,
            foto: producto.foto,
            telefono: producto.telefono || '',
            nombre: producto.nombre || 'Vendedor',
            cantidad: 1
        });
    }
    
    guardarCarrito();
    actualizarCarrito();
    mostrarNotificacionCarrito(`✅ ${producto.producto} agregado al carrito`);
}

function limpiarCarrito() {
    if (confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
        carrito = [];
        guardarCarrito();
        actualizarCarrito();
        mostrarNotificacionCarrito('🗑️ Carrito vaciado');
    }
}

function eliminarDelCarrito(id) {
    carrito = carrito.filter(item => item._id !== id);
    guardarCarrito();
    actualizarCarrito();
    mostrarNotificacionCarrito(`❌ Producto eliminado del carrito`);
}

function actualizarCarrito() {
    const contador = document.getElementById('carritoContador');
    const carritoItems = document.getElementById('carritoItems');
    const carritoTotal = document.getElementById('carritoTotal');
    
    // Calcular total de items y precio
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const totalPrecio = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    
    // Actualizar contador del ícono del carrito
    if (contador) {
        contador.textContent = totalItems;
        const badge = document.querySelector('.carrito-badge');
        if (badge) {
            badge.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }
    
    // Actualizar el total dentro del carrito
    if (carritoTotal) {
        carritoTotal.textContent = `C$ ${totalPrecio.toLocaleString()}`;
    }
    
    // Actualizar la lista de productos en el carrito
    if (carritoItems) {
        if (carrito.length === 0) {
            carritoItems.innerHTML = '<div class="text-center p-4">🛒 El carrito está vacío</div>';
            return;
        }
        
        carritoItems.innerHTML = '';
        
        carrito.forEach(item => {
            const fotoUrl = item.foto ? `${API}/uploads/${item.foto}` : 'https://via.placeholder.com/50';
            const subtotal = item.precio * item.cantidad;
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'carrito-item';
            itemDiv.innerHTML = `
                <img src="${fotoUrl}" class="carrito-item-img" alt="${item.producto}">
                <div class="carrito-item-info">
                    <div class="carrito-item-titulo">${item.producto}</div>
                    <div class="carrito-item-precio">C$ ${item.precio.toLocaleString()}</div>
                    <div class="carrito-item-vendedor">👤 ${item.nombre || 'Emprendedor'}</div>
                </div>
                <div class="carrito-item-cantidad">
                    <button class="btn-cantidad" onclick="actualizarCantidad('${item._id}', ${item.cantidad - 1})">-</button>
                    <span class="cantidad-numero">${item.cantidad}</span>
                    <button class="btn-cantidad" onclick="actualizarCantidad('${item._id}', ${item.cantidad + 1})">+</button>
                </div>
                <div class="carrito-item-subtotal">
                    C$ ${subtotal.toLocaleString()}
                </div>
                <button class="btn-eliminar-item" onclick="eliminarDelCarrito('${item._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            carritoItems.appendChild(itemDiv);
        });
    }
}
function calcularTotal() {
    return carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
}

function actualizarCarrito() {
    const contador = document.getElementById('carritoContador');
    const carritoItems = document.getElementById('carritoItems');
    const carritoTotal = document.getElementById('carritoTotal');
    const carritoResumen = document.getElementById('carritoResumen');
    
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    if (contador) contador.textContent = totalItems;
    
    const badge = document.querySelector('.carrito-badge');
    if (badge) {
        badge.style.display = totalItems > 0 ? 'flex' : 'none';
    }
    
    if (carritoItems) {
        if (carrito.length === 0) {
            carritoItems.innerHTML = '<div class="text-center p-4">🛒 El carrito está vacío</div>';
            if (carritoTotal) carritoTotal.textContent = 'C$ 0';
            return;
        }
        
        carritoItems.innerHTML = '';
        
        carrito.forEach(item => {
            const fotoUrl = item.foto ? `${API}/uploads/${item.foto}` : 'https://via.placeholder.com/50';
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'carrito-item';
            itemDiv.innerHTML = `
                <img src="${fotoUrl}" class="carrito-item-img" alt="${item.producto}">
                <div class="carrito-item-info">
                    <div class="carrito-item-titulo">${item.producto}</div>
                    <div class="carrito-item-precio">C$ ${item.precio.toLocaleString()}</div>
                    <div class="carrito-item-vendedor">👤 ${item.nombre || 'Emprendedor'}</div>
                </div>
                <div class="carrito-item-cantidad">
                    <button class="btn-cantidad" onclick="actualizarCantidad('${item._id}', ${item.cantidad - 1})">-</button>
                    <span class="cantidad-numero">${item.cantidad}</span>
                    <button class="btn-cantidad" onclick="actualizarCantidad('${item._id}', ${item.cantidad + 1})">+</button>
                </div>
                <div class="carrito-item-subtotal">
                    C$ ${(item.precio * item.cantidad).toLocaleString()}
                </div>
                <button class="btn-eliminar-item" onclick="eliminarDelCarrito('${item._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            carritoItems.appendChild(itemDiv);
        });
    }
    
    const total = calcularTotal();
    if (carritoTotal) carritoTotal.textContent = `C$ ${total.toLocaleString()}`;
    
    if (carritoResumen) {
        if (carrito.length === 0) {
            carritoResumen.innerHTML = '<div class="text-center p-4">No hay productos en el carrito</div>';
        } else {
            carritoResumen.innerHTML = `
                <div class="resumen-items">
                    ${carrito.map(item => `
                        <div class="resumen-item">
                            <span>${item.producto} x${item.cantidad}</span>
                            <span>C$ ${(item.precio * item.cantidad).toLocaleString()}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="resumen-total">
                    <strong>Total a pagar:</strong>
                    <strong class="text-success">C$ ${total.toLocaleString()}</strong>
                </div>
            `;
        }
    }
}

function mostrarNotificacionCarrito(mensaje, tipo = 'success') {
    const notificacion = document.createElement('div');
    notificacion.className = 'notificacion-carrito';
    
    if (tipo === 'error') {
        notificacion.style.background = '#dc3545';
    } else {
        notificacion.style.background = '#28a745';
    }
    
    notificacion.innerHTML = `
        <i class="fas ${tipo === 'error' ? 'fa-exclamation-triangle' : 'fa-shopping-cart'}"></i>
        <span>${mensaje}</span>
    `;
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.classList.add('mostrar');
        setTimeout(() => {
            notificacion.classList.remove('mostrar');
            setTimeout(() => notificacion.remove(), 300);
        }, 3000);
    }, 10);
}

function abrirCarrito() {
    const modal = document.getElementById('carritoModal');
    if (modal) {
        actualizarCarrito();
        modal.style.display = 'flex';
    }
}

function cerrarCarrito() {
    const modal = document.getElementById('carritoModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function abrirCheckout() {
    if (carrito.length === 0) {
        mostrarNotificacionCarrito('⚠️ El carrito está vacío');
        return;
    }
    
    const modal = document.getElementById('checkoutModal');
    if (modal) {
        actualizarCarrito();
        modal.style.display = 'flex';
    }
}

function cerrarCheckout() {
    const modal = document.getElementById('checkoutModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function finalizarCompra() {
    if (carrito.length === 0) {
        mostrarNotificacionCarrito('⚠️ El carrito está vacío');
        return;
    }
    
    const nombre = document.getElementById('checkoutNombre')?.value;
    const direccion = document.getElementById('checkoutDireccion')?.value;
    
    if (!nombre || !direccion) {
        alert('❌ Por favor, completa todos los campos');
        return;
    }
    
    // Obtener información del vendedor (del primer producto)
    const vendedor = {
        telefono: carrito[0].telefono,
        nombre: carrito[0].nombre
    };
    
    let telefonoLimpio = vendedor.telefono.replace(/\D/g, '');
    
    if (telefonoLimpio.length === 8) {
        telefonoLimpio = '505' + telefonoLimpio;
    }
    
    if (telefonoLimpio.length < 8) {
        alert('❌ El vendedor no tiene un número de teléfono válido');
        return;
    }
    
    const total = calcularTotal();
    
    // Construir mensaje
    let mensaje = `*NUEVO PEDIDO - NicaEmprende*%0A`;
    mensaje += `*Cliente:* ${nombre}%0A`;
    mensaje += `*Dirección:* ${direccion}%0A`;
    mensaje += `*Vendedor:* ${vendedor.nombre}%0A`;
    mensaje += `%0A*PRODUCTOS:*%0A`;
    
    carrito.forEach(item => {
        mensaje += `- ${item.producto} x${item.cantidad} = C$${(item.precio * item.cantidad).toLocaleString()}%0A`;
    });
    
    mensaje += `%0A*TOTAL: C$${total.toLocaleString()}*%0A`;
    mensaje += `%0A¡Gracias por apoyar a los emprendedores nicaragüenses!`;
    
    // Confirmar antes de enviar
    if (confirm(`📦 Pedido para: ${vendedor.nombre}\nTotal: C$${total.toLocaleString()}\n\n¿Enviar por WhatsApp?`)) {
        window.open(`https://wa.me/${telefonoLimpio}?text=${mensaje}`, '_blank');
        
        // Limpiar carrito
        carrito = [];
        guardarCarrito();
        actualizarCarrito();
        cerrarCheckout();
        
        document.getElementById('checkoutNombre').value = '';
        document.getElementById('checkoutDireccion').value = '';
        
        mostrarNotificacionCarrito('✅ Pedido enviado. ¡Gracias por tu compra!');
    }
}
window.onclick = function(event) {
    const carritoModal = document.getElementById('carritoModal');
    const checkoutModal = document.getElementById('checkoutModal');
    
    if (event.target === carritoModal) {
        cerrarCarrito();
    }
    if (event.target === checkoutModal) {
        cerrarCheckout();
    }
};

cargarCarrito();
