const Users = require('../models/users');
const Exercises = require('../models/exercises');
const router = require('express').Router();

router.post('/new-user', (req, res, next) => {
  const user = new Users(req.body);
  user.save((err, doc) => {
    if (err) {
      if (err.code === 11000) {
        // fails unique "constraint
        return next({
          status: 400,
          message: 'username unavailable'
        });
      } else {
        return next(err);
      }
    }
    res.json({
      username: doc.username,
      _id: doc._id
    });
  });
});

router.post('/add', (req, res, next) => {
  Users.findById(req.body.userId, (err, user) => {
    if(err) return next(err);
    if(!user) {
      return next({
        status: 400,
        message: 'user not found with userid: ' + req.body.userId
      });
    }
    const exercise = new Exercises(req.body);
    exercise.userId = user._id;
    exercise.username = user.username;
    if (!req.body.date) {
      exercise.date = Date.now();
    }
    exercise.save((err, doc) => {
      if (err) return next(err);
      doc = doc.toObject();
      delete doc.__v;
      doc._id = doc.userId;
      delete doc.userId;
      doc.date = (new Date(doc.date)).toDateString();
      res.json(doc);
    });
  });
});

router.get('/users', (req, res, next) => {
  Users.find({}, (err, docs) => {
    res.json(docs);
  });
});

router.get('/log', (req, res, next) => {
  const from = new Date(req.query.from);
  const to = new Date(req.query.to);
  
  Users.findById(req.query.userId, (err, user) => {
    if(err) return next(err);
    if(!user) {
      return next({
        status: 400,
        message: 'user not found'
      });
    }
    Exercises.find({
      userId: req.query.userId,
      date: {
        $lt: to != 'Invalid Date' ? to.getTime() : Date.now(),
        $gt: from != 'Invalid Date' ? from.getTime() : 0
      }
    }, {
      __v: 0,
      _id: 0
    }).sort('-date').limit(parseInt(req.query.limit)).exec((err, docs) => {
      if(err) return next(err);
      const result = {
        _id: req.query.userId,
        username: user.username,
        from: from != 'Invalid Date' ? from.toDateString() : undefined,
        to: to != 'Invalid Date' ? to.toDateString() : undefined,
        count: docs.length,
        log: docs.map(e => ({
          description: e.description,
          duration: e.duration,
          date: e.date.toDateString()
        }))
      };
      res.json(result);
    });
  });
});

module.exports = router;
