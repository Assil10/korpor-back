require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const setupSwagger = require('./swaggerConfig'); // Import the Swagger setup file

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const roleRoutes = require('./routes/roleRoutes');

const app = express();

app.use(express.json());
app.use(cors());

// Set up Swagger docs
setupSwagger(app);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI || "mongodb+srv://korpor:korpor123@cluster0.dg69q.mongodb.net/?retryWrites=true&w=majority")
  .then(() => {
    console.log('MongoDB Connected');
  })
  .catch(err => console.error('MongoDB Connection Error:', err));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/roles', roleRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Swagger docs available at: http://localhost:5000/api-docs');  
});
