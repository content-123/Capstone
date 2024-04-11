const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'secret';

const generateToken = (user) => {
  return jwt.sign({ email: user.email}, JWT_SECRET_KEY, { expiresIn: '1h' });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET_KEY);
  } catch (error) {
    return null;
  }
};

// Validation middleware for email and password
const validateEmailAndPassword = (email, password) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/; // At least one lowercase, one uppercase, one number, and minimum 8 characters

  if (!emailRegex.test(email)) {
    throw new Error('Invalid email address');
  }

  if (!passwordRegex.test(password)) {
    throw new Error('Password must be at least 8 characters long and contain at least one lowercase, one uppercase, and one number');
  }
};

app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    validateEmailAndPassword(email, password);

    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    const token = generateToken(newUser);
    res.status(201).json({ token });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    validateEmailAndPassword(email, password);

    const user = await User.findOne({ email }).exec();
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    res.status(200).json({ token });
  } catch (error) {
    console.error('Error authenticating user:', error);
    res.status(400).json({ error: error.message });
  }
});

// Rest of your code for sending emails...
const emailSchema = new mongoose.Schema({
    to: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
  });

  const Email = mongoose.model('Email', emailSchema);
app.post('/send-bulk-email', async (req, res) => {
    try {
      const { to, subject,body } = req.body;


      // Save email to MongoDB (you might want to add more fields like sender, etc.)
      const newEmail = new Email({ to, subject, body });
      await newEmail.save();

      // Send email using Nodemailer (replace with your SMTP details)
      const transporter = nodemailer.createTransport({
          host: 'smtp.mail.yahoo.com', // Replace with your email service SMTP server
          port: 587, // Replace with your email service SMTP port
          secure: false, // true for 465, false for other ports
          auth: {
            user: 'keerthanakk10@yahoo.com', // Replace with your email address
            pass: 'judrcezgubrirqcc', // Replace with your email password or app password
          },
            });

      const mailOptions = {
          from: 'keerthanakk10@yahoo.com', // Replace with your email address
          to, // Replace with the recipient's email address
          subject,
          html:body,
            };


      transporter.sendMail(mailOptions, (error,info) => {
        if (!error) {
        console.log('Email sent:', info.response);
          res.json({ message: 'Email sent successfully' });
        } else {
          console.error('Error sending email:', error);
          res.status(500).json({ error: 'Internal Server Error' });;
        }
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
