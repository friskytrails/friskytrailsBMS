const express = require('express');
const router = express.Router();
const Todo = require('../models/Todo');
const { protect, verifiedOnly } = require('../middleware/auth');

router.use(protect, verifiedOnly);

const removeExpiredCompletedTodos = async () => {
  const cutoff = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
  await Todo.deleteMany({
    status: 'Completed',
    $or: [
      { completedAt: { $lte: cutoff } },
      { completedAt: null, updatedAt: { $lte: cutoff } },
    ],
  });
};

router.get('/', async (req, res) => {
  try {
    await removeExpiredCompletedTodos();
    const query = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    const todos = await Todo.find(query).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: todos });
  } catch (error) {
    console.error('Get todos error:', error);
    res.status(500).json({ success: false, message: 'Failed to load todos' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, dueDate, priority } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Todo title is required' });
    await removeExpiredCompletedTodos();
    const todo = await Todo.create({ title: title.trim(), description: description?.trim() || '', dueDate: dueDate || null, priority: priority || 'Medium', createdBy: req.user._id });
    res.status(201).json({ success: true, data: todo });
  } catch (error) {
    console.error('Create todo error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to create todo' });
  }
});

router.patch('/:id/toggle', async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ success: false, message: 'Todo not found' });
    if (req.user.role !== 'admin' && todo.createdBy.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'You do not have permission to update this todo' });
    todo.status = todo.status === 'Completed' ? 'Pending' : 'Completed';
    todo.completedAt = todo.status === 'Completed' ? new Date() : null;
    await todo.save();
    res.json({ success: true, data: todo });
  } catch (error) {
    console.error('Toggle todo error:', error);
    res.status(400).json({ success: false, message: 'Failed to update todo' });
  }
});

module.exports = router;
