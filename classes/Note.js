class Note {
    constructor(game, note) {
        this.game = game // main game class
        this.beat = toSafe(note.beat) // beat number
        this.arrow = this.parseArrow(note.arrow) // arrow type
        if (!this.beat || this.beat < 1 || !this.arrow) return
        
        this.icon = note.icon // emoji to use, takes priority over default arrow
        this.auto = !this.isBomb() && note.auto // cpu controlled
        this.secs = this.game.conductor.getSecsFromBeat(this.beat) // song position in seconds, including bpm changes (whew!)  
        this.hit = false // hit correctly
        this.missed = false // missed for any reason
        this.multi = this.setMulti()
        this.accuracy = null // accuracy if hit

        this.missQueue = null // timeout to determine when the beat is missed
        this.clapQueue = null // timeout to determine when to play clap sound
        this.partialTimeout = null // timeout to determine when multihit expires
        this.autoQueue = null // timeout to determine when autoplay should hit
    }

    reset() {
        this.hit = false
        this.missed = false
        this.skipped = false
        this.accuracy = null
        this.setMulti()
        this.clearQueue()
    }

    setMulti() {
        this.multi = this.arrow.length > 1 ? this.arrow.split("") : null
    }

    active() {
        return !this.auto && !this.hit && !this.missed && !this.skipped
    }

    isBomb() {
        return this.arrow == "x"
    }
 
    parseArrow(arrow) {
        if (!arrow) return
        else if (arrow.includes("x")) return "x" // bomb priority, can never be double
        else if (arrow.includes("o") && arrow.includes("+")) return "+o" // two handed priority 
        else if (arrow.includes("o")) return "o" // spacebar priority
        else if (arrow.includes("+")) return "+" // any arrow priority

        arrow = arrow.replace(/[^\^v<>]/g, "").split("") // remove illegal chars
        arrow = arrow.filter((x, y) => arrow.findIndex(i => i == x) == y).sort().join("") // remove duplicates and sort

        if (!arrow.length) return null
        else if (arrow.length > 2) return arrow.slice(0, 2)
        else return arrow
    }

    clap(accuracy=0, feedback) {
        this.hit = true
        let isLate = accuracy < 0
        if (!this.auto) this.accuracy = accuracy
        accuracy = Math.abs(accuracy)
        if (feedback) this.feedback = feedback
        else if (accuracy < WINDOWS.hit / 4) this.feedback = "perfect"
        else if (accuracy < WINDOWS.hit / 1.5) this.feedback = isLate ? "lperfect" : "eperfect"
        else this.feedback = isLate ? "late" : "early"
        this.game.setFeedback(this.feedback)
        this.game.frameOffset[isLate ? "late" : "early"] += accuracy * 60
        clearTimeout(this.missQueue)
    }

    miss(reason) {
        if (this.isBomb() && reason == "toolate") return this.hit = true
        else if (!this.active()) return
        this.missed = true
        if (reason) this.feedback = reason
        this.game.setFeedback("missed")
        if (PLAYERSETTINGS.soundEffects) SFX.mistake.play()
    }

    trigger(arrow, songPos) {

        let controlMode = PLAYERSETTINGS.controlScheme
        let noDoubles = controlMode != "normal"

        let isMulti = this.multi && !noDoubles
        let multihit = isMulti && (this.multi.includes(arrow) || (anyArrow && this.multi.includes("+")))
        let accuracy = this.secs - (songPos - (PLAYERSETTINGS.inputOffset / 1000))

        let arrowList = ["<", "v", "^", ">"]
        let anyArrow = arrowList.includes(arrow)
        let correctArrow = !this.multi && this.arrow == arrow

        if (controlMode == "onebutton") correctArrow = true // one button mode
        else if (controlMode == "anyarrow" && anyArrow && (this.multi || arrowList.includes(this.arrow))) correctArrow = true // two button mode
        else if (this.arrow == "+" && anyArrow) correctArrow = true // any arrow

        // disable doubles for extra control schemes
        if (!correctArrow && noDoubles) {
            if (this.arrow.includes("+") && this.arrow.includes("o") && (anyArrow || arrow == "o")) correctArrow = true
            else if (this.multi && this.multi.includes(arrow)) correctArrow = true
            else if (controlMode == "twoarrow" && anyArrow) {
                let arrowGroups = [["<", ">"], ["^", "v"]]
                if (arrowGroups.find(x => x.includes(arrow) && x.includes(this.arrow))) correctArrow = true
            }
        }

        // hit!! (correct arrow, not in early window)
        if (correctArrow && songPos >= this.secs - hitWindow() + (PLAYERSETTINGS.inputOffset / 1000)) {
            this.clap(accuracy)
        }

        // multiple arrows
        else if (this.multi && multihit) {
            this.multi = this.multi.filter(x => x != arrow)
            if (anyArrow) this.multi = this.multi.filter(x => x != "+")
            if (!this.multi.length) {
                this.partialTimeout = null;
                clearTimeout(this.partialTimeout);
                this.clap(accuracy)
            }
            else if (!this.partialTimeout) this.partialTimeout = setTimeout(() => { this.miss("wrongdoublekey") }, WINDOWS.double * 1000);
        }

        // otherwise miss (too early or wrong key)
        else this.miss(this.isBomb() ? "bomb" : correctArrow ? "tooearly" : "wrongkey")
    }

    queue(songPos) {
        if (this.isBomb()) this.auto = false
        let timeBetween = (this.secs - songPos) / this.game.conductor.speed

        if (!this.auto && !this.missQueue) {
            this.missQueue = setTimeout(() => {
                if (this.active()) this.miss("toolate")
            }, (timeBetween + hitWindow() + (PLAYERSETTINGS.inputOffset / 1000)) * 1000); // window ends  
        }          

        if (!this.clapQueue && PLAYERSETTINGS.soundEffects) {
            let clapSound = this.game.conductor[(this.auto) ? "cpuClapSound" : "clapSound"]
            let clapPreloadTime = (timeBetween * 1000) - clapSound.data.offset
            if (clapPreloadTime > -50) this.clapQueue = setTimeout(() => {
                if (!this.game.paused && this.game.active && !this.skipped) clapSound.sound.play()
            }, clapPreloadTime) // clap sound
        }

        if (!this.autoQueue) {
            this.autoQueue = setTimeout(() => {
                if (CONFIG.autoplay && !this.game.paused && this.game.active && !this.skipped) this.clap(0, "auto")
            }, timeBetween * 1000); // auto hit sound
        }
    }

    clearQueue() {
        clearTimeout(this.missQueue); clearTimeout(this.clapQueue); clearTimeout(this.partialTimeout); clearTimeout(this.autoQueue)
        this.missQueue = null; this.clapQueue = null; this.partialTimeout = null; this.autoQueue = null;
    }
    
    isUpcoming() {
        return this.game.conductor.isAhead(this.beat)
    }

    inWindow(songPos) {
        return this.active() && this.missQueue && songPos >= (this.secs - hitWindow() + (PLAYERSETTINGS.inputOffset / 1000) - (WINDOWS.tooEarly * this.game.conductor.speed))
    }

}