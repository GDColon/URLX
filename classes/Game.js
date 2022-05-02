class Game {
    constructor(chart, song, saveLocation) {

        if (!chart) chart = { metadata: {}, notes: [], actions: [] }

        this.active = false // if game is running
        this.paused = false // game is paused (wip)
        this.chartName = chart.metadata.name || (chart.metadata.filename ? chart.metadata.filename.split(".").slice(0, -1).join(".") : "")

        this.conductor = new Conductor(this, chart, song) // music and timing
        this.editor = new Editor(this, saveLocation)
        this.feedback = { beat: 0, emoji: EMOJIS.feedback.none.icon, face: PLAYERSETTINGS.player } // emoji indicator for hits, misses, etc
        this.frameOffset = { early: 0, late: 0 }

        this.notes = []
        let noteList = cloneObject(chart.notes || chart.events || []).map(x => new Note(this, x)).filter(x => x && x.beat && x.beat >= 1 && x.arrow).sort((a, b) => (a.beat - b.beat) || (a.auto - b.auto)) // clone chart and create note array
        noteList.forEach(x => {
            if (!this.notes.find(n => n.beat == x.beat)) this.notes.push(x) // remove duplicate notes
        })
        
        // address bar path
        this.path = []
        this.updatePath()
        this.scrollMultiplier = clamp(chart.metadata.scrollMultiplier, 1, CONFIG.maxScrollMultiplier) || 1

        this.editor.updateSongInfo()
    }

    start(startingBeat=1) {
        if (this.active) this.restart()
        this.active = true
        this.paused = false
        this.frameOffset = { early: 0, late: 0 }
        this.conductor.reset(startingBeat)
        this.resetNotes()
        this.notes.filter(x => x.beat <= startingBeat).forEach(x => x.skipped = true)
        this.conductor.play()

        $('#startBtn').hide()
        $('#stopBtn').show()
        $('input, button, select').blur()
    }

    restart(force) {
        this.active = false
        this.conductor.reset()
        this.resetNotes()
        if (!force) this.editor.stopPlaytest()

        $('#startBtn').show()
        $('#stopBtn').hide()
    }

    selfdestruct() {
        this.restart(true)
        Object.keys(this).forEach(k => {
            delete this[k]
        })
        delete this
    }

    resetNotes() {
        this.updatePath()
        this.notes.forEach(x => x.reset())
    }

    musicstart() { // runs when the music starts. waits for offset and then starts the game
        this.updatePath()
        this.gameLoop()
    }

    finish() { // runs when the music finishes
        this.restart()
    }

    gameLoop() {
        if (this.paused || !this.active) return

        let conductor = this.conductor

        // editor highlighting and autoscrolling
        if (CONFIG.autoscroll) this.editor.scrollToBeat(conductor.beat)
        this.editor.highlightBeat(conductor.beat)

        // metronome (broken?)
        if (CONFIG.metronome && Math.floor(conductor.beat) == conductor.beat) SFX.metronome.play()

        // increment beat
        conductor.increment()

        // shift path
        if (conductor.isValidFrame()) this.updatePath()

        // some stats
        if (!chartVisible) this.updateStats()

        // upcoming hits
        this.prepareUpcomingBeats()

        // figure out when the next beat is using the song position
        let timeToNext = conductor.timeToNextBeat(conductor.beat) * 1000
        setTimeout(() => this.gameLoop(), timeToNext);

        // cpu hits
        let cpuNotes = this.notes.filter(x => x.auto && x.beat == conductor.beat)
        if (cpuNotes.length) {
            cpuNotes.forEach(x => x.hit = true)
            this.setFeedback("auto")
        }

        // reset feedback icon
        if (this.feedback.emoji != EMOJIS.feedback.none.icon && conductor.songPos() >= this.feedback.timestamp + CONFIG.feedbackLength) this.setFeedback("none")

    }

    prepareUpcomingBeats() {
        let upcomingBeats = this.notes.filter(x => x.isUpcoming())
        let songPos = this.conductor.songPos()
        upcomingBeats.forEach(x => { x.queue(songPos) })
    }

    checkHit(arrow) {
        if (this.paused) return
        let songPos = this.conductor.songPos()

        // find upcoming note and trigger it
        let nextHit = this.notes.filter(x => x.inWindow(songPos)).sort((a, b) => (a.isBomb() - (b.isBomb())) || (a.beat - b.beat))[0]
        if (nextHit) nextHit.trigger(arrow, songPos)
    }

    // get emoji from note or action
    getEmoji(beat, ignoreControlScheme) {
        let foundArrow = this.conductor.subdivSearch(this.notes, beat, this.conductor.getSubdivision(beat))
        if (!foundArrow) return EMOJIS.notes.empty[0] // custom icon support without notes, coming maybe
        else if (foundArrow.icon) return foundArrow.icon
        let skin = foundArrow.auto ? 1 : 0

        let arrow = foundArrow.arrow
        let isArrow = !arrow.match(/[^\^v<>]/g)
        if (!ignoreControlScheme && PLAYERSETTINGS.changeArrowsToControls) switch (PLAYERSETTINGS.controlScheme) {
            case "onebutton": if (arrow != "x") arrow = "o"; break;
            case "anyarrow": if (isArrow) arrow = "+"; break;
            case "twoarrow":
                if (arrow == "<>") arrow = ">"
                else if (arrow == "^v") arrow = "^"
                else if (arrow.length > 1 && !arrow.includes("o")) arrow = ">^"
                else if (arrow.includes("<")) arrow = ">";
                else if (arrow.includes("v")) arrow = "^";
                break;
        }

        let foundEmoji = EMOJIS.notes[arrow]
        let arrowEmoji = foundEmoji ? foundEmoji[skin] : "❓"
        return arrowEmoji
    }

    getAllNotes() {
        let lastBeat = this.conductor.getBeatFromSecs(this.conductor.music.duration()) // might need to account for speed? try adding if it breaks
        let endPos = Math.ceil(lastBeat)
        let list = []

        for (let i = 1; i < endPos; i++) {
            let subdiv = this.conductor.getSubdivision(i)
            for (let j = 0; j < subdiv; j++) {
                let safeBeat = toSafe(i + (j / subdiv))
                let foundNote = this.notes.find(x => toSafe(x.beat) == safeBeat)
                list.push({beat: safeBeat, note: foundNote ? foundNote.arrow : null, data: foundNote})
            }
        }
        return list
    }

    setFeedback(type) {
        let feedback = EMOJIS.feedback[type] || { icon: "❓" }
        this.feedback.emoji = feedback.icon
        this.feedback.timestamp = type == "none" ? 0 : this.conductor.songPos()

        if (feedback.player == "happy") this.feedback.face = PLAYERSETTINGS.playerHappy
        else if (feedback.player == "missed") this.feedback.face = PLAYERSETTINGS.playerMissed
        else if (type == "none" || type == "auto") this.feedback.face = PLAYERSETTINGS.player

        if (this.conductor.frameLength > CONFIG.maxSpeed * 1.5) this.displayPath() // draw path immediately if frame length is high, otherwise just wait until the next frame (to reduce freezes)
    }   

    togglePause() {
        return // buggy rn
        // unpause game
        if (this.paused) {
            this.paused = false
            this.conductor.music.play()
        }

        // pause game
        else {
            this.paused = true
            this.conductor.music.pause()
            game.notes.concat(game.actions).forEach(x => x.clearQueue() )
            setHash("[-PAUSED-]")
        }

    }

    // display path on address bar
    displayPath() {
        setHash(this.feedback.emoji + "|" + this.feedback.face + this.path.join(""))
    }

    // get all emojis and update address bar path
    updatePath() { 
        let beat = this.conductor.beat
        let until = CONFIG.emojiLength
        let lastScrollSpeed = -1
        this.path = []
        for (let i=0; i < until; i++) {
            if (i % this.scrollMultiplier != 0) this.path.push(EMOJIS.notes.empty[0])
            else {
                let scrollSpeed = this.conductor.getScrollSpeed(beat)
                this.path.push(this.getEmoji(beat))
                if (lastScrollSpeed != -1 && scrollSpeed != lastScrollSpeed) this.path.push(createSpeedIcon(scrollSpeed, lastScrollSpeed))
                lastScrollSpeed = scrollSpeed
                beat = toSafe(beat + (1 / this.conductor.getSubdivision(beat)))
            }
        }
        this.displayPath()
    }

    // set scroll speed multiplier
    setScrollMultiplier(amount) {
        amount = +amount
        if (!amount || isNaN(amount) || amount < 1) amount = 1
        amount = Math.min(Math.round(amount), CONFIG.maxScrollMultiplier)
        $('#scrollMultiplier').val(amount)
        if (this.scrollMultiplier == amount) return
        this.scrollMultiplier = amount
        this.updatePath()
    }

    // log some stuff on screen
    updateStats() {
        let hits = this.notes.filter(x => x.hit && !x.auto).length
        let misses = this.notes.filter(x => x.missed).length
        let offsetNotes = this.notes.filter(x => x.accuracy)
        let lastOffset = offsetNotes[offsetNotes.length - 1]
        let earlyOffset = this.frameOffset.early
        let lateOffset = this.frameOffset.late

        let logObj = {
            "Hits": hits,
            "Misses": misses,
            "Accuracy": (misses < 1 ? 100 : fixed((hits / (hits + misses) * 100), 2)) + "%",
            "Average Offset": offsetNotes.length ? Number((offsetNotes.map(x => x.accuracy).reduce((a, b) => a + b, 0) / offsetNotes.length * 1000).toFixed(2)) + " ms" : "-",
            "Last Note Offset": lastOffset ? fixed((lastOffset.accuracy * 1000), 2) + " ms" : "-",
            "Frame Offset": `${fixed(earlyOffset + lateOffset, 2)} (${fixed(earlyOffset, 2)} early + ${fixed(lateOffset, 2)} late)`
        }

        $('#gameplayStats').html(Object.entries(logObj).map(x => `<p><b>${x[0]}</b>: ${x[1]}</p>`))
    }


    createChartJSON() {
        let gameActions = []
        let chartVolume = Math.round(this.conductor.music.volume() * 100)

        game.conductor.bpmChanges.slice(1).forEach(x => gameActions.push({beat: x.beat, type: "bpm", val: x.bpm}))
        game.conductor.subdivisionChanges.slice(1).forEach(x => gameActions.push({beat: x.beat, type: "subdivision", val: x.subdivision}))

        let chartJSON = { 
            metadata: {
                name: this.editor.chartName(),
                filename: this.conductor.filename,
                bpm: this.conductor.bpmChanges[0].bpm,
                subdivision: this.conductor.subdivisionChanges[0].subdivision,
            },
            notes: this.notes.map(x => {
                let noteObj = {beat: x.beat, arrow: x.arrow}
                if (x.auto) noteObj.auto = true
                return noteObj
            }),
            actions: gameActions.sort((a, b) => a.beat - b.beat)
        }

        // only add needed values to metadata
        if (this.conductor.offset) chartJSON.metadata.offset = this.conductor.offset * 1000 // offset
        if (chartVolume != CONFIG.defaultSongVolume) chartJSON.metadata.volume = chartVolume // volume
        if (this.scrollMultiplier > 1) chartJSON.metadata.scrollMultiplier = this.scrollMultiplier // scroll multiplier

        // clap sounds
        if (this.conductor.clapSound.data.file != CLAPS.find(x => x.default).file) chartJSON.metadata.clap = this.conductor.clapSound.data.file
        if (this.conductor.clapSound.sound.volume() != CONFIG.defaultClapVolume / 100) chartJSON.metadata.clapVolume = this.conductor.clapSound.sound.volume() * 100
        
        if (this.conductor.cpuClapSound.data.file != CLAPS.find(x => x.cpuDefault).file) chartJSON.metadata.cpuClap = this.conductor.cpuClapSound.data.file
        if (this.conductor.cpuClapSound.sound.volume() != CONFIG.defaultClapVolume / 100) chartJSON.metadata.cpuClapVolume = this.conductor.cpuClapSound.sound.volume() * 100
    
        return chartJSON
    }

    chartString() {
        return JSON.stringify(this.createChartJSON(), null, 2)
        .replace(/{\s+/g, "{ ").replace(/\s+}/g, " }") // bracket line breaks
        .replace(/([^}]),\s+/g, "$1, ") // comma line breaks
        .replace(/^{/g, "{\n ") // opening bracket
        .replace(/ }$/g, "\n}") // closing bracket
        .replace(/], "/g, "],\n  \"") // main keys
    }
}