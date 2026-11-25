# Rwanda EV Station Finder

A web app that helps electric vehicle drivers in Rwanda find charging stations. Signed-in users search by town or use their current location, and see nearby stations on an interactive Google Map.

- **Live app (via load balancer):** 
- **Demo video:** https://www.youtube.com/watch?v=_12CbkwgFKQ
- **Repository:** https://github.com/cniyonkuru1-jpg/Web-Summative-Assignment

## Why this app

EV adoption in Rwanda is growing, but drivers often don't know where they can charge. This app puts station search on one simple page: type a town (for example Kigali), and the map shows charging stations nearby.

## Features

- Search for charging stations by town or city in Rwanda
- "Use my location" search (works locally only, see the note below)
- Google Maps results embedded in the page
- User accounts with Firebase Authentication: create account, sign in, sign out
- Light or dark theme, remembered between visits
- Error handling for missing keys, denied or unavailable location, and failed sign-in
- Responsive layout for phones and desktops
- Deployed on two web servers behind a load balancer

## How it works

The app is a static website (HTML, CSS, JavaScript). The servers only deliver the files. After that, everything runs in the user's browser, which talks directly to Google and Firebase. The load balancer never runs the app: it forwards each request to web-01 or web-02, which serve identical files.

```
Browser --> lb-01 (nginx, round-robin) --> web-01 or web-02 (nginx, /var/www/html)
Browser then calls: Firebase Authentication, Google Maps Embed API, Geolocation API
```

| File | Job |
|------|-----|
| `public/index.html` | Page structure: Home, Stations, Account and Settings tabs |
| `public/script.js` | Tabs, sign-in check, search, map loading, geolocation |
| `public/auth.js` | Firebase sign up, sign in, sign out |
| `public/settings.js` | Saves the theme choice in `localStorage` |
| `public/style.css` | Layout, light/dark themes, responsive rules |
| `public/config.example.js` | Template for the Maps key (copy to `config.js`) |
| `public/config.js` | Your real Maps key (created by you, ignored by Git) |

## Login credentials ##

**Email:**c.niyonkuru1@alustudent.com
**Password:**kabandachris@256

## Error handling

| Situation | What the user sees |
|-----------|--------------------|
| Not signed in, opens Stations or Settings | Sent to the Account tab |
| Maps key missing or `config.js` not loaded | A message saying the key is missing, instead of a broken map |
| Browser has no geolocation | A message that location is not available |
| Location blocked or denied | A message asking the user to enter a town instead |
| Wrong email or password | Error message on the Account tab |

## Note: "Use my location" on the servers

Browsers only allow location access on HTTPS pages or on `localhost`. The servers are reached by IP address over plain HTTP, so the browser blocks the request. This is a browser security rule, not a bug. "Use my location" works locally (for example with Live Server on `http://127.0.0.1:5500`), and the town search works everywhere. A domain name with an HTTPS certificate would fix it, but this was not done for this submission.

## APIs and services

| Service | Used for | Documentation |
|---------|----------|---------------|
| Google Maps Embed API | Station results on a map | https://developers.google.com/maps/documentation/embed/get-started |
| Firebase Authentication | Sign up, sign in, sign out | https://firebase.google.com/docs/auth |
| Browser Geolocation API | "Use my location" | https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API |

Infrastructure: nginx. Thanks to the teams behind these APIs and tools. Map data and station results belong to Google.

## Run locally

Requirements: a modern browser, and VS Code with the Live Server extension (or Python 3).

1. Clone the repo:

   ```bash
   git clone https://github.com/cniyonkuru1-jpg/Web-Summative-Assignment.git
   cd Web-Summative-Assignment
   ```

2. Get your keys:
   - **Maps:** in Google Cloud Console, enable the Maps Embed API and create an API key. Restrict it to that API and to your site addresses (HTTP referrers), for example `http://127.0.0.1:5500/*` and the server addresses below.
   - **Firebase:** create a project in the Firebase Console, add a web app, and enable Authentication → Email/Password.

3. Add your Maps key:

   ```bash
   cd public
   cp config.example.js config.js
   ```

   Put your key in `config.js`. It is listed in `.gitignore`, so it is never pushed.

4. Start a local server (Firebase needs `http://`, not a file path). Open the `public` folder in VS Code and click **Go Live**, or from the project root run:

   ```bash
   python3 -m http.server 8000 --directory public
   ```

5. Open `http://127.0.0.1:5500` or `http://localhost:8000`, go to Account and sign in, open Stations, type a town (for example Kigali) and press Search.

## Deployment

**Sign-in credentials:** see the submission comment, or create your own account on the Account tab.

| Name | Role | IP |
|------|------|----|
| web-01 | Web server (nginx) | 18.171.162.21 |
| web-02 | Web server (nginx) | 18.171.164.153 |
| lb-01 | Load balancer (nginx) | 3.10.198.197 |

### 1. Deploy to both web servers

nginx serves `/var/www/html` on each web server. The files to deploy are the ones inside the `public` folder, including `config.js`, which is not in Git:

```bash
cd public
for ip in 18.171.162.21 18.171.164.153; do
  scp index.html script.js auth.js settings.js style.css config.js ubuntu@$ip:/tmp/
  ssh ubuntu@$ip 'sudo cp /tmp/{index.html,script.js,auth.js,settings.js,style.css,config.js} /var/www/html/'
done
```

If nginx is missing on a server: `sudo apt update && sudo apt install -y nginx`. Both servers hold the same files, so users see the same site whichever one answers. Each web server also adds an `X-Served-By` header with its own name, which shows who answered in the test below.

### 2. Configure the load balancer (lb-01)

lb-01 runs nginx as a reverse proxy. It holds no app files and only forwards requests:

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

`upstream` lists the servers that can answer, and `proxy_pass` sends each request to one of them. nginx uses round-robin by default, so requests alternate between web-01 and web-02. If one server stops responding, nginx uses the other. Apply the config with:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 3. Test the load balancer

```bash
for i in $(seq 1 10); do
  curl -sI http://3.10.198.197 | grep -i x-served-by
done
```

Result: the 10 requests were answered by the two servers in turn:

```
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

**Failover:** run `sudo systemctl stop nginx` on web-01 and reload the site. web-02 still answers. Then run `sudo systemctl start nginx` on web-01.

## Security

The Maps key lives in `config.js`, which is excluded by `.gitignore`, and only the template `config.example.js` is in the repo. Browser keys can always be seen by someone inspecting the page, so the Maps key is restricted to the Maps Embed API and to the addresses where the site runs. The Firebase web configuration only identifies the project and is not a secret, because access is controlled by Firebase Authentication.

## Challenges and how I solved them

My first challenge was that the Firebase scripts failed to load. The console showed `ERR_NAME_NOT_RESOLVED` and a CORS-style message for the Firebase files from `gstatic.com`, even though the file opened fine in a separate tab. After reading the errors carefully, I found that I had put the Firebase API key in the place where the Maps API key belongs. I fixed it by putting each key in its correct place.

The second challenge was geolocation on the servers. Browsers block location access on plain HTTP pages that are not `localhost`, so "Use my location" works locally but not on the deployed servers. On the servers, the town search is the way to find stations.

I also had a problem keeping the Maps key out of GitHub. I first wrote the key in `script.js` and pushed it by mistake. I then moved it into a git-ignored `config.js`, deleted the exposed key, and created a restricted replacement.

Some features broke because of small typos, such as a misspelled function name and a wrong `localStorage` key. I found them by reading through the code and testing each feature one by one.

Finally, I needed to keep both web servers identical. I solved this with one copy script that updates web-01 and web-02, and I ran `ls -l` on each server to confirm that the files match.

# API'S USED

**Map's Api**: "https://console.firebase.google.com/project/ultra-cinema-515411-a9/overview"

**Authenticator Api**: "https://console.firebase.google.com/project/ultra-cinema-515411-a9/overview"

