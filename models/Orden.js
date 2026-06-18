const mongoose = require('mongoose');

const ordenSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    client: { type: String, required: true },
    brandModel: { type: String, required: true },
    issues: { type: String, required: true },
    accessories: { type: String, default: 'Ninguno' },
    status: { 
        type: String, 
        required: true, 
        enum: ['recibido', 'diagnostico', 'reparacion', 'listo'],
        default: 'recibido'
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Orden', ordenSchema);
