package main

import (
  "encoding/json"
  "html"
  "html/template"
  "log"
  "net/http"
  "strconv"
  "strings"
  "github.com/garyburd/redigo/redis"
)

func registerUserHandlers() {
  http.HandleFunc("/user", WrapSessionHandler(UpdateProfileHandler))
  http.HandleFunc("/user/", WrapSessionHandler(UserProfileHandler))
}

func UpdateProfileHandler(rw http.ResponseWriter, req *http.Request, sess Session) {
  rawuser, ok := sess["user"];
  if !ok {
    http.Error(rw, "What are you doing?", 400)
    return
  }
  user := rawuser.(map[string]interface{})
  name := req.FormValue("name")
  if name != "" {
    user["Name"] = html.EscapeString(name)
    sess["user"] = user
  }
  rw.Header().Set("Content-Type", "text/plain")
  rw.WriteHeader(http.StatusAccepted)
  rw.Write([]byte("OK"))
}

func UserProfileHandler(rw http.ResponseWriter, req *http.Request, sess Session) {
  uid := strings.Replace(req.URL.Path, "/user/", "",  1)
  user, err := GetUser(uid)
  contents := ""
  if err != nil {
    log.Println(err)
    contents = "<h1>Error</h1><p>Invalid UID please try again</p>" // TODO should 404
  } else {
    contents = "<h1>" + user.Name + "</h1><p>Profile goes here</p>"
  }
  var userData []byte
  if user, ok := sess["user"]; ok {
    userData, err = json.Marshal(&user)
    if err != nil {
      log.Println(err)
      userData = []byte("''")
    }
  }
  var htmlContents template.HTML
  htmlContents = template.HTML(contents)
  ShowTopToolbar(rw, req, struct {
    Title string
    User string
    Contents template.HTML
  }{
    "Profile - Game Website",
    string(userData),
    htmlContents,
  })
}

func GetUser(uid string) (User, error) {
  RawUser, err := RedisClient.Do("HGET", "users", uid)
  if err != nil {
    log.Println(err)
    return User{}, err
  }
  var user User
  err = redis.ScanStruct(RawUser.([]interface{}), user)
  if err != nil {
    log.Println(err)
    return User{}, err
  }
  return user, nil
}

func GetUserFromEmail(email string) (User, error) {
  uid, err := redis.String(RedisClient.Do("HGET", "UIDS", email))
  if err != nil {
    log.Println(err)
    return User{}, err
  }
  return GetUser(uid)
}

func SaveUser(user User) error {
  _, err := RedisClient.Do("HSET", "users", user.Uid, user)
  return err
}

func NewUser(email string) (User, error) {
  uid, err := redis.Int(RedisClient.Do("INCR", "maxuid"))
  if err != nil {
    log.Println(err)
  }
  user := User{Email:email, Uid:strconv.Itoa(uid), Name:"new user"}
  err = SaveUser(user)
  if err != nil {
    log.Println(err)
  }
  return user, nil
}
