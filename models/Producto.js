const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    specs: { type: String, required: true },
    imagePath: { type: String, required: true }
});

module.exports = mongoose.model('Producto', productoSchema);
