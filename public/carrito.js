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
    const existe = carrito.find(item => item._id === producto._id);
    
    if (existe) {
        existe.cantidad++;
    } else {
        carrito.push({
            _id: producto._id,
            producto: producto.producto,
            precio: producto.precio,
            foto: producto.foto,
            telefono: producto.telefono,
            nombre: producto.nombre,
            cantidad: 1
        });
    }
    
    guardarCarrito();
    actualizarCarrito();
    mostrarNotificacionCarrito(`✅ ${producto.producto} agregado al carrito`);
}

function eliminarDelCarrito(id) {
    carrito = carrito.filter(item => item._id !== id);
    guardarCarrito();
    actualizarCarrito();
    mostrarNotificacionCarrito(`❌ Producto eliminado del carrito`);
}

function actualizarCantidad(id, nuevaCantidad) {
    const item = carrito.find(item => item._id === id);
    if (item) {
        if (nuevaCantidad <= 0) {
            eliminarDelCarrito(id);
        } else {
            item.cantidad = nuevaCantidad;
            guardarCarrito();
            actualizarCarrito();
        }
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

function mostrarNotificacionCarrito(mensaje) {
    const notificacion = document.createElement('div');
    notificacion.className = 'notificacion-carrito';
    notificacion.innerHTML = `
        <i class="fas fa-shopping-cart"></i>
        <span>${mensaje}</span>
    `;
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.classList.add('mostrar');
        setTimeout(() => {
            notificacion.classList.remove('mostrar');
            setTimeout(() => notificacion.remove(), 300);
        }, 2000);
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
    
    // Agrupar productos por vendedor
    const pedidosPorVendedor = {};
    
    carrito.forEach(item => {
        const telefonoVendedor = item.telefono || '';
        if (!pedidosPorVendedor[telefonoVendedor]) {
            pedidosPorVendedor[telefonoVendedor] = {
                telefono: telefonoVendedor,
                nombre: item.nombre || 'Vendedor',
                productos: []
            };
        }
        pedidosPorVendedor[telefonoVendedor].productos.push(item);
    });
    
    const vendedores = Object.keys(pedidosPorVendedor);
    
    // Confirmar con el usuario
    let mensajeConfirmacion = `📦 Tu pedido se enviará a ${vendedores.length} vendedor(es):\n\n`;
    for (const telefono in pedidosPorVendedor) {
        const vendedor = pedidosPorVendedor[telefono];
        const totalVendedor = vendedor.productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
        mensajeConfirmacion += `👤 ${vendedor.nombre}: C$${totalVendedor.toLocaleString()}\n`;
    }
    mensajeConfirmacion += `\n¿Deseas continuar?`;
    
    if (!confirm(mensajeConfirmacion)) {
        return;
    }
    
    // Enviar mensaje a cada vendedor
    for (const telefono in pedidosPorVendedor) {
        const vendedor = pedidosPorVendedor[telefono];
        let telefonoLimpio = telefono.replace(/\D/g, '');
        
        if (telefonoLimpio.length === 8) {
            telefonoLimpio = '505' + telefonoLimpio;
        }
        
        const totalVendedor = vendedor.productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
        
        let mensaje = `*NUEVO PEDIDO - NicaEmprende*%0A`;
        mensaje += `*Cliente:* ${nombre}%0A`;
        mensaje += `*Dirección:* ${direccion}%0A`;
        mensaje += `*Vendedor:* ${vendedor.nombre}%0A`;
        mensaje += `%0A*PRODUCTOS:*%0A`;
        
        vendedor.productos.forEach(item => {
            mensaje += `- ${item.producto} x${item.cantidad} = C$${(item.precio * item.cantidad).toLocaleString()}%0A`;
        });
        
        mensaje += `%0A*TOTAL: C$${totalVendedor.toLocaleString()}*%0A`;
        mensaje += `%0A¡Gracias por apoyar a los emprendedores nicaragüenses!`;
        
        if (telefonoLimpio && telefonoLimpio.length >= 8) {
            window.open(`https://wa.me/${telefonoLimpio}?text=${mensaje}`, '_blank');
            await new Promise(resolve => setTimeout(resolve, 800));
        }
    }
    
    // Limpiar carrito
    carrito = [];
    guardarCarrito();
    actualizarCarrito();
    cerrarCheckout();
    
    document.getElementById('checkoutNombre').value = '';
    document.getElementById('checkoutDireccion').value = '';
    
    mostrarNotificacionCarrito(`✅ Pedidos enviados a ${vendedores.length} vendedor(es)`);
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