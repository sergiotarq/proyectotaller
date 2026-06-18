const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5500;
const DB_FILE = path.join(__dirname, 'db.json');

// Middleware
app.use(cors());
app.use(express.json());

// Servir la carpeta raíz y el directorio de subidas de forma estática
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Asegurarse de que el directorio de uploads exista al iniciar
async function ensureUploadsDir() {
    try {
        await fs.mkdir(path.join(__dirname, 'public/uploads'), { recursive: true });
    } catch (err) {
        console.error("Error al crear carpeta de subidas:", err);
    }
}
ensureUploadsDir();

// ==========================================
// CONFIGURACIÓN DE MULTER (Subida de Imágenes)
// ==========================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'public/uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Validar tipo MIME (JPG o PNG)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato de imagen inválido. Solo se admiten JPG/PNG.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 Megabytes máximo
    }
});

// ==========================================
// FUNCIONES AUXILIARES DE BASE DE DATOS
// ==========================================
async function readDB() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Retornar estructura por defecto en caso de error
        return { productos: [], ordenes: [] };
    }
}

async function writeDB(data) {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Genera un código de orden único alfanumérico
function generateUniqueCode(existingOrders) {
    const chars = '0123456789ABCDEF';
    let code;
    let isUnique = false;
    
    while (!isUnique) {
        let codeSegment = '';
        for (let i = 0; i < 4; i++) {
            codeSegment += chars[Math.floor(Math.random() * chars.length)];
        }
        code = `DRAKO-${codeSegment}`;
        isUnique = !existingOrders.some(o => o.code === code);
    }
    return code;
}

// ==========================================
// ENDPOINTS DE AUTENTICACIÓN
// ==========================================
app.post('/api/login', (req, res) => {
    const { role, password } = req.body;
    
    if (!role || !password) {
        return res.status(400).json({ error: 'Rol y contraseña son requeridos' });
    }

    if (role === 'tecnico' && password === 'tecnico123') {
        return res.json({ name: 'Técnico Drakotec', role: 'tecnico', token: 'mock-tec-session-token' });
    } else if (role === 'admin' && password === 'admin123') {
        return res.json({ name: 'Administrador Drakotec', role: 'admin', token: 'mock-admin-session-token' });
    }

    return res.status(401).json({ error: 'Credenciales incorrectas' });
});

// ==========================================
// ENDPOINTS API: PRODUCTOS
// ==========================================

// Obtener todos los productos
app.get('/api/productos', async (req, res) => {
    try {
        const db = await readDB();
        res.json(db.productos);
    } catch (err) {
        res.status(500).json({ error: 'Error al leer productos de la base de datos' });
    }
});

// Crear un producto (TEC-U01 - Rol: Admin)
app.post('/api/productos', (req, res, next) => {
    // Usar multer para subir la imagen principal
    upload.single('imagen')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'La imagen excede el límite de 5MB' });
            }
            return res.status(400).json({ error: err.message });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        const { name, price, stock, category, specs } = req.body;
        const parsedPrice = parseFloat(price);
        const parsedStock = parseInt(stock);

        // Validación estricta en el servidor
        const errors = [];
        if (!name || name.trim() === "") errors.push("El nombre es requerido");
        if (isNaN(parsedPrice) || parsedPrice < 0) errors.push("El precio debe ser un número mayor o igual a 0");
        if (isNaN(parsedStock) || parsedStock < 0) errors.push("El stock debe ser un entero mayor o igual a 0");
        if (!category) errors.push("La categoría es requerida");
        if (!specs || specs.trim() === "") errors.push("La ficha técnica es requerida");
        if (!req.file) errors.push("La imagen principal del producto es obligatoria");

        if (errors.length > 0) {
            // Si hay errores, borrar el archivo subido si existiese
            if (req.file) {
                await fs.unlink(req.file.path).catch(() => {});
            }
            return res.status(400).json({ errors });
        }

        const db = await readDB();
        
        // Generar ID correlativo
        const nextId = db.productos.length > 0 
            ? Math.max(...db.productos.map(p => p.id)) + 1 
            : 1;

        const nuevoProducto = {
            id: nextId,
            name: name.trim(),
            category: category.trim(),
            price: parsedPrice,
            stock: parsedStock,
            specs: specs.trim(),
            imagePath: `/uploads/${path.basename(req.file.path)}`
        };

        db.productos.push(nuevoProducto);
        await writeDB(db);

        res.status(201).json({ message: 'Producto publicado con éxito', producto: nuevoProducto });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor al publicar producto' });
    }
});

// Actualizar un producto (TEC-U01 - Rol: Admin)
app.put('/api/productos/:id', (req, res, next) => {
    upload.single('imagen')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'La imagen excede el límite de 5MB' });
            }
            return res.status(400).json({ error: err.message });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, price, stock, category, specs } = req.body;
        const parsedPrice = parseFloat(price);
        const parsedStock = parseInt(stock);

        const db = await readDB();
        const index = db.productos.findIndex(p => p.id === id);

        if (index === -1) {
            if (req.file) await fs.unlink(req.file.path).catch(() => {});
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Validaciones
        const errors = [];
        if (!name || name.trim() === "") errors.push("El nombre es requerido");
        if (isNaN(parsedPrice) || parsedPrice < 0) errors.push("El precio debe ser un número mayor o igual a 0");
        if (isNaN(parsedStock) || parsedStock < 0) errors.push("El stock debe ser un entero mayor o igual a 0");
        if (!category) errors.push("La categoría es requerida");
        if (!specs || specs.trim() === "") errors.push("La ficha técnica es requerida");

        if (errors.length > 0) {
            if (req.file) await fs.unlink(req.file.path).catch(() => {});
            return res.status(400).json({ errors });
        }

        // Editar producto existente
        const prod = db.productos[index];
        prod.name = name.trim();
        prod.category = category.trim();
        prod.price = parsedPrice;
        prod.stock = parsedStock;
        prod.specs = specs.trim();

        // Si se cargó una nueva imagen, reemplazar la anterior
        if (req.file) {
            // Opcional: borrar el archivo anterior del disco si no es una predeterminada
            if (prod.imagePath && !prod.imagePath.includes('/uploads/iphone') && !prod.imagePath.includes('/uploads/s24')) {
                const oldPath = path.join(__dirname, 'public', prod.imagePath);
                await fs.unlink(oldPath).catch(() => {});
            }
            prod.imagePath = `/uploads/${path.basename(req.file.path)}`;
        }

        db.productos[index] = prod;
        await writeDB(db);

        res.json({ message: 'Producto actualizado con éxito', producto: prod });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor al actualizar producto' });
    }
});

// ==========================================
// ENDPOINTS API: ÓRDENES TÉCNICAS (TEC-A01)
// ==========================================

// Obtener todas las órdenes
app.get('/api/ordenes', async (req, res) => {
    try {
        const db = await readDB();
        res.json(db.ordenes);
    } catch (err) {
        res.status(500).json({ error: 'Error al leer las órdenes de la base de datos' });
    }
});

// Crear una orden (TEC-A01 - Rol: Técnico)
app.post('/api/ordenes', async (req, res) => {
    try {
        const { client, brandModel, issues, accessories } = req.body;

        // Validación estricta en el servidor
        const errors = [];
        if (!client || client.trim() === "") errors.push("El nombre del cliente es obligatorio");
        if (!brandModel || brandModel.trim() === "") errors.push("La marca y modelo son obligatorios");
        if (!issues || issues.trim() === "") errors.push("El detalle de las fallas es obligatorio");

        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const db = await readDB();
        const code = generateUniqueCode(db.ordenes);

        const nuevaOrden = {
            code,
            client: client.trim(),
            brandModel: brandModel.trim(),
            issues: issues.trim(),
            accessories: accessories ? accessories.trim() : "Ninguno",
            status: "recibido", // Estado inicial
            createdAt: new Date().toISOString()
        };

        db.ordenes.push(nuevaOrden);
        await writeDB(db);

        res.status(201).json({ message: 'Orden técnica registrada con éxito', orden: nuevaOrden });
    } catch (err) {
        res.status(500).json({ error: 'Error interno al registrar la orden' });
    }
});

// Actualizar el estado de una orden
app.put('/api/ordenes/:code', async (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        const { status } = req.body;

        const allowedStatus = ['recibido', 'diagnostico', 'reparacion', 'listo'];
        if (!status || !allowedStatus.includes(status)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        const db = await readDB();
        const index = db.ordenes.findIndex(o => o.code === code);

        if (index === -1) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        db.ordenes[index].status = status;
        await writeDB(db);

        res.json({ message: 'Estado de orden actualizado', orden: db.ordenes[index] });
    } catch (err) {
        res.status(500).json({ error: 'Error interno al actualizar la orden' });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor Drakotec corriendo en: http://localhost:${PORT}`);
});
