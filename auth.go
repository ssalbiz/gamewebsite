package main

import (
  "bytes"
  "encoding/json"
  //"html/template"
  "io/ioutil"
  "log"
  "net/http"
  "strconv"

)

func registerAuthHandlers() {
  http.HandleFunc("/auth/login", WrapSessionHandler(loginHandler))
  http.HandleFunc("/auth/logout", WrapSessionHandler(logoutHandler))
}

func loginHandler(rw http.ResponseWriter, req *http.Request, sess Session) {
  data := map[string]string {
    "assertion": req.FormValue("assertion"),
    "audience": Config.Web.Host + ":" + strconv.Itoa(Config.Web.Port),
  }
  // Make request to persona
  tr := &http.Transport{
    DisableCompression: true,
  }
  client := &http.Client{Transport: tr}
  jsonData, err := json.Marshal(&data)
  if err != nil {
    log.Println(err)
  }
  log.Println(string(jsonData))
  persona_req, err := http.NewRequest("POST", "https://verifier.login.persona.org/verify",
      bytes.NewBuffer(jsonData))
  persona_req.Header.Set("Content-Type", "application/json")
  resp, err := client.Do(persona_req)
  if err != nil {
    log.Println(err)
  }
  defer resp.Body.Close()
  body, err := ioutil.ReadAll(resp.Body)
  respData := make(map[string]interface{})
  json.Unmarshal(body, &respData)
  if respData["status"].(string) != "okay" {
    log.Println(respData)
    SendForbidden(rw, req)
    return
  }

  user, err := GetUserFromEmail(respData["email"].(string))
  status := http.StatusOK
  if err != nil {
    user, err = NewUser(respData["email"].(string))
    if err != nil {
      log.Println(err)
    }
    status = http.StatusCreated // 201
  }
  sess["user"] = user
  rw.Header().Set("Content-Type", "application/json")
  rw.WriteHeader(status)
  if status == http.StatusCreated {
    wrapper := make(map[string]interface{})
    wrapper["new"] = true
    wrapper["user"] = user
    userData, err := json.Marshal(&wrapper)
    if err != nil {
      log.Println(err)
    }
    rw.Write(userData)
  } else {
    userData, err := json.Marshal(&user)
    if err != nil {
      log.Println(err)
    }
    rw.Write(userData)
  }
}

func logoutHandler(rw http.ResponseWriter, req *http.Request, sess Session) {
  sess, err := Sessions.Get(req)
  if err != nil {
    log.Println(err)
  }
  Sessions.Destroy(sess)
  rw.Write([]byte("bye"))
}
