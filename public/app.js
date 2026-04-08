const API = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : `https://${window.location.hostname}`;
let map;
let markers = [];
let editModal;

function initMap() {
  map = L.map('map').setView([12.13, -86.25], 7);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  setTimeout(() => map.invalidateSize(), 500);
  
  map.on('click', function(e) {
    document.getElementById('lat').value = e.latlng.lat.toFixed(6);
    document.getElementById('lng').value = e.latlng.lng.toFixed(6);
  });

  cargarProductos();
}

// Función para mostrar/ocultar contraseña
function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  const icon = button.querySelector('i');
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
    
    // Efecto visual
    input.style.transition = 'all 0.3s';
    input.style.backgroundColor = '#fff9c4';
    setTimeout(() => {
      input.style.backgroundColor = '';
    }, 300);
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
    
    // Efecto visual
    input.style.transition = 'all 0.3s';
    input.style.backgroundColor = '#fff9c4';
    setTimeout(() => {
      input.style.backgroundColor = '';
    }, 300);
  }
}

// Función para verificar fuerza de contraseña
function verificarFuerzaPassword() {
  const password = document.getElementById('passR').value;
  const indicador = document.getElementById('passwordStrength');
  
  if (!indicador) return;
  
  if (password.length === 0) {
    indicador.innerHTML = '';
    return;
  }
  
  let fuerza = '';
  let color = '';
  
  if (password.length < 6) {
    fuerza = '❌ Débil - Mínimo 6 caracteres';
    color = 'red';
  } else if (password.length < 8) {
    fuerza = '⚠️ Regular';
    color = 'orange';
  } else if (password.match(/[0-9]/) && password.match(/[a-zA-Z]/)) {
    fuerza = '✅ Fuerte';
    color = 'green';
  } else {
    fuerza = '⚠️ Media - Agrega números';
    color = 'orange';
  }
  
  indicador.innerHTML = `<small style="color: ${color}">${fuerza}</small>`;
}

function mostrarNotificacion(mensaje, tipo = 'info') {
  const alertClass = tipo === 'success' ? 'alert-success' : 'alert-danger';
  const notificacion = document.createElement('div');
  notificacion.className = `alert ${alertClass} position-fixed top-0 end-0 m-3`;
  notificacion.style.zIndex = '9999';
  notificacion.style.animation = 'fadeIn 0.5s';
  notificacion.innerHTML = mensaje;
  document.body.appendChild(notificacion);
  setTimeout(() => notificacion.remove(), 3000);
}

function verificarLogin() {
  const token = localStorage.getItem("token");
  const formPublicar = document.getElementById("formPublicar");
  const misPublicaciones = document.getElementById("misPublicaciones");
  const userTabs = document.getElementById("userTabs");
  const btnLogout = document.getElementById("btnLogout");
  
  if (token) {
    if (userTabs) userTabs.style.display = "block";
    if (formPublicar) formPublicar.style.display = "block";
    if (btnLogout) btnLogout.style.display = "block";
    mostrarTab('publicar');
    cargarMisProductos();
  } else {
    if (userTabs) userTabs.style.display = "none";
    if (formPublicar) formPublicar.style.display = "none";
    if (misPublicaciones) misPublicaciones.style.display = "none";
    if (btnLogout) btnLogout.style.display = "none";
  }
}

function mostrarTab(tab) {
  const formPublicar = document.getElementById("formPublicar");
  const misPublicaciones = document.getElementById("misPublicaciones");
  const tabs = document.querySelectorAll('.tab-btn');
  
  tabs.forEach(btn => btn.classList.remove('active'));
  
  if (tab === 'publicar') {
    formPublicar.style.display = "block";
    misPublicaciones.style.display = "none";
    if (event && event.target) event.target.classList.add('active');
  } else {
    formPublicar.style.display = "none";
    misPublicaciones.style.display = "block";
    if (event && event.target) event.target.classList.add('active');
    cargarMisProductos();
  }
}

async function registrarUsuario() {
  const nombre = document.getElementById("nombreR").value;
  const telefono = document.getElementById("telR").value;
  const password = document.getElementById("passR").value;
  
  if (!nombre || !telefono || !password) {
    mostrarNotificacion("❌ Todos los campos son obligatorios", "error");
    return;
  }
  
  if (password.length < 6) {
    mostrarNotificacion("❌ La contraseña debe tener al menos 6 caracteres", "error");
    return;
  }
  
  try {
    const res = await fetch(`${API}/registro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, telefono, password })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      mostrarNotificacion("✅ " + data.mensaje, "success");
      document.getElementById("nombreR").value = "";
      document.getElementById("telR").value = "";
      document.getElementById("passR").value = "";
      document.getElementById("telLogin").value = telefono;
      document.getElementById("passLogin").value = password;
      document.getElementById("passwordStrength").innerHTML = "";
    } else {
      mostrarNotificacion("❌ " + (data.error || "Error al registrar"), "error");
    }
  } catch (error) {
    mostrarNotificacion("❌ Error de conexión: " + error.message, "error");
  }
}

async function login() {
  const telefono = document.getElementById("telLogin").value;
  const password = document.getElementById("passLogin").value;
  
  if (!telefono || !password) {
    mostrarNotificacion("❌ Ingresa teléfono y contraseña", "error");
    return;
  }
  
  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefono, password })
    });
    
    const data = await res.json();
    
    if (res.ok && data.token) {
      localStorage.setItem("token", data.token);
      mostrarNotificacion("✅ ¡Bienvenido " + (data.usuario?.nombre || "Emprendedor") + "!", "success");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      mostrarNotificacion("❌ " + (data.error || "Error al iniciar sesión"), "error");
    }
  } catch (error) {
    mostrarNotificacion("❌ Error de conexión: " + error.message, "error");
  }
}

function logout() {
  localStorage.removeItem("token");
  mostrarNotificacion("👋 Sesión cerrada exitosamente", "success");
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

async function publicar() {
  const token = localStorage.getItem("token");
  if (!token) {
    mostrarNotificacion("❌ Debes iniciar sesión primero", "error");
    return;
  }
  
  const producto = document.getElementById("prod").value;
  const precio = document.getElementById("precio").value;
  const nombre = document.getElementById("nombre").value;
  const telefono = document.getElementById("tel").value;
  const lat = document.getElementById("lat").value;
  const lng = document.getElementById("lng").value;
  const fotoFile = document.getElementById("foto").files[0];
  
  if (!producto || !precio) {
    mostrarNotificacion("❌ Producto y precio son obligatorios", "error");
    return;
  }
  
  if (!telefono) {
    mostrarNotificacion("❌ El teléfono es obligatorio para que te contacten", "error");
    return;
  }
  
  const formData = new FormData();
  formData.append("producto", producto);
  formData.append("precio", precio);
  if (nombre) formData.append("nombre", nombre);
  formData.append("telefono", telefono);
  if (lat) formData.append("lat", lat);
  if (lng) formData.append("lng", lng);
  if (fotoFile) formData.append("foto", fotoFile);
  
  try {
    const res = await fetch(`${API}/producto`, {
      method: "POST",
      headers: { "Authorization": token },
      body: formData
    });
    
    const data = await res.json();
    
    if (res.ok) {
      mostrarNotificacion("✅ Producto publicado exitosamente", "success");
      document.getElementById("prod").value = "";
      document.getElementById("precio").value = "";
      document.getElementById("lat").value = "";
      document.getElementById("lng").value = "";
      document.getElementById("foto").value = "";
      cargarProductos();
      cargarMisProductos();
    } else {
      mostrarNotificacion("❌ " + (data.error || "Error al publicar"), "error");
    }
  } catch (error) {
    mostrarNotificacion("❌ Error al publicar: " + error.message, "error");
  }
}

async function cargarMisProductos() {
  const token = localStorage.getItem("token");
  if (!token) return;
  
  const contenedor = document.getElementById("misProductosList");
  contenedor.innerHTML = '<div class="text-center"><div class="spinner-border text-primary"></div><p>Cargando...</p></div>';
  
  try {
    const res = await fetch(`${API}/mis-productos`, {
      headers: { "Authorization": token }
    });
    
    const productos = await res.json();
    
    if (productos.length === 0) {
      contenedor.innerHTML = '<div class="text-center">No tienes publicaciones aún. ¡Crea tu primera publicación!</div>';
      return;
    }
    
    contenedor.innerHTML = "";
    
    productos.forEach(prod => {
      const col = document.createElement("div");
      col.className = "col-md-6 col-lg-4 mb-3";
      
      const fotoUrl = prod.foto ? `${API}/uploads/${prod.foto}` : "https://via.placeholder.com/300x200?text=Sin+Imagen";
      
      col.innerHTML = `
        <div class="card producto-propio">
          <img src="${fotoUrl}" class="card-img-top" style="height:180px;object-fit:cover;" alt="${prod.producto}">
          <div class="card-body">
            <h6 class="card-title">${prod.producto}</h6>
            <p class="text-success fw-bold">C$ ${prod.precio.toLocaleString()}</p>
            <p class="small">📞 ${prod.telefono}</p>
            <div class="btn-group w-100">
              <button class="btn btn-edit btn-sm" onclick="abrirEditar('${prod._id}')">
                <i class="fas fa-edit"></i> Editar
              </button>
              <button class="btn btn-delete btn-sm" onclick="eliminarProducto('${prod._id}')">
                <i class="fas fa-trash"></i> Eliminar
              </button>
            </div>
          </div>
        </div>
      `;
      
      contenedor.appendChild(col);
    });
    
  } catch (error) {
    console.error("Error:", error);
    contenedor.innerHTML = '<div class="text-danger">Error al cargar tus productos</div>';
  }
}

async function abrirEditar(id) {
  const token = localStorage.getItem("token");
  if (!token) return;
  
  try {
    const res = await fetch(`${API}/producto/${id}`, {
      headers: { "Authorization": token }
    });
    
    const producto = await res.json();
    
    document.getElementById("editProductoId").value = producto._id;
    document.getElementById("editProd").value = producto.producto;
    document.getElementById("editPrecio").value = producto.precio;
    document.getElementById("editNombre").value = producto.nombre || "";
    document.getElementById("editTelefono").value = producto.telefono;
    document.getElementById("editLat").value = producto.lat || "";
    document.getElementById("EditLng").value = producto.lng || "";
    
    const fotoActualDiv = document.getElementById("fotoActual");
    if (producto.foto) {
      fotoActualDiv.innerHTML = `<img src="${API}/uploads/${producto.foto}" style="width:100px; border-radius:8px;"><br><small>Foto actual</small>`;
    } else {
      fotoActualDiv.innerHTML = "<small>Sin foto actual</small>";
    }
    
    editModal = new bootstrap.Modal(document.getElementById('editModal'));
    editModal.show();
    
  } catch (error) {
    mostrarNotificacion("Error al cargar el producto", "error");
  }
}

async function guardarEdicion() {
  const id = document.getElementById("editProductoId").value;
  const token = localStorage.getItem("token");
  
  const formData = new FormData();
  formData.append("producto", document.getElementById("editProd").value);
  formData.append("precio", document.getElementById("editPrecio").value);
  formData.append("nombre", document.getElementById("editNombre").value);
  formData.append("telefono", document.getElementById("editTelefono").value);
  formData.append("lat", document.getElementById("editLat").value);
  formData.append("lng", document.getElementById("EditLng").value);
  
  const fotoFile = document.getElementById("editFoto").files[0];
  if (fotoFile) {
    formData.append("foto", fotoFile);
  }
  
  try {
    const res = await fetch(`${API}/producto/${id}`, {
      method: "PUT",
      headers: { "Authorization": token },
      body: formData
    });
    
    const data = await res.json();
    
    if (res.ok) {
      mostrarNotificacion("✅ Producto actualizado exitosamente", "success");
      editModal.hide();
      cargarProductos();
      cargarMisProductos();
    } else {
      mostrarNotificacion("❌ " + (data.error || "Error al actualizar"), "error");
    }
  } catch (error) {
    mostrarNotificacion("❌ Error al actualizar: " + error.message, "error");
  }
}

async function eliminarProducto(id) {
  if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) return;
  
  const token = localStorage.getItem("token");
  
  try {
    const res = await fetch(`${API}/producto/${id}`, {
      method: "DELETE",
      headers: { "Authorization": token }
    });
    
    const data = await res.json();
    
    if (res.ok) {
      mostrarNotificacion("✅ Producto eliminado exitosamente", "success");
      cargarProductos();
      cargarMisProductos();
    } else {
      mostrarNotificacion("❌ " + (data.error || "Error al eliminar"), "error");
    }
  } catch (error) {
    mostrarNotificacion("❌ Error al eliminar: " + error.message, "error");
  }
}

async function cargarProductos() {
  const contenedor = document.getElementById("productos");
  if (!contenedor) return;
  
  contenedor.innerHTML = '<div class="text-center"><div class="spinner-border text-primary"></div><p>Cargando productos...</p></div>';
  
  try {
    const res = await fetch(`${API}/productos`);
    const productos = await res.json();
    
    contenedor.innerHTML = "";
    
    if (productos.length === 0) {
      contenedor.innerHTML = '<div class="text-center">No hay productos aún. ¡Sé el primero en publicar!</div>';
      return;
    }
    
    if (markers) {
      markers.forEach(marker => map.removeLayer(marker));
      markers = [];
    }
    
    productos.forEach(prod => {
      const col = document.createElement("div");
      col.className = "col-md-4 col-lg-3 mb-4 producto-card";
      
      const fotoUrl = prod.foto ? `${API}/uploads/${prod.foto}` : "https://via.placeholder.com/300x200?text=Sin+Imagen";
      
      // IMPORTANTE: El teléfono se pasa al carrito
      col.innerHTML = `
        <div class="card h-100 shadow-sm">
          <img src="${fotoUrl}" class="card-img-top" alt="${prod.producto}" onerror="this.src='https://via.placeholder.com/300x200?text=Error+Imagen'">
          <div class="card-body">
            <h6 class="card-title fw-bold">${prod.producto}</h6>
            <p class="text-success fw-bold fs-5">C$ ${prod.precio.toLocaleString()}</p>
            <p class="small text-muted">👤 ${prod.nombre || 'Anónimo'}</p>
            <p class="small text-muted">📞 ${prod.telefono || 'Sin teléfono'}</p>
            <button onclick='agregarAlCarrito({
              _id: "${prod._id}",
              producto: "${prod.producto.replace(/"/g, '\\"')}",
              precio: ${prod.precio},
              foto: "${prod.foto || ''}",
              telefono: "${prod.telefono || ''}",
              nombre: "${(prod.nombre || 'Emprendedor').replace(/"/g, '\\"')}"
            })' class="btn-agregar-carrito w-100">
              <i class="fas fa-cart-plus"></i> Agregar al carrito
            </button>
            <a href="https://wa.me/${prod.telefono}" target="_blank" class="btn btn-whatsapp btn-sm w-100 mt-2">
              💬 Contactar vendedor
            </a>
          </div>
          <div class="card-footer text-muted small">
            📅 ${new Date(prod.createdAt).toLocaleDateString('es-ES')}
          </div>
        </div>
      `;
      
      contenedor.appendChild(col);
      
      // Resto del código para marcadores...
      if (prod.lat && prod.lng && map) {
        const marker = L.marker([prod.lat, prod.lng])
          .bindPopup(`
            <b>${prod.producto}</b><br>
            Precio: C$${prod.precio}<br>
            📞 ${prod.telefono}<br>
            <a href="https://wa.me/${prod.telefono}" target="_blank">Contactar por WhatsApp</a>
          `)
          .addTo(map);
        markers.push(marker);
      }
    });
    
    if (markers.length > 0 && map) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }
    
  } catch (error) {
    console.error("Error:", error);
    contenedor.innerHTML = '<div class="text-danger text-center">❌ Error al cargar productos</div>';
  }
}

function obtenerMiUbicacion() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        document.getElementById("lat").value = lat.toFixed(6);
        document.getElementById("lng").value = lng.toFixed(6);
        if (map) map.setView([lat, lng], 13);
        mostrarNotificacion("✅ Ubicación capturada", "success");
      },
      () => {
        mostrarNotificacion("❌ No se pudo obtener tu ubicación", "error");
      }
    );
  } else {
    mostrarNotificacion("❌ Tu navegador no soporta geolocalización", "error");
  }
}

window.onload = () => {
  initMap();
  verificarLogin();
};