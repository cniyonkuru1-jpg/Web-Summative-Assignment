# Rwanda EV Station Finder

A web app that helps electric vehicle drivers in Rwanda find charging stations. Signed-in users search by town or use their current location, and see nearby stations on an interactive Google Map.

- **Live app (via load balancer):** http://3.10.198.197
- **Demo video (2 min):** TODO: paste link
- **Repository:** https://github.com/cniyonkuru1-jpg/Web-Summative-Assignment

## Why this app

EV adoption in Rwanda is growing, but drivers often don't know where they can charge. This app puts station search on one simple page: type a town (for example Kigali), and the map shows charging stations nearby.

## Features

- Search for charging stations by town or city in Rwanda
- "Use my location" search (works locally; see [why not on the servers](#why-use-my-location-does-not-work-on-the-servers))
- Google Maps results embedded in the page
- User accounts with Firebase Authentication: create account, sign in, sign out
- Personal settings: light or dark theme, remembered between visits
- Error handling for missing keys, denied or unavailable location, and failed sign-in
- Responsive layout for phones and desktops
- Deployed on two web servers behind a load balancer

---

## How it works

The app is a **static website** (HTML, CSS, JavaScript). The servers only deliver the files; after that, everything runs in the user's browser, which talks directly to Google and Firebase.

```
 Browser
    |  GET http://3.10.198.197/
    v
 lb-01  (nginx load balancer, round-robin)
    +---------------------+
    v                     v
 web-01 (nginx)       web-02 (nginx)
 /var/www/html        /var/www/html      <- identical files
    |                     |
    +----------+----------+
               | files returned to the browser
               v
 Browser runs the JavaScript and calls:
   - Firebase Authentication (sign in)
   - Google Maps Embed API   (map iframe)
   - Geolocation API         (device location)
```

The load balancer never runs the app. It forwards each request to web-01 or web-02, which serve the same files.

| File | Job |
|---|---|
| `index.html` | Page structure: Home, Stations, Account and Settings tabs |
| `config.js` | Maps API key (not in Git, loaded before `script.js`) |
| `script.js` | Tabs, sign-in check, search, map loading, geolocation |
| `auth.js` | Firebase sign up, sign in, sign out; tells `script.js` who is signed in |
| `settings.js` | Saves the theme choice in `localStorage` |
| `style.css` | Layout, light/dark themes, responsive rules |

### What happens when you use the app

1. **Open the site.** The load balancer sends the request to one web server, which returns the page and its scripts.
2. **Startup.** `script.js` marks nobody as signed in, `settings.js` applies the saved theme, and `auth.js` asks Firebase whether someone is already signed in.
3. **Sign in.** On the Account tab, `auth.js` sends the email and password to Firebase. On success the app records the signed-in user and shows the sign-out panel.
4. **Sign-in guard.** Stations and Settings need a signed-in user. If nobody is signed in, the app sends the user to the Account tab and remembers they wanted the stations page.
5. **Search.** The user types a town and presses Search. `script.js` builds the search `EV charging stations in <town>, Rwanda` and sets the map iframe to  
   `https://www.google.com/maps/embed/v1/search?key=<key>&q=<search>&region=RW`.  
   Google draws the map directly in the user's browser.
6. **Use my location.** The browser's Geolocation API returns coordinates, and the app searches around them. If the browser refuses, the app asks the user to enter a town instead.
7. **Settings.** The theme is applied at once and saved in that browser's `localStorage`.

### Error handling

| Situation | What the user sees |
|---|---|
| Not signed in, opens Stations or Settings | Sent to the Account tab |
| Maps key missing or `config.js` not loaded | A message saying the key is missing, instead of a broken map |
| Browser has no geolocation | A message that location is not available |
| Location blocked or denied | A message asking the user to enter a town instead |
| Wrong email or password | Error message on the Account tab |

---

## Why "Use my location" does not work on the servers

This is a browser security rule, not a bug in the code. Browsers only allow location access in a **secure context**: a page served over **HTTPS**, or from **`localhost` / `127.0.0.1`**. The servers are reached by IP address over plain HTTP, so the browser blocks the request immediately, without showing a permission pop-up.

| Where the app is opened | Secure? | "Use my location" |
|---|---|---|
| `http://127.0.0.1:5500` (VS Code Live Server) | Yes | Works |
| `http://3.10.198.197` (load balancer) | No | Blocked |
| `http://18.171.162.21`, `http://18.171.164.153` | No | Blocked |
| `https://<domain>` with a certificate | Yes | Would work |

The town search works everywhere, because it needs no special permission.

**Testing it against the servers.** An SSH tunnel makes the load balancer appear as `localhost` on your own computer:

```bash
ssh -L 8080:localhost:80 ubuntu@3.10.198.197
```

Then open `http://localhost:8080` (add `http://localhost:8080/*` to the Maps key's allowed referrers first). This only helps the person running the tunnel.

**The permanent fix** is a domain name with HTTPS: point a domain at the load balancer, open ports 80 and 443, then run `sudo certbot --nginx -d <domain>` on lb-01. This was not done for this submission.

---

## APIs and services

| Service | Used for | Documentation |
|---|---|---|
| Google Maps Embed API | Station results on a map | https://developers.google.com/maps/documentation/embed/get-started |
| Firebase Authentication | Sign up, sign in, sign out | https://firebase.google.com/docs/auth |
| Browser Geolocation API | "Use my location" | https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API |

Infrastructure: [nginx](https://nginx.org/en/docs/). Thanks to the teams behind these APIs and tools. Map data and station results belong to Google.

## Project structure

```
.
├── index.html
├── script.js
├── auth.js
├── settings.js
├── style.css
├── config.example.js   # template for the Maps key (copy to config.js)
├── .gitignore          # keeps config.js out of Git
└── README.md
```

---

## Run locally

**Requirements:** a modern browser, and VS Code with the Live Server extension (or Python 3).

1. **Clone the repo**
   ```bash
   git clone https://github.com/cniyonkuru1-jpg/Web-Summative-Assignment.git
   cd Web-Summative-Assignment
   ```
2. **Get your keys**
   - *Maps:* in [Google Cloud Console](https://console.cloud.google.com/), enable the **Maps Embed API** and create an API key. Restrict it to that API and to your site addresses (HTTP referrers), for example `http://127.0.0.1:5500/*`, `http://3.10.198.197/*`, `http://18.171.162.21/*` and `http://18.171.164.153/*`.
   - *Firebase:* create a project at the [Firebase Console](https://console.firebase.google.com/), add a web app, and enable **Authentication → Email/Password**.
3. **Add your key**
   ```bash
   cp config.example.js config.js
   ```
   Put your key in `config.js`. It is listed in `.gitignore`, so it is never pushed.
4. **Start a local server** (Firebase needs `http://`, not a file path). In VS Code click **Go Live**, or run:
   ```bash
   python3 -m http.server 8000
   ```
5. Open `http://127.0.0.1:5500` or `http://localhost:8000`.

**Test login:** the demo email and password are in the submission comments.

**Using the app:** go to Account and sign in, open Stations, type a town (for example *Kigali*) and press Search, or use "Use my location". Change the theme under Settings.

---

## Deployment

**Run one of the below ip address**

| Name | Role | IP |
|---|---|---|
| web-01 | Web server (nginx) | 18.171.162.21 |
| web-02 | Web server (nginx) | 18.171.164.153 |
| lb-01 | Load balancer (nginx) | 3.10.198.197 |

### 1. Deploy to both web servers

nginx serves `/var/www/html` on each web server. From the project folder (this also copies `config.js`, which is not in Git):

```bash
for ip in 18.171.162.21 18.171.164.153; do
  scp index.html script.js auth.js settings.js style.css config.js ubuntu@$ip:/tmp/
  ssh ubuntu@$ip 'sudo cp /tmp/{index.html,script.js,auth.js,settings.js,style.css,config.js} /var/www/html/'
done
```

If nginx is missing on a server: `sudo apt update && sudo apt install -y nginx`. Both servers must hold the same files, so users see the same site whichever one answers.

### 2. Configure the load balancer (lb-01)


lb-01 runs nginx as a reverse proxy. It holds no app files; it only forwards requests:

```nginx
# /etc/nginx/sites-enabled/ev-loadbalancer
upstream ev_backends {
    server 18.171.162.21;     # web-01
    server 18.171.164.153;    # web-02
}

server {
    listen 80 default_server;
    server_name _;

    location / {
        proxy_pass http://ev_backends;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`upstream` lists the servers that can answer, and `proxy_pass` sends each request to one of them. nginx uses round-robin by default, so requests alternate between web-01 and web-02. If one server stops responding, nginx uses the other.

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 3. Test the load balancer

**Traffic alternates.** Each web server adds an `X-Served-By` header with its own name:

```bash
for i in $(seq 1 10); do
  curl -sI http://3.10.198.197 | grep -i x-served-by
done
```

**Result:** 10 requests tot the load balancer, answered by the two servers in turn:

x-served-by: 7368-web-01
x-served-by: 7368-web-02
x-served-by: 7368-web-01
x-served-by: 7368-web-02
x-served-by: 7368-web-01
x-served-by: 7368-web-02
x-served-by: 7368-web-01
x-served-by: 7368-web-02
x-served-by: 7368-web-01
x-served-by: 7368-web-02
```

**Failover.** Run `sudo systemctl stop nginx` on web-01, reload the site (web-02 should still answer), then `sudo systemctl start nginx`.

**The app.** Open http://3.10.198.197, sign in, search for *Kigali*, and change the theme.

---

## Security

- The Maps key lives in `config.js`, excluded by `.gitignore`. A template, `config.example.js`, is in the repo.
- Browser keys can always be seen by someone inspecting the page, so the Maps key is restricted to the Maps Embed API and to the addresses where the site runs.
- The Firebase web configuration identifies the project and is not a secret. Access is controlled by Firebase Authentication.

## Challenges and how I solved them

- **Firebase scripts failing to load.** The console showed `ERR_NAME_NOT_RESOLVED` and a CORS-style message for the Firebase files from `gstatic.com`, even though the file opened in a separate tab. Here the issue was that the API i was using is wrong I took the firebase API and wrote it in the MAPS API so it caused error but I was able to identify the error and I fixed it.
- **Geolocation on the servers.** Browsers block it on plain HTTP pages that are not `localhost`. It works locally; on the servers, town search is the way to search. A domain with HTTPS would fix it.
- **Keeping the Maps key out of GitHub.** The key was first written in `script.js` and pushed by mistake. I moved it into a git-ignored `config.js`, deleted the exposed key and created a restricted replacement.
- **Small typos that broke features** (a misspelled function name and a wrong `localStorage` key). I found them by reading the code and testing each feature.
- **Keeping both servers identical.** One copy script updates web-01 and web-02, and `ls -l` on each confirms they match.

## Limitations and future ideas

- "Use my location" needs HTTPS, so it only works locally until the site gets a domain and certificate.
- Results come from Google Maps and are not stored, sorted or filtered by the app itself.
