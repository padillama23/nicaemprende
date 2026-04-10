const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const ImageKit = require('imagekit');

const app = express();
const SECRET = "nica_secreto";

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// 🔥 CONFIGURAR IMAGEKIT
const imagekit = new ImageKit({
  publicKey: 'public_w3JTdHVznciMeY3TLl7GHMFcSRA=',
  privateKey: 'private_1nSaiAQ9bsTu271k5w2UaijoSCw=',
  urlEndpoint: 'https://ik.imagekit.io/c3ginxqwu'
});

console.log("✅ ImageKit configurado");

// MongoDB
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nicaemprende";
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.log("❌ Error MongoDB:", err));

// Multer - Usar memoryStorage para ImageKit
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'), false);
    }
  }
});

// MODELOS
const Usuario = mongoose.model("Usuario", {
  nombre: String,
  telefono: String,
  password: { type: String, select: false },
  createdAt: { type: Date, default: Date.now }
});

const Producto = mongoose.model("Producto", {
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  nombre: String,
  telefono: String,
  producto: String,
  precio: Number,
  foto: String,
  lat: Number,
  lng: Number,
  createdAt: { type: Date, default: Date.now }
});

// AUTH
function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No autorizado" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

// REGISTRO USUARIO
app.post("/registro", async (req, res) => {
  const { nombre, telefono, password } = req.body;
  
  if (!nombre || !telefono || !password) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
  }
  
  const existe = await Usuario.findOne({ telefono });
  if (existe) {
    return res.status(400).json({ error: "Este teléfono ya está registrado" });
  }

  const hash = await bcrypt.hash(password, 10);

  const nuevo = new Usuario({
    nombre,
    telefono,
    password: hash
  });

  await nuevo.save();
  
  res.json({ 
    mensaje: "Usuario creado exitosamente", 
    usuario: { id: nuevo._id, nombre, telefono } 
  });
});

// LOGIN
app.post("/login", async (req, res) => {
  const { telefono, password } = req.body;

  const user = await Usuario.findOne({ telefono }).select("+password");
  
  if (!user) {
    return res.status(400).json({ error: "Usuario no existe" });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(400).json({ error: "Contraseña incorrecta" });
  }

  const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: "1d" });

  res.json({ 
    token, 
    usuario: { id: user._id, nombre: user.nombre, telefono: user.telefono } 
  });
});

// 🔥 PUBLICAR PRODUCTO CON IMAGEKIT - VERSIÓN DEFINITIVA
app.post("/producto", auth, upload.single("foto"), async (req, res) => {
  try {
    console.log("=".repeat(50));
    console.log("📦 PUBLICANDO PRODUCTO");
    
    const { nombre, telefono, producto, precio, lat, lng } = req.body;
    
    if (!producto || !precio) {
      return res.status(400).json({ error: "Producto y precio son obligatorios" });
    }
    
    if (!telefono) {
      return res.status(400).json({ error: "El teléfono es obligatorio" });
    }
    
    let imageUrl = "";
    
    if (req.file) {
      console.log("📸 Subiendo imagen a ImageKit...");
      console.log("  Nombre original:", req.file.originalname);
      console.log("  Tamaño:", req.file.size, "bytes");
      console.log("  Tipo:", req.file.mimetype);
      
      // Obtener la extensión del archivo
      const extension = path.extname(req.file.originalname).toLowerCase();
      // Crear un nombre base simple (solo timestamp)
      const baseName = `producto_${Date.now()}`;
      // Nombre final con extensión
      const finalFileName = `${baseName}${extension}`;
      
      console.log("  Nombre para ImageKit:", finalFileName);
      
      try {
        const result = await imagekit.upload({
          file: req.file.buffer.toString('base64'),
          fileName: finalFileName,
          folder: "/nicaemprende",
          useUniqueFileName: true,
          isPrivateFile: false,
          tags: ["nicaemprende", "producto"]
        });
        
        imageUrl = result.url;
        console.log("✅ Imagen subida exitosamente!");
        console.log("   URL COMPLETA:", imageUrl);
        console.log("   File ID:", result.fileId);
        
      } catch (uploadError) {
        console.error("❌ ERROR DETALLADO al subir a ImageKit:");
        console.error("   Mensaje:", uploadError.message);
        if (uploadError.response) {
          console.error("   Respuesta del servidor:", JSON.stringify(uploadError.response.data));
        }
      }
    } else {
      console.log("⚠️ No se recibió archivo de imagen");
    }
    
    const nuevo = new Producto({
      usuarioId: req.userId,
      nombre: nombre || "Emprendedor",
      telefono: telefono,
      producto: producto,
      precio: Number(precio),
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
      foto: imageUrl
    });

    await nuevo.save();
    console.log("✅ Producto guardado en MongoDB");
    console.log("   ID:", nuevo._id);
    console.log("   URL guardada:", imageUrl || "(sin imagen)");
    console.log("=".repeat(50));
    
    res.json({ 
      mensaje: "Producto publicado", 
      producto: nuevo
    });
    
  } catch (error) {
    console.error("❌ ERROR GENERAL:", error);
    res.status(500).json({ error: "Error al publicar el producto: " + error.message });
  }
});

// EDITAR PRODUCTO
app.put("/producto/:id", auth, upload.single("foto"), async (req, res) => {
  try {
    const { nombre, telefono, producto, precio, lat, lng } = req.body;
    const productoId = req.params.id;
    
    const productoExistente = await Producto.findOne({ _id: productoId, usuarioId: req.userId });
    
    if (!productoExistente) {
      return res.status(404).json({ error: "Producto no encontrado o no tienes permisos" });
    }
    
    let imageUrl = productoExistente.foto;
    
    // Si suben nueva imagen, actualizar
    if (req.file) {
      console.log("📸 Actualizando imagen...");
      
      const extension = path.extname(req.file.originalname).toLowerCase();
      const baseName = `producto_${Date.now()}`;
      const finalFileName = `${baseName}${extension}`;
      
      try {
        const result = await imagekit.upload({
          file: req.file.buffer.toString('base64'),
          fileName: finalFileName,
          folder: "/nicaemprende",
          useUniqueFileName: true,
          isPrivateFile: false
        });
        
        imageUrl = result.url;
        console.log("✅ Imagen actualizada:", imageUrl);
      } catch (uploadError) {
        console.error("Error al subir a ImageKit:", uploadError.message);
      }
    }
    
    const updateData = {
      nombre: nombre || productoExistente.nombre,
      telefono: telefono || productoExistente.telefono,
      producto: producto || productoExistente.producto,
      precio: precio ? Number(precio) : productoExistente.precio,
      lat: lat ? Number(lat) : productoExistente.lat,
      lng: lng ? Number(lng) : productoExistente.lng,
      foto: imageUrl
    };
    
    const productoActualizado = await Producto.findByIdAndUpdate(
      productoId,
      updateData,
      { new: true }
    );
    
    res.json({ mensaje: "Producto actualizado exitosamente", producto: productoActualizado });
    
  } catch (error) {
    console.error("Error al editar:", error);
    res.status(500).json({ error: "Error al actualizar el producto" });
  }
});

// ELIMINAR PRODUCTO
app.delete("/producto/:id", auth, async (req, res) => {
  try {
    const producto = await Producto.findOne({ _id: req.params.id, usuarioId: req.userId });
    
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    
    await producto.deleteOne();
    res.json({ mensaje: "Producto eliminado exitosamente" });
    
  } catch (error) {
    console.error("Error al eliminar:", error);
    res.status(500).json({ error: "Error al eliminar el producto" });
  }
});

// LISTAR TODOS LOS PRODUCTOS
app.get("/productos", async (req, res) => {
  const productos = await Producto.find().sort({ createdAt: -1 });
  res.json(productos);
});

// OBTENER MIS PRODUCTOS
app.get("/mis-productos", auth, async (req, res) => {
  const productos = await Producto.find({ usuarioId: req.userId }).sort({ createdAt: -1 });
  res.json(productos);
});

// OBTENER UN PRODUCTO ESPECÍFICO
app.get("/producto/:id", auth, async (req, res) => {
  try {
    const producto = await Producto.findOne({ _id: req.params.id, usuarioId: req.userId });
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener el producto" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🖼️ ImageKit URL: https://ik.imagekit.io/c3ginxqwu`);
});