#!/bin/bash

SCRIPTPATH="/home/rj/_proj/mapomo"

function check_server_running () {
  if [ `curl --silent -o - localhost:55555/ping` = 'pong' ]; then
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
    echo starting a fresh server
    echo $SCRIPTPATH/index.js
    cd $SCRIPTPATH
    /usr/bin/node index.js &disown

    until [ "`curl --silent -o - localhost:55555/ping`" = 'pong' ]
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
