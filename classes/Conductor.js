class Conductor {
    constructor(game, chart, song) {
        this.game = game // main game class
        this.speed = 1 // song speed multiplier
        this.noSong = !song

        this.setSong(song, chart.metadata.filename)
        this.setClapSound(chart.metadata.clap, chart.metadata.clapVolume)
        this.setClapSound(chart.metadata.cpuClap, chart.metadata.cpuClapVolume, true)
        if (Number(chart.metadata.volume)) this.setVolume(Number(chart.metadata.volume))
        
        this.offset = (chart.metadata.offset || 0) / 1000 // song offset in seconds
        this.beat = 1 // current beat number

        let rawActions = chart.actions || []

        this.calculateBPMChanges(rawActions.filter(x => x.type == "bpm" && x.val > 0).concat({beat: 1, val: chart.metadata.bpm || 100}))
        
        this.subdivisionChanges = [{beat: 1, subdivision: chart.metadata.subdivision || 4}] // how many spaces a single beat is split into (higher number = faster scroll speed)
        rawActions.filter(x => x.type == "subdivision" && x.val > 0 && x.beat % 1 == 0).forEach(x => {
            let lastSubdivChange = this.subdivisionChanges[this.subdivisionChanges.length - 1]
            let newSubdiv = clamp(+x.val, 1, CONFIG.subdivLimit)
            if (lastSubdivChange.beat != x.beat && lastSubdivChange.subdivision != newSubdiv) this.subdivisionChanges.push({beat: x.beat, subdivision: newSubdiv})
        })
        this.organizeSubdivChanges()

        if (Number(chart.metadata.speed || 1) != 1) this.setSpeed(+chart.metadata.speed)
        this.frameCounter = 0
        this.updateFrameInterval()
    }

    play() { // plays the song
        this.music.stop().seek(Math.max(0, this.getSecsFromBeat(this.beat))).play()
    }

    reset(startingBeat=1) { // resets song
        this.beat = startingBeat
        this.music.stop()
        this.game.conductor.updateFrameInterval()
    }

    setSong(songData, songFilename) { // change song
        this.music = new Howl({
            src: [songData || "sfx/empty.ogg"],
            volume: 0.75,
            loop: false,
            onload: () => { this.game.editor.ready() },
            onend: () => { this.game.finish() },
            onplay: () => { this.game.musicstart() },
            onloaderror: (id, err) => { console.error(err); alert(`Error while loading song! ${!browserDoesntSuck ? "Your current browser lacks lots of modern features, maybe try switching?" : ""}\n` + err) },
            onplayerror : (id, err) => { console.error(err); alert(`Error while playing song! ${!browserDoesntSuck ? "Your current browser lacks lots of modern features, maybe try switching?" : ""}\n` + err) }
        });
        this.noSong = !songData
        this.filename = songFilename || ""
        $('#songFilename').val(this.filename)
    }

    setVolume(vol) { // set song volume
        this.music.volume(clamp(0, 100, Math.round(vol)) / 100)
    }

    setClapSound(clapFilename, clapVolume, cpuSound=false) { // change clap sound
        let clapType = cpuSound ? "cpuClapSound" : "clapSound"
        let currentClap = this[clapType]
        let vol = isNaN(clapVolume) && currentClap ? currentClap.sound.volume() * 100 : Math.round(clamp(+clapVolume, 0, 100))
        if (isNaN(vol)) vol = CONFIG.defaultClapVolume
        $(`#${clapType}`).find("input").val(vol)
        if (!clapFilename && currentClap) return currentClap.sound.volume(vol / 100)
        let foundClap = CLAPS.find(x => x.file == clapFilename) || CLAPS.find(x => cpuSound ? x.cpuDefault : x.default)
        this[clapType] = { data: foundClap, sound: new Howl({src: [`claps/${foundClap.file}.ogg`], volume: vol / 100, loop: false }) } 
        $(`#${clapType}`).find("select").val(foundClap.file)
    }

    getBPM(targetBeat=this.beat) { // get the BPM at a certain beat
        return this.bpmChanges.findLast(x => x.beat <= targetBeat).bpm
    }

    getSubdivision(targetBeat=this.beat) { // get the subdivision at a certain beat
        return this.subdivisionChanges.findLast(x => x.beat <= targetBeat).subdivision
    }

    getBeatLength(targetBeat=this.beat) { // get the beat length in ms at a certain beat
        return 60 / this.getBPM(targetBeat) / this.speed * 1000
    }

    getScrollSpeed(targetBeat=this.beat) { // get the scroll speed at a curret beat
        return this.getBeatLength(targetBeat) / this.getSubdivision(targetBeat)
    }

    roundToSubdiv(beat, subdiv) {
        if (!subdiv) subdiv = this.getSubdivision(beat)
        return toSafe(Math.round(beat * subdiv) / subdiv)
    }

    subdivSearch(arr, beat, subdiv) {
        return arr.find(x => this.roundToSubdiv(x.beat, subdiv) == this.roundToSubdiv(beat, subdiv))
    }

    increment() {
        let currentSubdiv = this.getSubdivision()
        this.beat = this.roundToSubdiv(this.beat + (1 / currentSubdiv), currentSubdiv)
        this.updateFrameInterval()
        this.frameCounter++
    }

    getPreviousBeat(beat) {
        if (beat == 1) return 1
        let lastSubdiv = this.getSubdivision(Math.floor(beat) != beat ? beat : Math.floor(beat - 1))
        return this.roundToSubdiv(beat - (1 / lastSubdiv), lastSubdiv)
    }

    setSpeed(speed, add) {
        if (this.game.active) return
        this.speed = add ? fixed(this.speed + speed, 4) : speed
        if (this.speed < 0.1) this.speed = 0.1
        else if (this.speed > 10) this.speed = 10
        this.music.rate(this.speed)
        this.updateFrameInterval()
        $('#currentSpeed').html(this.speed.toFixed(1))
    }

    // updates the game FPS based on BPM and subdivision. staggers the FPS if it gets too fast to prevent freezing
    updateFrameInterval() {
        this.frameLength = this.getScrollSpeed() // length of one frame in game, if this is too low the address bar will freeze
        this.frameInterval = Math.ceil(CONFIG.maxSpeed / this.frameLength) // change frame rate if framelength is too low
    }

    // calculates the position in seconds for each bpm change
    calculateBPMChanges(actions) { 
        actions = actions.sort((a, b) => a.beat - b.beat)
        this.bpmChanges = [{beat: actions[0].beat, bpm: actions[0].val, secs: 0}]
        for (let i=1; i < actions.length; i++) {
            let bpmAction = actions[i]

            let lastChange = this.bpmChanges[this.bpmChanges.length - 1] // get the last bpm change so far, since its time is already calculated
            let secs = lastChange.secs + getSecsBetween(lastChange.beat, bpmAction.beat, lastChange.bpm) // get the time between beats, then add it to the # of secs from the previous bpm change

            if (lastChange.bpm != bpmAction.val && bpmAction.beat != lastChange.beat) this.bpmChanges.push({beat: bpmAction.beat, bpm: clamp(bpmAction.val, 1, CONFIG.bpmLimit), secs})
        }
        this.organizeBPMChanges()
    }

    // updates the second position for actions
    updateActionSecs() {
        this.game.notes.forEach(x => x.secs = this.getSecsFromBeat(x.beat))
    }

    // adds a new bpm change and recalculates
    addBPMChange(beat, bpm) {
        if (!beat || !bpm || this.getBPM(beat) == bpm || beat <= 1) return
        bpm = clamp(bpm, 1, CONFIG.bpmLimit)
        let newBPMChanges = this.bpmChanges.filter(x => x.beat != beat).map(x => ({beat: x.beat, val: x.bpm}))
        newBPMChanges.push({beat, val: bpm})
        this.calculateBPMChanges(newBPMChanges)
        this.updateActionSecs()
        this.organizeBPMChanges()
        return true
    }

    addSubdivChange(beat, subdiv) {
        beat = Math.floor(beat)
        if (!beat || !subdiv || this.getSubdivision(beat) == subdiv || beat <= 1) return
        subdiv = clamp(subdiv, 1, CONFIG.subdivLimit)
        let foundSubdivChange = this.subdivisionChanges.find(x => x.beat == beat)
        if (foundSubdivChange) foundSubdivChange.subdivision = subdiv
        else this.subdivisionChanges.push({beat, subdivision: subdiv})
        this.updateActionSecs()
        this.organizeSubdivChanges()
        return true
    }

    removeDuplicateActions(arr, key) {
        let toDelete = []
        for (let i=1; i < arr.length; i++) {
            let current = arr[i];
            let previous = arr[i - 1];
            if (current[key] == previous[key]) toDelete.push(i);
        }
        return arr.filter((x, y) => !toDelete.includes(y))
    }

    organizeBPMChanges() { this.bpmChanges = this.removeDuplicateActions(this.bpmChanges.sort((a, b) => a.beat - b.beat), "bpm") }

    organizeSubdivChanges() { this.subdivisionChanges = this.removeDuplicateActions(this.subdivisionChanges.sort((a, b) => a.beat - b.beat), "subdivision") }

    // gets the position of a beat in seconds, taking bpm changes into consideration
    getSecsFromBeat(targetBeat) {
        let lastBPMChange = this.bpmChanges.findLast(x => x.beat <= targetBeat) // gets most recent bpm change since the target beat. also since when is findLast a thing?
        if (targetBeat == lastBPMChange.beat) return lastBPMChange.secs + this.offset // if the beats are the same, just return the secs from the bpm change
        else return lastBPMChange.secs + this.offset + getSecsBetween(lastBPMChange.beat, targetBeat, lastBPMChange.bpm) // calculate the # of seconds between the two changes, then add it to the # of secs from the previous bpm change
    }

    // same as the function above but the other way around
    getBeatFromSecs(targetSecs) {
        if (!targetSecs) targetSecs = this.songPos()
        targetSecs -= this.offset
        let lastBPMChange = this.bpmChanges.findLast(x => x.secs <= targetSecs)
        return (lastBPMChange.beat + ((targetSecs - lastBPMChange.secs) / (60 / lastBPMChange.bpm))) /// this.speed
    }

    isValidFrame() {
        return this.frameCounter % this.frameInterval == 0
    }

    songPos() { // song position
        return this.music.seek()
    }

    // get the amount of secs until the next beat, essentially compares the beat number and the song position
    timeToNextBeat(targetBeat) { 
        return (this.getSecsFromBeat(targetBeat) - this.songPos()) / this.speed
    }

    isAhead(beat) {
        return beat < (this.beat + CONFIG.upcomingBeatLookahead)
    }
}