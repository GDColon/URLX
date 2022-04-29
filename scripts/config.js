// sound effects
const SFX = {
    mistake: new Howl({src: ["./sfx/mistake.ogg"], volume: 0.75, loop: false}),
    metronome: new Howl({src: ["./sfx/cowbell.ogg"], volume: 1, loop: false})
}

// clap sounds
const CLAPS = [
    { name: "Clap", file: "clap", offset: 36, default: true },
    { name: "Light Clap", file: "clap2", offset: 27, cpuDefault: true },
    { name: "Reverb Clap", file: "clapReverb", offset: 26 },
    { name: "Echo Clap", file: "clapEcho", offset: 69 },
    { name: "Preecho Clap", file: "clapPreecho", offset: 900 },
    { name: "Acoustic Snare", file: "snareAcoustic", offset: 5 },
    { name: "Vapor Snare", file: "snareVapor", offset: 3 },
    { name: "Hammer Snare ", file: "hammer", offset: 26 },
    { name: "Shaker ", file: "shaker", offset: 35 },
    { name: "Kick ", file: "kick", offset: 25 },
    { name: "Strong Kick ", file: "kickStrong", offset: 5 },
    { name: "Chuck ", file: "chuck", offset: 10 },
    { name: "Sidestick ", file: "sidestick", offset: 10 },
    { name: "Vine Boom ", file: "vineboom", offset: 16 },
    { name: "None", file: "none", offset: 0 }
]

// emojis used in the game
const EMOJIS = {
    feedback: {
        perfect: { icon: "🌟", str: "Perfect", player: "happy" },
        eperfect: { icon: "✅", str: "Slightly early", player: "happy" },
        lperfect: { icon: "☑", str: "Slightly late", player: "happy" },
        early: { icon: "🐇", str: "Very early", player: "neutral" },
        late: { icon: "🐢", str: "Very late", player: "neutral" },
        missed: { icon: "❌", str: "Missed", player: "missed" },
        auto: { icon: "🤖", str: "CPU hit", player: "neutral" },
        none: { icon: "🔘", player: "neutral" }
    },
    misc: {
        speedUp: "🐇",
        speedDown: "🐌"
    },
    notes: { // normal icon, cpu icon
        "^": ["👆", "👆🏿"],
        ">": ["👉", "👉🏿"],
        "v": ["👇", "👇🏿"],
        "<": ["👈", "👈🏿"],
        "o": ["👏", "👏🏿"],
        "+": ["👊🏻", "👊🏿"],
        "+o": ["✌🏻", "✌🏿"],
        "^v": ["🤙", "🤙🏿"],
        "<>": ["👐", "👐🏿"],
        ">^": ["🡽", "<↗>"],
        ">v": ["🡾", "<↘>"],
        "<^": ["🡼", "<↖>"],
        "<v": ["🡿", "<↙>"],
        "x": ["💣", "💣"],
        "empty": ["--", "--"]
    }
}

// neutral, happy, sad
const PLAYERS = [
    "🙂 😀 😔",
    "✊ 👍 👎",
    "🐱 😺 😾",
    "🦊 🦊 🐺",
    "🐋 🐳 🐟",
    "😈 😈 👿",
    "🟦 🟩 🟥",
    "❤ 💖 💔",
    "🌱 🌹 🥀",
    "🌲 🎄 🌱",
    "☁️ ⛅ ⛈️",
    "🌕 🌝 🌒",
    "🌑 🌚 🌖",
    "🔉 🔊 🔇",
    "💀 ☠ 🦴"
].map(x => x.split(" "))

const CONTROLSCHEMES = {
    "normal": { name: "All notes", desc: "All notes must be hit with their respective arrow" },
    "nodoubles": { name: "No doubles", desc: "Double notes can be hit by pressing only one of their required keys" },
    "twoarrow": { name: "3 button", desc: "Uses two arrows instead of four. Left can press right-facing notes, and down can press up-facing notes" },
    "anyarrow": { name: "2 button", desc: "Arrows can be hit with any of the four keys" },
    "onebutton": { name: "1 button", desc: "All notes can be hit with the spacebar" }
}

// read settings from localstorage
let currentSettings = {}
try { currentSettings = JSON.parse(localStorage.urlx) }
catch(e) { currentSettings = {} }
if (typeof currentSettings !== "object" || Array.isArray(currentSettings)) currentSettings = {}
let defaultPlayer = PLAYERS[0]

const PLAYERSETTINGS = {
    player: currentSettings.player || defaultPlayer[0], // neutral emoji
    playerHappy: currentSettings.playerHappy || defaultPlayer[1], // hit emoji
    playerMissed: currentSettings.playerMissed || defaultPlayer[2], // miss emoji
    soundEffects: (currentSettings.soundEffects !== false), // play sound effects? (default true)
    skipWelcome: (currentSettings.skipWelcome === true), // skip welcome message (default false)
    inputOffset: Number(currentSettings.inputOffset) || 0, // input offset, lower if hitting too early and raise if hitting too late
    hitWindowMultiplier: Number(currentSettings.hitWindowMultiplier) || 1, // hit window multiplier, higher = more lenient
    controlScheme: currentSettings.controlScheme || "normal", // control scheme, determines how many buttons are required to play
    changeArrowsToControls: currentSettings.changeArrowsToControls !== false // visually change notes to match the control scheme (default true) 
}

// save settings to localstorage
function saveSettings() {
    localStorage.urlx = JSON.stringify(PLAYERSETTINGS)
}

// welcome message
if (!PLAYERSETTINGS.skipWelcome) $('#welcome').show()

// list of players
$('#playerList').html(PLAYERS.map(x => `<button class="playerOption" neutral="${x[0]}" happy="${x[1]}" sad="${x[2]}">${twemojiParse(x[0])}</button>`))

// list of control schemes
$('#controlSchemeSelector').html(Object.entries(CONTROLSCHEMES).map(x => `<option value="${x[0]}" desc="${x[1].desc}">${x[1].name}</option>`).join(""))

// settings menu
$('#playerIcon').html(twemojiParse(PLAYERSETTINGS.player))
$('#playSFX').prop('checked', PLAYERSETTINGS.soundEffects)
$('#skipWelcome').prop('checked', PLAYERSETTINGS.skipWelcome)
$('#changeArrowsToControls').prop('checked', PLAYERSETTINGS.changeArrowsToControls)
$('#inputOffset').val(PLAYERSETTINGS.inputOffset)
$('#hitWindowMultiplier').val(PLAYERSETTINGS.hitWindowMultiplier)

// control scheme changing
function changeControlScheme(val, first) {
    if (!first && PLAYERSETTINGS.controlScheme == val) return
    let scheme = CONTROLSCHEMES[val] || CONTROLSCHEMES["normal"]
    $('#currentControlScheme').html(`<b>${scheme.name}:</b> ${scheme.desc}`)
    PLAYERSETTINGS.controlScheme = val
    $('#controlSchemeSelector').val(val)
    if (!first) {
        saveSettings()
        game.updatePath()
    }
}
changeControlScheme(PLAYERSETTINGS.controlScheme, true)

// input offset changing
$('#inputOffset').change(function() {
    let newOffset = Math.round(clamp(Number($(this).val()) || 0, -1000, 1000))
    PLAYERSETTINGS.inputOffset = newOffset
    $('#inputOffset').val(newOffset)
    saveSettings()
})

// player list hover effect
$('.playerOption').hover(function() {
    $('.playerOption').trigger('mouseleave')
    $(this).html(twemojiParse($(this).attr('happy')))
}, function() {
    $(this).html(twemojiParse($(this).attr('neutral')))
})

// set new player
$('.playerOption').click(function() {
    PLAYERSETTINGS.player = $(this).attr("neutral")
    PLAYERSETTINGS.playerHappy = $(this).attr("happy")
    PLAYERSETTINGS.playerMissed = $(this).attr("sad")
    $('#playerIcon').html(twemojiParse(PLAYERSETTINGS.player))
    $('.popup').hide()
    $('#playerSettings').show()
    saveSettings()
    game.feedback.face = PLAYERSETTINGS.player
    game.displayPath()
})

// advanced internal settings
const CONFIG = {
    autoplay: true, // auto hits all notes
    autoscroll: true, // auto scrolls the editor
    metronome: false, // plays a metronome to help with sync
    feedbackLength: 300 / 1000, // how many secs the feedback emoji appears for
    maxSpeed: 60, // max speed for the address bar to update, setting this too low will cause the bar to freeze (throttle) occasionally
    emojiLength: 150, // number of emojis to display in the address bar
    upcomingBeatLookahead: 4, // how many beats forward to check when queuing notes in advance
    bpmLimit: 1000, // max bpm
    subdivLimit: 32, // max subdiv size
    maxScrollMultiplier: 8, // max scroll speed multiplier
    defaultSongVolume: 75, // default volume for song
    defaultClapVolume: 50 // default volume for clap sound
}

// hit windows
const WINDOWS = {
    hit: 0.07, // before/after clap, when you want to hit
    tooEarly: 0.08, // BEFORE early window, hitting this is a miss
    double: 0.025 // for double hits - amount of time to hit the second key once the first has been pressed
}

// hit window in settings
function updateHitWindowPreview() {
    $('#currentWindow').text(fixed((WINDOWS.hit * 1000 * PLAYERSETTINGS.hitWindowMultiplier), 2))
}
updateHitWindowPreview()

// feedback icons in controls menu
$('#feedbackIcons').append(Object.values(EMOJIS.feedback).filter(x => x.str).map(x => `<p>${x.icon} ${x.str}</p>`).join(""))

// use twemojis for controls
$('#keyMenu').html(twemojiParse($('#keyMenu').html()))

// check if browser supports cool filesystem stuff
const browserDoesntSuck = typeof window.showSaveFilePicker === "function"
if (!browserDoesntSuck) $('.usesFilesystem').addClass('unsupported')

// firefox can go fuck itself
if (!Array.prototype.findLast) Array.prototype.findLast = function(fn) { let found = this.filter(fn); return found[found.length - 1] }