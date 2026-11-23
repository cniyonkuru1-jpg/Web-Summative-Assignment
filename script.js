const MAPS_API_KEY = "AIzaSyB6hg04vN5_knmHjuI93TrY9Q_XttL8--E";
const $ = (selector) => document.querySelector(selector);

window.currentUser = null;
window.pendingStationsRequest = false;
let lastPlace = "";

function showMap(place) {
    const frame = $("#mapFrame");
    const message = $("#mapMessage");

    if (MAPS_API_KEY.startsWith("PASTE_")) {
        frame.hidden = true;
        message.textContent = "Add your Maps Embed API key at the top of script.js.";
        return;
    }

    const query = `EV charging stations in ${place}, Rwanda`;
    frame.src = `https://www.google.com/maps/embed/v1/search?key=${encodeURIComponent(MAPS_API_KEY)}&q=${encodeURIComponent(query)}&region=RW`;
    frame.hidden = false;
    message.textContent = `Map results for ${place}. Check station details with the provider.`;
}

window.showPanel = (id) => {
    if (id === "settings" && !window.currentUser) id = "account";
    
    if (id === "stations" && !window.currentUser) {
        window.pendingStationsRequest = true;
        id = "account";
    }

    document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.hidden = panel.id !== id;
        panel.classList.toggle("active", panel.id === id);
    });

    document.querySelectorAll(".tab-button").forEach((button) => {
        button.classList.toggle("active",
            button.dataset.tab === id || (id === "stations" && button.dataset.tab === "home"));
    });

    if (id === "stations") showMap(lastPlace || "Kigali");
};

document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => window.showPanel(button.dataset.tab));
});

$("#findStationsButton").addEventListener("click", () => {
    window.showPanel("stations");
});

document.querySelector("#searchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!window.currentUser) return window.showPanel("account");
    lastPlace = document.querySelector("#locationInput").value.trim();
    if (lastPlace) showMap(lastPlace);
});

$("#locationButton").addEventListener("click", () => {
    if(!window.currentUser) return window.showPanel("account"); 
    if(!navigator.geolocation) {
        $("#mapMessage").textContent = "Location is not available in this browser.";
        return;
    }

    $("#mapMessage").textContent = "Requesting your Location...";
    navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
            lastPlace = `${coords.latitude}, ${coords.longitude}`;
            $("#locationInput").value = "Your current location";
            showMap(lastPlace);
        },
        () => { $("#mapMessage").textContent = "Location permission was not granted. Enter a town instead."; }
    );
});