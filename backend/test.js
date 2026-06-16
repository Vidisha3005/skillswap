const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://127.0.0.1:27017/skillswap')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

(async () => {
  try {
    const user = new User({
      name: 'Riya',
      email: 'riya@example.com',
      password: '123456'
    });
    await user.save();
    console.log('User registered:', user);
    process.exit();
  } catch (err) {
    console.error(err);
  }
})();
