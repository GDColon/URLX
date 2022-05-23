// force number between two values
function clamp(num, min, max) { return Math.min(Math.max(num , min), max) }

// remove unsafe filename characters
function safeFilename(str) { return str.replace(/[/\\:*?"<>|]/g, "") }

// set the url hash in a way that doesnt clog your precious history
function setHash(text) {
    location.replace("#" + text)
}

// indicator for speed changes. higher number = slower
function createSpeedIcon(newSpeed, oldSpeed) {
    if (newSpeed == oldSpeed) return ""
    let speedChange = Number((oldSpeed / newSpeed).toFixed(2))
    let speedIcon = speedChange > 1 ? EMOJIS.misc.speedUp : EMOJIS.misc.speedDown
    if (speedChange > 2 || speedChange < 0.5) speedIcon += speedIcon
    else if (speedChange > 0.9 && speedChange < 1.1) return ""
    return `[${speedIcon}x${speedChange}]`
}


// clones an object with no reference
function cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj))
}

// selfdestruct old game and make new one
function newGame(...args) {
    if (typeof game == "object") game.selfdestruct()
    try { game = new Game(...args) }
    catch(e) {
        console.error(e)
        alert(`Something went wrong while trying to load that chart!\nErorr: ${e}`)
        game = new Game()
    }
    gameChart = null
    return game
}

// rounds beats to the nearest 192nd to avoid crazy floating point errors (notitg style, ty samario for telling me this)
function toSafe(beat, divide=1) {
    let roundTo = Math.floor(192 / divide)
    return Math.round(beat * roundTo) / roundTo
}

// timestamp display - https://gist.github.com/vankasteelj/74ab7793133f4b257ea3
function pad(num, size) { return num.toString().padStart(size, "0") }
function timestamp(timeInSeconds) {
    time = Math.max(0, parseFloat(timeInSeconds)).toFixed(3),
    minutes = Math.floor(time / 60) % 60,
    seconds = Math.floor(time - minutes * 60),
    milliseconds = time.slice(-3);
    return minutes + ':' + pad(seconds, 2) + '.' + pad(milliseconds, 3);
}

// tofixed except it converts back to a number (removes long decimals)
function fixed(num, places) {
    return Number(num.toFixed(places))
}

// get the number of seconds between two beats with no bpm changes
function getSecsBetween(firstBeat, lastBeat, bpm) { 
    let newBeats = lastBeat - firstBeat // get the # of beats between the previous and current bpm change
    let beatLength = 60 / bpm // get the length of one beat in seconds, at the BPM of the most recent change
    return newBeats * beatLength // time = (# of beats / length of one beat in secs)
}

// get twemoji svg from unicode
function twemojiParse(str) {
    return twemoji.parse(str, { folder: "svg", ext: '.svg', className: 'twemoji' })
}

// get hit window size
function hitWindow() {
    return WINDOWS.hit * PLAYERSETTINGS.hitWindowMultiplier
}