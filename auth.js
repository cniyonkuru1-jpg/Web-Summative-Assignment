import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCiiW-8PLq_47TshCwDISSDyBYF32VxZKA",
    authDomain: "ultra-cinema-515411-a9.firebaseapp.com",
    projectId: "ultra-cinema-515411-a9",
    appId: "1:1026324882254:web:4cd4c74531a4b7be29341f",
};

const form = document.querySelector("#accountForm");
const message = document.querySelector("#accountMessage");
const status = document.querySelector("#authStatus");
const signInButton = form.querySelector('button[type="submit"]');
const createButton = document.querySelector("#createAccount");

function showError(error) {
    const code = error.code || "";
    if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
        return "Email or password is incorrect.";
    }
    if (code.includes("email-already-in-use")) return "That email already has an account. Sign in instead.";
    if (code.includes("weak-password")) return "Use a password with at least 6 characters.";
    if (code.includes("operation-not-allowed")) return "Enable Email/Password in Firebase Authentication.";
    if (code.includes("network-request-failed")) return "Check your internet connection and try again";
    return `Sign-in error: ${code || error.message}`;
}

async function startApp() {
    const values = Object.values(firebaseConfig);
    if (values.some((value) => value.startsWith("PASTE_"))) {
        status.textContent = "Add your Firebase web config in auth.js.";
        message.textContent = "Firebase setup is needed before sign-in can work.";
        signInButton.disabled = true;
        createButton.disabled = true;
        return;
    }

    const auth = getAuth(initializeApp(firebaseConfig));

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        message.textContent = "Signing in..."
        try {
            await signInWithEmailAndPassword(auth,
                document.querySelector("#email").value.trim(),
                document.querySelector("#password").value);
            } catch (error) {
                message.textContent = showError(error);
        }
    });

    createButton.addEventListener("click", async () => {
        if (!form.reportValidity()) return;
        message.textContent = "Creating your account...";
        try {
            await createUserWithEmailAndPassword(auth,
                document.querySelector("#email").value.trim(),
                document.querySelector("#password").value);
        } catch (error) {
          message.textContent = showError(error);
        }
    });

    document.querySelector("#signOut").addEventListener("click", () => signOut(auth));

    onAuthStateChanged(auth, (user) => {
        window.currentUser = user;
        window.authReady = true;
        document.querySelector("#settingsTab").disabled = !user;
        document.querySelector("#accountTab").textContent = user ? "Account" : "Sign in";
        form.hidden = Boolean(user);
        document.querySelector("#signedInPanel").hiddne = !user;
        document.querySelector("#signedInText").textContent = user ? `Signed in as ${user.email}` : "";
        status.textContent = user ? `Signed in as  ${user.email}` : "Not signed in";
        message.textContent = user ? "You are signed in." : "Sign in to use the station finder.";

        if (user && window.pendingStationsRequest) {
            window.pendingStationsRequest = false;
            window.showPanel("stations")
        }
    });
}

startApp().catch((error) => {
    status.textContent = "Firebase could not start"
    message.textContent = showError(error);
});