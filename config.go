package main

type WebConfig struct {
  Host string
  CookieSecret string
  Port int
  DataDB int
  SessionDB int
}

type RedisConfig struct {
  Host string
  Port int
}

type SocketConfig struct {
  SessionDB int
  LogLevel int
}

type GameConfig struct {
  Socketio SocketConfig
  Port int
}

var Config = struct {
  Web WebConfig
  Redis RedisConfig
  Game GameConfig
}{
  WebConfig {
    "hfcs.uwaterloo.ca",
    "lalalalala",
    54322,
    1,
    2,
  },
  RedisConfig {
    "localhost",
    6379,
  },
  GameConfig {
    SocketConfig { 3, 3 },
    54323,
  },
}
