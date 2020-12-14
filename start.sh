#!/bin/bash

function check_server_running () {
  if [ `curl -o - localhost:55555/ping` = 'pong' ]; then
    echo 1
  else
    echo 0
  fi
}

function start_pomo () {
  curl localhost:55555/start
}

if [ "$1" = 's' ]; then

  if [ "`check_server_running`" = "1" ]; then
    echo server already running
    start_pomo
  else
    node `pwd`/`dirname "$0"`/index.js &disown
    until [ "`curl -o - localhost:55555/time`" = '"0"' ]
    do
      echo waiting on server
      sleep 1
    done

    start_pomo
  fi

elif [ "$1" = "p" ]; then

  if [ `check_server_running` = "0" ]; then
    echo server not running;
  else
    curl localhost:55555/pause;
  fi

elif [ "$1" = "c" ]; then

  if [ `check_server_running` = "0" ]; then
    echo server not running
  else
    curl localhost:55555/check
  fi

else
  # show help
  echo 'add arg "s" for start/resume, "p" pause/stop/kill, "c" check current status';
fi
