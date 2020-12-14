const express = require('express');
const notifier = require('node-notifier');
const app = express();

const port = 55555;

const defaultPomoTime = 40
const defaultBreakTime = 5
const longBreakTime = 30
const defaultSessions = 3
const notificationTimeout = 10

const pomoStatus = {
  STOP: 0,
  PAUSED: 1,
  RUNNING: 2,
  RESTING: 3,
}

function getStatusString (status) {
  for (var prop in pomoStatus) {
    if (status === pomoStatus[prop])
      return prop
  }
  return null
}

let _previousStatus = null
/**
 * default pomoStatus.STOP is needed
 */
let _pomoStatus = pomoStatus.STOP
/**
 * All type (break, running) time is stored here and reduced second by second.
 * Default is set to 0 is needede, so that the state handler with handle changes. 
 */
let _currentTimeLeft = 0
let _currentSessionCount = defaultSessions
/**
 * This is just a time runner (for seconds). It does not embed any other concepts.
 */
let runner = null

function log (message) {
  console.log(message)
}

function notify(message, id) {
  // does not allow you to send same message in succession.
  if (id && this.previousId === id) {
    return
  }
  this.previousId = id

  notifier.notify({
    title: 'Pomodoro',
    message: message,
    timeout: notificationTimeout
  })
  log(message)
}

function stopTimer () {
  if (runner) {
    clearInterval(runner)
  }
}

function reset () {
  clearInterval(runner)
  _currentTimeLeft = 0
  _previousStatus = _pomoStatus
  _pomoStatus = pomoStatus.STOP
  _currentSessionCount = defaultSessions
}

app.get('/start', (req, res) => {
  stopTogglerCount = 0
  if (_pomoStatus === pomoStatus.RUNNING) {
    notify(`Pomo(session: ${_currentSessionCount}) is already running`)
    return res.sendStatus(200)
  }

  if (_pomoStatus === pomoStatus.PAUSED) {
    notify(`Resuming(session: ${_currentSessionCount})`)
    const tempStatus = _pomoStatus
    // most likely RESTING or RUNNING
    _pomoStatus = _previousStatus
    _previousStatus = tempStatus
  }

  runner = setInterval(function () {
    _currentTimeLeft--

    // go to next state on timer run out
    if (_currentTimeLeft < 1) {
      if (_currentSessionCount < 1) {
        notify('Session finished')
        _pomoStatus = pomoStatus.STOP
        _currentTimeLeft = 0
        stopTimer()
        return
      }

      switch (_pomoStatus) {

        case pomoStatus.STOP:
          log('previous stop now running')
          _pomoStatus = pomoStatus.RUNNING
          _currentTimeLeft = defaultPomoTime * 60
          notify(`Pomo started !! session: ${_currentSessionCount}, time left: ${defaultPomoTime} min`)
          break

        case pomoStatus.RUNNING:
          log('previous running now resting')
          _currentTimeLeft = defaultBreakTime * 60
          _pomoStatus = pomoStatus.RESTING
          notify(`Break(session: ${_currentSessionCount}) has started for ${defaultBreakTime} min`)
          break
          
        case pomoStatus.RESTING:
          log('previous resting now running/stopping')
          _currentSessionCount--
          _pomoStatus = _currentSessionCount === 0 ? pomoStatus.STOP : pomoStatus.RUNNING

          if (_pomoStatus === pomoStatus.STOP) {
            break
          } else if (_pomoStatus === pomoStatus.RUNNING) {
            _currentTimeLeft = defaultPomoTime * 60
            notify(`Pomo resuming !! session(3,2,1): ${_currentSessionCount}, time left: ${defaultPomoTime} min`)
          }

          break

        case pomoStatus.PAUSED:
          log('previous pause now running/resting')
          _pomoStatus = _currentTimeLeft < 1 && _previousStatus && _previousStatus === pomoStatus.RESTING ? pomoStatus.RESTING : pomoStatus.RUNNING
          notify(`Pomo resumed`)
          break
      }
    }

    if (_currentTimeLeft < 300 && _pomoStatus === pomoStatus.RUNNING) {
      if (_currentTimeLeft > 300) {
        // 5 min left before break
        notify('5 min left before break. Begin closing your work', '5minnotif')
      } else {
        // 1 min left before break
        notify('1 min left before break. Finish closing your work', '1minnotif')
      }
    } else if (_currentTimeLeft < 6000 && _pomoStatus === pomoStatus.RESTING) {
      notify('1 min left before break ends. Begin opening your work', '1minbreaknotif')
    }

  }, 1000)

  notify(`Session: ${_currentSessionCount}\nPrevious Status: ${getStatusString(_pomoStatus)}`)
  res.sendStatus(200)
})

let stopTogglerCount = 0
/**
 * Calling pause twice in a row will cause the pomodoro to stop.
 */
app.get('/pause', (req, res) => {
  switch (_pomoStatus) {
    case pomoStatus.PAUSED:
      if (stopTogglerCount === 1) { 
        reset()
        notify(`Pomodoro is stopping. Press pause again to close server`)
        ++stopTogglerCount
        return res.sendStatus(200)
      }
      notify(`Session(${_currentSessionCount}): is already paused. Press pause once again to stop`)
      ++stopTogglerCount
      break
    case pomoStatus.STOP:
      if (stopTogglerCount > 1) {
        server.close()
        notify(`Pomodoro is closing.`)
        stopTogglerCount = 0
        return res.sendStatus(200)
      }
      notify(`Pomodoro has already stopped.`)
      ++stopTogglerCount
      return res.sendStatus(400)
  }

  // _currentTimeLeft does not change
  _previousStatus = _pomoStatus
  _pomoStatus = pomoStatus.PAUSED
  clearInterval(runner)
  notify(`Session(${_currentSessionCount}) paused`)
  res.sendStatus(200)
})

let triggerCount = 0
app.get('/stop', (req, res) => {
  let message = ""
  let status = null
  switch (_pomoStatus) {
    case pomoStatus.STOP:
      message = "Pomodoro is already stopped"
      status = 400
    case pomoStatus.PAUSED:
      message = "Pomodoro reset"
    case pomoStatus.RUNNING:
      message = "Pomodoro has stopped"
    case pomoStatus.RESTING:
      message = "Pomodoro reset"
  }

  reset()
  notify(message)
  res.sendStatus(status || 200)
})

app.get('/time', (req, res) => {
  return res.send(new String(_currentTimeLeft))
})

app.get('/status', (_, res) => {
  return res.send(new String(getStatusString(_pomoStatus)))
})

app.get('/check', (_, res) => {
  notify(`Status: ${getStatusString(_pomoStatus)}\nTime Left: ${_currentTimeLeft/60} min`)
  res.sendStatus(200)
})

var server = app.listen(port, () => {
  console.log(`Pomodoro server at localhost:${port}`)
})

app.get('/kill', (_, res) => {
  server.close() 
  return res.sendStatus(200)
})

app.get('/ping', (_, res) => {
  return res.send("pong")
})
