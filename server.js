const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");

const app = express();
const SECRET = "nica_secreto";

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static("public"));

// MongoDB
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nicaemprende";
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.log("❌ Error MongoDB:", err));

// Multer
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

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

// PUBLICAR PRODUCTO
app.post("/producto", auth, upload.single("foto"), async (req, res) => {
  const { nombre, telefono, producto, precio, lat, lng } = req.body;
  
  if (!producto || !precio) {
    return res.status(400).json({ error: "Producto y precio son obligatorios" });
  }
  
  if (!telefono) {
    return res.status(400).json({ error: "El teléfono es obligatorio para contacto" });
  }
  
  const nuevo = new Producto({
    usuarioId: req.userId,
    nombre: nombre || "Emprendedor",
    telefono: telefono,
    producto: producto,
    precio: Number(precio),
    lat: lat ? Number(lat) : null,
    lng: lng ? Number(lng) : null,
    foto: req.file ? req.file.filename : ""
  });

  await nuevo.save();
  
  res.json({ mensaje: "Producto publicado", producto: nuevo });
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
    
    const updateData = {
      nombre: nombre || productoExistente.nombre,
      telefono: telefono || productoExistente.telefono,
      producto: producto || productoExistente.producto,
      precio: precio ? Number(precio) : productoExistente.precio,
      lat: lat ? Number(lat) : productoExistente.lat,
      lng: lng ? Number(lng) : productoExistente.lng
    };
    
    if (req.file) {
      if (productoExistente.foto) {
        const oldFotoPath = path.join(__dirname, "uploads", productoExistente.foto);
        if (fs.existsSync(oldFotoPath)) {
          fs.unlinkSync(oldFotoPath);
        }
      }
      updateData.foto = req.file.filename;
    }
    
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
    
    if (producto.foto) {
      const fotoPath = path.join(__dirname, "uploads", producto.foto);
      if (fs.existsSync(fotoPath)) {
        fs.unlinkSync(fotoPath);
      }
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

app.listen(3000, () => console.log("🚀 Servidor corriendo en http://localhost:3000"));
