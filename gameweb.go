package main

import (
  "encoding/json"
  "html/template"
  "log"
  "net/http"
  "path"
  "strconv"

  "redigo/redis"
  "gamewebsite/sessions"
)

type Session map[string]interface{}

type SessionHandler func(rw http.ResponseWriter, req *http.Request, sess Session)
type RawHandler func(rw http.ResponseWriter, req *http.Request)

type GoGame struct {
  Egf int64
  GamesPlayed int64
}

type User struct {
  Email string
  Uid string
  Name string
  Go GoGame
}

var (
  templateRoot = path.Join(".", "templates")
  RedisClient = RedisInit(Config.Redis)
  Sessions, _ = sessions.NewSessionStore(Config.Web.CookieSecret, strconv.Itoa(Config.Redis.Port))
)

func SendForbidden(rw http.ResponseWriter, req *http.Request) {
  http.Error(rw, "Bad Thing Happened!", 500)
}

func ShowTopToolbar(rw http.ResponseWriter, req *http.Request, data interface{}) {
  t := template.Must(template.ParseFiles(path.Join(templateRoot, "main.tmpl")))
  err := t.Execute(rw, data)
  if err != nil {
    log.Println(err)
  }
}

func MainPage(rw http.ResponseWriter, req *http.Request, sess Session) {
  var userData = []byte("''")
  if user, ok := sess["user"]; ok {
    userData2, err := json.Marshal(&user)
    userData = userData2 // ? for some reason no bueno shadowing
    if err != nil {
      log.Println(err)
      userData = []byte("''")
    }
  }
  ShowTopToolbar(rw, req, struct {
    Title string
    User string
    Contents template.HTML
  }{
    "Main Page",
    string(userData),
    `<div class="hero-unit"><h1>Hello, world!</h1><p>This is the main page. There isnt much here yet!</div>`,
  })
}

func RedisInit(config RedisConfig) redis.Conn {
  c, err := redis.Dial("tcp", ":" + strconv.Itoa(config.Port))
  if err != nil {
    log.Println(err)
  }
  return c
}

func WrapSessionHandler(h SessionHandler) RawHandler {
  return func(rw http.ResponseWriter, req *http.Request) {
    sess, err := Sessions.Get(req)
    if err != nil {
      log.Println(err)
      cookie := &http.Cookie{
        Name: sessions.CookieName,
        Value: sess["SID"].(string),
      }
      http.SetCookie(rw, cookie)
    }
    log.Println("entering request handler for ", req.URL, sess)
    h(rw, req, sess)
    Sessions.Save(sess)
    log.Println("leaving request handler for ", sess)
  }
}

func main() {
  log.Println("Starting web server with configuration:", Config)
  defer RedisClient.Close()
  http.HandleFunc("/bad", SendForbidden)
  http.HandleFunc("/favicon.ico", SendForbidden)
  http.HandleFunc("/", WrapSessionHandler(MainPage))
  http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))
  registerAuthHandlers()
  registerUserHandlers()
  log.Println(":" + strconv.Itoa(Config.Web.Port))
  log.Fatal(http.ListenAndServe(":" + strconv.Itoa(Config.Web.Port), nil))
}
