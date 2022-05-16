function setTheme() {
    if (PLAYERSETTINGS.lightTheme) {
        document.body.className = "lightTheme";
    } else { 
        document.body.className = "defaultTheme";
    }
}