class Editor {
    constructor(game, saveLocation) {
        this.game = game
        this.selectedBeats = []
        this.saveLocation = saveLocation || null
    }

    drawChart(select) {
        $('#chart').empty()
        this.deselectAll()

        let allNotes = this.game.getAllNotes()
        let lastBeat = Math.ceil(Math.max(...allNotes.map(x => x.beat))) // get highest beat
        let lastSubdiv = this.game.conductor.getSubdivision(1)

        for (let i = 1; i < lastBeat; i++) {
            let thisBeat = allNotes.filter(x => Math.floor(x.beat) == i)
            let subdivBeats = thisBeat.map(x => {
                let bpmChange = this.game.conductor.bpmChanges.find(z => x.beat > 1 && z.beat == x.beat)
                let subdivChange = this.game.conductor.subdivisionChanges.find(z => x.beat > 1 && z.beat == x.beat)
                let noteElement = $(`<div class="note" beat="${x.beat}" note="${x.note || "-"}">${this.emojiElement(x.note)}</div>"`)
                if (x.note && x.data.auto) noteElement.addClass("auto")
                if (bpmChange) noteElement.attr("bpm", bpmChange.bpm)
                if (subdivChange) noteElement.attr("subdivision", subdivChange.subdivision)
                return noteElement.prop("outerHTML")
            }).join("")

            if (thisBeat.length != lastSubdiv) {
                $('#chart').append("<hr>")
                lastSubdiv = thisBeat.length
            }
            let isMissingNotes = this.game.notes.filter(x => Math.floor(x.beat) == i).length != thisBeat.filter(x => x.note && x.note != "-").length
            $('#chart').append(`<div class="beat${isMissingNotes ? " missingNotes" : ""}" num="${i}">${subdivBeats}</div>`)
        }
        if (select) select.forEach(x => this.selectBeat(x, true))
        this.game.updatePath()
    }

    emojiElement(emoji) {
        let foundIcon = EMOJIS.notes[emoji]
        return `<div class="emoji"><p>${foundIcon ? twemojiParse(foundIcon[0]) : ""}</p></div>`
    }

    // change the arrow on a certain beat
    setNote(note, beat, noReset=true) {
        if (!beat) return this.deselectAll()
        beat = this.game.conductor.roundToSubdiv(beat)
        let deleteNote = note == "-" || !note
        let foundNote = this.game.notes.find(x => x.beat == beat)
        
        if (foundNote) {
            foundNote.skipped = true
            if (foundNote.arrow == note) return
            else if (deleteNote) this.game.notes = this.game.notes.filter(x => x.beat != foundNote.beat)
            else foundNote.arrow = note
        }
        else if (deleteNote) return
        else {
            let newNote = new Note(this.game, {beat, arrow: note})
            newNote.skipped = true
            this.game.notes.push(newNote)
            this.game.notes = this.game.notes.sort((a, b) => a.beat - b.beat)
        }

        this.updateBeat(beat, noReset)
    }

    // set multiple notes, only ones which currently have
    setManyNotes(note) {
        let beatsWithNotes = this.selectedBeats.filter(x => this.game.notes.find(z => z.beat == x))
        if (this.selectedBeats.length == 1) return this.setNote(note, this.selectedBeats[0])
        if (!beatsWithNotes.length) beatsWithNotes = this.selectedBeats
        beatsWithNotes.forEach(x => this.setNote(note, x) )
    }

    updateBeat(beat, noReset) {
        this.drawNote(beat)
        if (!noReset && this.game.active) this.game.restart()
    }

    stopPlaytest() {
        $('.highlighted').removeClass('highlighted') // remove editor highlighting
        if (!this.selectedBeats.length) this.deselectAll()
        this.displayBeat()
    }
    
    scrollToBeat(beat) {
        if (!chartVisible) return;
        let foundElement = $(`.beat[num="${Math.floor(beat)}"]`)
        if (!foundElement.length) return
        $('#chart').scrollTop($('#chart').scrollTop() + foundElement.offset().top - (foundElement.height() * 7))
    }

    highlightBeat(beat) {
        if (!chartVisible) return;
        $('.highlighted').removeClass('highlighted')
        $(`.beat[num="${Math.floor(beat)}"]`).addClass('highlighted')
        $(`.note[beat="${this.game.conductor.roundToSubdiv(beat)}"]`).addClass('highlighted')
        this.displayBeat(beat)
    }

    updateSongInfo() {
        $('#chartNameInput').val(this.game.chartName)
        $('#songFilename').val(this.game.conductor.filename)
        $('#startingBPM').val(this.game.conductor.bpmChanges[0].bpm)
        $('#startingSubdiv').val(this.game.conductor.subdivisionChanges[0].subdivision)
        $('#songOffset').val(this.game.conductor.offset * 1000)
        $('#startingVolume').val(this.game.conductor.music.volume() * 100)
        $('#currentSpeed').html(this.game.conductor.speed.toFixed(1))
    }

    displayBeat(beat) {       
        if (beat === 0) {
            $('#currentBeat').html("-")
            $('#currentTime').html("-")
            $('#currentBPMChange').val("")
            $('#currentSubdivChange').val("")
            $('#currentArrow').val("-")
            $('#currentBPMChange').attr("placeholder", this.game.conductor.getBPM(1))
            $('#currentSubdivChange').attr("placeholder", this.game.conductor.getSubdivision(1))

            $('#noteInfo').hide()
            $('#songInfo').show()
            return
        }
        else if (!beat) beat = this.firstSelected()

        let roundBeat = Math.floor(beat)
        let subdiv = this.game.conductor.getSubdivision(beat)
        let multiple = !this.game.active && this.selectedBeats.length > 1

        let foundArrow = this.game.notes.find(x => x.beat == beat)
        let arrowVal = foundArrow ? foundArrow.arrow : "-"
        $('#currentArrow').val(multiple ? "" : arrowVal)

        let foundBPMChange = this.game.conductor.bpmChanges.find(x => beat > 1 && x.beat == beat)
        $('#currentBPMChange').val(foundBPMChange ? foundBPMChange.bpm : "")
        $('#currentBPMChange').attr("placeholder", foundBPMChange ? "-" : this.game.conductor.getBPM(beat))

        let foundSubdivChange = this.game.conductor.subdivisionChanges.find(x => x.beat > 1 && x.beat == Math.floor(beat))
        $('#currentSubdivChange').val(foundSubdivChange ? foundSubdivChange.subdivision : "")
        $('#currentSubdivChange').attr("placeholder", foundSubdivChange ? "-" : this.game.conductor.getSubdivision(beat))

        if (!multiple) {
            $('#singleBeatInfo').show(); $('#multiBeatInfo').hide()
            $('#currentBeat').html(subdiv == 1 ? roundBeat : `${roundBeat} + (${Math.round((beat - roundBeat) * subdiv)}/${subdiv})`)
            $('#currentTime').html(timestamp(this.game.conductor.getSecsFromBeat(beat)))
        }

        else {
            $('#singleBeatInfo').hide(); $('#multiBeatInfo').show()
            let firstBeat = this.firstSelected()
            let lastBeat = Math.max(...this.selectedBeats)
            $('#selectedBeats').html(`Beat ${fixed(firstBeat, 3)} to ${fixed(lastBeat, 3)}`)
            $('#selectedDuration').html(`${timestamp(this.game.conductor.getSecsFromBeat(lastBeat) - this.game.conductor.getSecsFromBeat(firstBeat))}`)
        }


        if (!multiple && foundArrow && foundArrow.auto) $('#cpuButton').addClass("greyBG")
        else $('#cpuButton').removeClass("greyBG")

        $('#noteInfo').show()
        $('#songInfo').hide()
    }

    selectBeat(beat, multi, element) {
        if (!multi) {
            let wasSingle = this.selectedBeats.length == 1 && this.selectedBeats[0] == beat
            this.deselectAll(!wasSingle)
            if (wasSingle) return
        }
        let targetElement = element ? element : $(`.note[beat="${beat}"]`)
        this.selectedBeats.push(beat)
        this.displayBeat();
        targetElement.addClass('selected')
    }

    firstSelected() {
        if (!this.selectedBeats.length) return 0
        return Math.min(...this.selectedBeats)
    }

    deselect(beat) {
        $(`.note[beat="${beat}"]`).removeClass('selected')
        this.selectedBeats = this.selectedBeats.filter(x => x != beat)
        if (!this.selectedBeats.length) this.displayBeat(0)
        else this.displayBeat() 
    } 

    deselectAll(noDisplay) {
        $('.selected').removeClass('selected')
        this.selectedBeats = []
        if (!this.game.active && !noDisplay) this.displayBeat(0) 
    }

    toggleCPU(beat) {
        beat = Number(beat)
        this.game.notes.filter(x => !x.isBomb() && x.beat == beat).forEach(x => x.auto = !x.auto)
        this.updateBeat(beat)
        this.displayBeat()
    }

    toggleCPUMulti() {
        this.selectedBeats.forEach(x => this.toggleCPU(x))   
    }

    confirmBPMChange() {
        if (!this.selectedBeats.length) return
        let beat = this.firstSelected()
        let newBPM = $('#currentBPMChange').val() ? Number($('#currentBPMChange').val()) : this.game.conductor.getBPM(this.game.conductor.getPreviousBeat(beat))
        if (beat == 1) return this.setStartBPM(newBPM)
        let success = this.game.conductor.addBPMChange(beat, newBPM)
        if (success) this.drawChart(this.selectedBeats)
        if ($('#currentBPMChange').val()) $('#currentBPMChange').val(this.game.conductor.getBPM(beat))
    }

    confirmSubdivChange() {
        if (!this.selectedBeats.length) return
        let beat = this.firstSelected()
        let newSubdiv = $('#currentSubdivChange').val() ? Number($('#currentSubdivChange').val()) : this.game.conductor.getSubdivision(this.game.conductor.getPreviousBeat(beat))
        if (Math.floor(beat) == 1) return this.setStartSubdiv(newSubdiv)
        let success = this.game.conductor.addSubdivChange(beat, newSubdiv)
        if (success) this.drawChart(Math.floor(beat))
        if ($('#currentSubdivChange').val()) $('#currentSubdivChange').val(this.game.conductor.getSubdivision(beat))
    }

    setStartBPM(num) {
        let newBPM = Number(num || $('#startingBPM').val() || $('#startingBPM').attr('placeholder'))
        let currentStartBPM = this.game.conductor.bpmChanges.find(x => x.beat == 1)
        if (!newBPM) return $('#startingBPM').val(currentStartBPM.bpm)
        else {
            currentStartBPM.bpm = clamp(newBPM, 1, CONFIG.bpmLimit)
            this.game.conductor.organizeBPMChanges()
            this.drawChart()
        }
        this.game.conductor.updateActionSecs()
        this.updateSongInfo()
    }

    setStartSubdiv(num) {
        let newSubdiv = Number(num || $('#startingSubdiv').val() || $('#startingSubdiv').attr('placeholder'))
        let currentStartSubdiv = this.game.conductor.subdivisionChanges.find(x => x.beat == 1)
        if (!newSubdiv) return $('#startingSubdiv').val(currentStartSubdiv.bpm)
        else {
            currentStartSubdiv.subdivision = clamp(newSubdiv, 1, CONFIG.subdivLimit)
            this.game.conductor.organizeSubdivChanges()
            this.drawChart()
        }
        this.updateSongInfo()
    }

    setOffset() {
        let newOffset = Number($('#songOffset').val() || $('#startingSubdiv').attr('placeholder'))
        if (!newOffset) return $('#songOffset').val(this.game.conductor.offset * 1000)
        else this.game.conductor.offset = clamp(-20000, 20000, newOffset) / 1000
        this.game.conductor.updateActionSecs()
        this.updateSongInfo()
    }

    setStartVolume() {
        let newVolume = Number($('#startingVolume').val()) || CONFIG.defaultSongVolume
        if (!newVolume) return $('#startingVolume').val(this.game.conductor.music.volume() * 100)
        else this.game.conductor.setVolume(newVolume)
        this.updateSongInfo()
    }

    setSongFilename() {
        let dotSplit = this.game.conductor.filename.split(".") // .at(-1) isnt supported in a lot of browsers :pensive:
        let currentExtension = "." + dotSplit[dotSplit.length - 1]
        let newFilename = safeFilename($('#songFilename').val()).slice(0, 64) || "song"
        if (!dotSplit[1]) newFilename = newFilename.replace(/\./g, "")
        else if (!newFilename.endsWith(currentExtension)) newFilename += currentExtension
        $('#songFilename').val(newFilename)
        this.game.conductor.filename = newFilename
    }

    setSong(songData) {
        let reader = new FileReader()
        reader.onload = async function() { game.conductor.setSong(reader.result.replace("data:video", "data:audio"), songData.name) }
        reader.readAsDataURL(songData)
        this.drawChart()
    }

    // visually update the beat
    drawNote(beat) {
        let foundNote = this.game.notes.find(x => x.beat == beat) || {}
        let noteElement = $(`.note[beat="${beat}"]`)
        noteElement.html(this.emojiElement(foundNote.arrow)).attr('note', foundNote.arrow || "-")
        if (foundNote.auto) noteElement.addClass('auto')
        else noteElement.removeClass('auto')
        this.game.updatePath()
    }

    // when the song is loaded
    ready() {
        this.drawChart()
        $('#loadingMenu').hide()
        $('#editor').show()
    }

    chartName(ext) {
        return (safeFilename($('#chartNameInput').val()) || "untitled") + (ext ? ".urlx" : "")
    }

    async saveChart() {
        if (!browserDoesntSuck) return alert("Your browser doesn't support quick saving! Switch to a supported browser (Chrome, Edge, etc) or save by exporting the chart to a zip.")
        if (!this.saveLocation) this.saveLocation = await window.showDirectoryPicker().catch(() => null)
        if (!this.saveLocation) return // if save popup was closed

        $('#saveBtn').hide()
        $('#saving').show()
                       
        let songFile = this.game.conductor.filename

        if (!this.game.conductor.noSong) {
            let foundSong = await this.saveLocation.getFileHandle(songFile).catch(() => null)
            if (!foundSong) await this.saveLocation.getFileHandle(songFile, {create: true}).then(songFile => {
                songFile.createWritable().then(async writable => {
                    let blobData = await fetch(this.game.conductor.music._src).then(res => res.blob())
                    writable.write(blobData).then(() => writable.close()).catch((e) => alert(e))
                }).catch(() => {})
            })
        }

        await this.saveLocation.getFileHandle(this.chartName(true), {create: true}).then(chartFile => {
            chartFile.createWritable().then(async writable => {
                writable.write(this.game.chartString()).then(() => {
                    writable.close()
                    $('#saveBtn').show()
                    $('#saving').hide()
                }).catch((e) => alert(e))
            }).catch(() => {})
        })
    }

    zipChart() {
        $('#exportBtn').hide()
        $('#exporting').show()
        let chartName = this.chartName()

        if (this.game.conductor.noSong) {
            let chartBlob = new Blob([this.game.chartString()], {type: "application/json"})
            let chartSaveOptions = {suggestedName: chartName + ".urlx", types: [{description: "URLX chart (no song)", accept: {"application/json": [".urlx", ".json"]}}] }
            this.savePrompt(chartBlob, chartSaveOptions, ".urlx", "application/json")
            $('#exportBtn').show()
            $('#exporting').hide()
            return
        }

        let zipFile = new JSZip();
        zipFile.file(`${chartName}.urlx`, this.game.chartString())
        zipFile.file(this.game.conductor.filename, this.game.conductor.music._src.split(",")[1], {base64: true})
        zipFile.generateAsync({type: "blob"}).then(async blob => {
            let saveOptions = {suggestedName: chartName + ".urlzip", types: [{description: "Zip file", accept: {"application/zip": [".urlzip", ".zip"]}}] }
            this.savePrompt(blob, saveOptions, ".urlzip", "application/zip")
            $('#exportBtn').show()
            $('#exporting').hide()
        })
    }

    savePrompt(blob, saveOptions, extension, blobType) {
            // the cool modern way
            if (browserDoesntSuck) {
                window.showSaveFilePicker(saveOptions)
                .then(selectedFile => {
                    selectedFile.createWritable().then(writable => {
                        writable.write(blob).then(() => writable.close()).catch(() => {})
                    }).catch(() => {})
                }).catch(() => {})
            }

            // the lame old way
            else {
                let downloader = document.createElement('a');
                downloader.href = URL.createObjectURL(new Blob([blob], {type: blobType}))
                downloader.setAttribute("download", saveOptions.suggestedName);
                document.body.appendChild(downloader);
                downloader.click();
                document.body.removeChild(downloader);
            }
    }

}

//=============================//

// editor note selection
$(document).on('click', '.note', function (e) { 
    let beatNum = +$(this).attr('beat')
    if (e.shiftKey && game.editor.selectedBeats.length) {
        let firstSelection = Math.min(...game.editor.selectedBeats)
        if (beatNum < firstSelection) {
            let oldFirst = firstSelection
            firstSelection = beatNum
            beatNum = oldFirst
        }

        let lastSelection = Math.max(...game.editor.selectedBeats, beatNum)

        // select all beats in between
        $('.note').each(function() {
            let beat = Number($(this).attr("beat"))
            if (beat >= firstSelection && beat <= beatNum && !game.editor.selectedBeats.includes(beat)) game.editor.selectBeat(beat, true, $(this))
            else if (beat > beatNum && beat <= lastSelection) game.editor.deselect(beat)
        });
        
    }
    else if (game.editor.selectedBeats.includes(beatNum) && e.ctrlKey) game.editor.deselect(beatNum)
    else game.editor.selectBeat(beatNum, e.ctrlKey, $(this))
})

// editor note right click
$(document).on('contextmenu', '.note', function (e) { 
    e.preventDefault()
    let beatNum = +$(this).attr('beat')
    game.editor.toggleCPU(beatNum)
})

// toggle ui
let chartVisible = true
function toggleChartVisiblity(visibility) {
    chartVisible = visibility === undefined ? !chartVisible : visibility
    $('.chartVisible').toggle(chartVisible);
    $('.chartHidden').toggle(!chartVisible)
    if (!chartVisible) game.updateStats()
}

// i'm lazy
$('#currentYear').text(new Date().getFullYear())

// mobile
let mobile = ( /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ) 
if (mobile) {
    $('#welcome').hide()
    $('#mobileWarning').show()
}

// hitsound list
let hitsoundOptions = CLAPS.map(x => `<option value="${x.file}">${x.name}</option>`).join("")
$('.hitsoundList').append(hitsoundOptions)