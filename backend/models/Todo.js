const mongoose = require('mongoose');

const TodoSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Please add a todo title'], trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  dueDate: { type: Date, default: null },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  completedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

TodoSchema.index({ createdBy: 1, status: 1, dueDate: 1 });

// Automatically expire completed todos after 20 days.
TodoSchema.index({ completedAt: 1 }, { expireAfterSeconds: 20 * 24 * 60 * 60, partialFilterExpression: { status: 'Completed' } });

module.exports = mongoose.model('Todo', TodoSchema);
