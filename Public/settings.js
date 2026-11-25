const themeSelect = document.querySelector("#themeSelect");
const savedTheme = localStorage.getItem("evtheme") || "light";

document.body.dataset.theme = savedTheme;
themeSelect.value = savedTheme;

themeSelect.addEventListener("change", () => {
    document.body.dataset.theme = themeSelect.value;
    localStorage.setItem("ev-theme", themeSelect.value);
});