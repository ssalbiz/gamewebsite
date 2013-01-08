package sessions

import (
  "crypto/rand"
  "encoding/json"
  "net/http"
  "net/url"
  "log"

  "redigo/redis"
)
//TODO: abstract into general interface + impl

const (
  CookieName = "gamewebcookie"
)

type SessionStore struct {
  Secret string
  RedisConn redis.Conn
}

func (s *SessionStore) Get(r *http.Request) (sess map[string]interface{}, err error) {
  cookie, err := r.Cookie(CookieName)
  if err != nil {
    log.Println(err)
    if err == http.ErrNoCookie {
      log.Println("creating new session")
      sess = newSession(r)
    }
    return
  }
  //TODO: sign cookies 
  if result, err := redis.Bytes(s.RedisConn.Do("GET", cookie.Value)); err == nil {
    json.Unmarshal(result, &sess)
  }
  return
}

func (s *SessionStore) Save(sess map[string]interface{}) (err error) {
  str, err := json.Marshal(&sess)
  if err != nil {
    log.Println(err)
    return
  }
  _, err = s.RedisConn.Do("SET", sess["SID"], str)
  if err != nil {
    log.Println(err)
  }
  return
}

func (s *SessionStore) Destroy(sess map[string]interface{}) (err error) {
  _, err = s.RedisConn.Do("DEL", sess["SID"])
  return
}

func newSession(req *http.Request) (s map[string]interface{}) {
  s = make(map[string]interface{})
  tmp := make([]byte, 32)
  rand.Read(tmp)
  s["SID"] = url.QueryEscape(string(tmp))
  return
}

func NewSessionStore(secret, port string) (s *SessionStore, err error) {
  s = &SessionStore{}
  s.Secret = secret
  s.RedisConn, err = redis.Dial("tcp", ":" + port)
  log.Println("Initializing Session store:", s)
  return
}
