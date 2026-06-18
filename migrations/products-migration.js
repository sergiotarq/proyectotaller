require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const Producto = require('../models/Producto');
const Orden = require('../models/Orden');

const DB_FILE = path.join(__dirname, '../db.json');

async function runMigration() {
    try {
        console.log("🔌 Conectando a MongoDB...");
        await mongoose.connect(process.env.MONGO_DB_URL);
        console.log("✅ Conexión establecida.");

        // Leer db.json
        const fileContent = await fs.readFile(DB_FILE, 'utf8');
        const dbData = JSON.parse(fileContent);

        // Limpiar colecciones anteriores para evitar duplicados
        console.log("🗑️ Limpiando colecciones existentes...");
        await Producto.deleteMany({});
        await Orden.deleteMany({});

        // Migrar Productos
        console.log("📦 Migrando productos...");
        for (const prodData of dbData.productos) {
            const producto = new Producto(prodData);
            await producto.save();
        }
        console.log(`✅ ${dbData.productos.length} productos migrados.`);

        // Migrar Órdenes
        console.log("📋 Migrando órdenes...");
        for (const ordData of dbData.ordenes) {
            const orden = new Orden(ordData);
            await orden.save();
        }
        console.log(`✅ ${dbData.ordenes.length} órdenes migradas.`);

        console.log("🎉 ¡Migración completada con éxito!");
    } catch (error) {
        console.error("❌ Error durante la migración:", error);
    } finally {
        exit();
    }
}

function exit() {
    mongoose.disconnect();
    console.log("🔌 Conexión a la base de datos cerrada.");
}

runMigration();
