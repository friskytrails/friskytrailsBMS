const mongoose = require('mongoose');

const TodoSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Please add a todo title'], trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  dueDate: { type: Date, default: null },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

TodoSchema.index({ createdBy: 1, status: 1, dueDate: 1 });

module.exports = mongoose.model('Todo', TodoSchema);
