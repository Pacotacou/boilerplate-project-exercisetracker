const express = require('express')
const mongoose = require('mongoose')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
require('dotenv').config()

app.use(cors())
app.use(bodyParser.urlencoded({extended:true}))
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userSchema = new mongoose.Schema({
  username: String
})

const exerciseSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: String
})

const logSchema = new mongoose.Schema({
  username: String,
  count: Number,
  log: [{
    description: String,
    duration: Number,
    date: String
  }]
})

const User = mongoose.model("User",userSchema)
const Exercise = mongoose.model("Exercise", exerciseSchema)
const Log = mongoose.model("Log", logSchema)


app.get(
  '/api/users',
  async function(req,res){
    const users = await User.find();
    res.json([...users])
  }
)
app.post(
  '/api/users',
  async function(req,res){
    const user = await User.create(
      {username: req.body.username}
    )
    await Log.create({
      _id: new mongoose.Types.ObjectId(user._id),
      username : req.body.username,
      count: 0,
      log: []
    })

    res.json({username: req.body.username, _id: user._id})
  }
)

app.post(
  '/api/users/:id/exercises',
  async function(req,res){
    const user = await User.findOne({_id: req.params.id})

    if(!user) throw new Error("NO USER ID");

    const exercises = await Exercise.create({
      username: user.username,
      duration: req.body.duration,
      date: new Date(req.body.date || Date.now()).toISOString().slice(0, 10),
      description: req.body.description
    })

    await Log.findOneAndUpdate(
      {_id: user._id},
      {$inc: { count : 1},$push: { log: exercises }}
    )

    res.status(200).json({
      _id: user._id,
      username: user.username,
      description: exercises.description,
      duration: exercises.duration,
      date: new Date(exercises.date).toDateString()
    })
  }
)

app.get(
  '/api/users/:id/logs',
  async function(req,res){
    const {from, to , limit} = req.query;

    if (from && to) {
      const logs = await Log.findOne({_id:req.params.id})
      .then(function(data){
        data.log = data.log.filter(function(log){
          if (log.date > from && log.date < to){
            log.date = new Date(log.date).toDateString()
            return log
          }
        }).slice(0, limit ? limit : data.log.length)
        return data
      })
      return res.status(200).json(logs)
    }

    const logs = await Log.findOne({_id:req.params.id})
    .then(function(logs){
      logs.log = logs.log.map(function(log){
        log.date = new Date(log.date).toDateString()
        return log
      }).slice(0,limit ? limit : logs.log.length)
      return logs;
    })
    res.status(200).json(logs)
  }
)


mongoose.connect(process.env.MONGO_URI)

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})


