let gameImportData = [
    {
        name: "Rhythm Doctor",
        id: "rd",
        hover: "Samurai.",
        filestring: ".rdlevel file",
        filetypes: [".rdlevel"],
        details: "All 'hits' in the level will be charted as spacebar presses.",
        settings: [
            {
                name: "Also chart oneshot pulses (oneshot rows)",
                id: "oneshotpulses",
                type: "bool",
                checked: true
            },
            {
                name: "Also chart classic pulses (classic rows)",
                id: "classicpulses",
                type: "bool",
                checked: true
            },
            {
                name: "Use CPU hits for row pulses",
                id: "cpupulses",
                type: "bool",
                checked: true
            },
            {
                name: "Also chart release (held beats)",
                id: "releases",
                type: "bool"
            },
            {
                name: "Two player mode (P1 is space and P2 is arrow)",
                id: "twoPlayer",
                type: "bool"
            }
        ]
    },

    {
        name: "Friday Night Funkin'",
        id: "fnf",
        hover: "whitty real",
        filestring: ".json file",
        filetypes: [".json"],
        details: "All notes will be charted, and opponent hits will be marked as CPU notes. Held notes will be replaced with single hits.<br><b>Song offset is required to snap beats correctly!</b> It can be found in an audio editor by getting the amount of time between the start of the song and beat 1.<br>Anyways expect lots of bugs because chart format differs between mods.",
        settings: [
            {
                name: "Song offset:",
                id: "offset",
                type: "number",
                unit: "ms",
                default: 0,
            },
            {
                name: "Use spacebar presses instead of arrows",
                id: "useclaps",
                type: "bool"
            },
            {
                name: "Hit opponent notes as well",
                id: "nocpu",
                type: "bool"
            },
            {
                name: "Also chart releases (held notes)",
                id: "releases",
                type: "bool"
            }
        ]
    },

    {
        name: "StepMania",
        id: "sm",
        hover: "how.",
        filestring: ".sm file",
        filetypes: [".sm"],
        details: "All notes will be charted. Held/roll notes will be replaced with single hits, and mines will be marked as CPU notes. No sexy visuals unfortunately 😔",
        settings: [
            {
                name: "Chart difficulty",
                id: "difficulty",
                type: "select",
                options: "difficulties"
            },
            {
                name: "Use spacebar presses instead of arrows",
                id: "useclaps",
                type: "bool"
            },
            {
                name: "Also chart releases (held/roll notes)",
                id: "releases",
                type: "bool"
            }
        ]
    }
]

//=========================//

// some constants for certain games
const smDifficultyRegex = /#NOTES:\n.+?\n\s+(.+?):\n +?(\w+):/ // regex for getting stepmania difficulties
const arrowDirections = ["<", "v", "^", ">"] // common arrow order for rhythm games

//=========================//


// selected chart, stored while picking settings
let gameChart = null

// list of supported games
gameImportData.forEach(x => {
    $('#importableGames').append(`<div class="gameOption">
        <img title="${x.hover}" src="./assets/game_${x.id}.png">
        <div class="gameDetails">
            <h3>${x.name}</h3>
            <p>${x.filestring}</p>
        </div>
        <input type="file" style="display: none;" importfrom="${x.id}" accept="${x.filetypes.join(",")}">
    </div>`)
})

// file input when clicking option
$('.gameOption').click(function(e) {
    if (e.isTrigger) return
    $(this).find('input').click()
})

// when file is selected
$('.gameOption input').on("change", function (e) {
    if (!e.target.files.length) return
    let file = e.target.files[0]
    $('#gameImportFile').text(file.name)
    $('.popup').hide()
    $('#loadingMenu').show()
    validateGameChart({ game: $(this).attr('importfrom'), file })
    $(this).val("")
})

// when song is provided
$('#gameImportSong').on("change", function (e) {
    let file = e.target.files[0]
    $('#gameImportSongName').text(file ? file.name : $('#gameImportSongName').attr("default"))
})

$('#gameImportSongName').text($('#gameImportSongName').attr("default"))

//=========================//

function validGameChart(game, chart, filename, settings={}) {
    gameChart = {game, chart, filename}
    let gameData = gameImportData.find(x => x.id == game)
    $('#gameImportName').text(gameData.name)
    $('#gameImportInfo').html(gameData.details)
    $('#gameImportSettings').empty()
    gameData.settings.forEach(o => {
        let optionData = ""
        switch (o.type) {
            case "bool": optionData = `<label><input setting="${o.id}" ${o.checked ? "checked " : ""}type="checkbox"><span></span></label><p>${o.name}</p>`; break;
            case "number": optionData = `<p>${o.name}</p> <input style="width: 75px; margin-left: 15px" setting="${o.id}" type="number" value="${isNaN(o.default) ? "" : o.default}"> <p>${o.unit || ""}</p>`; break;
            case "select":
                let selectData = typeof o.options === "string" ? settings[o.options] : o.options
                optionData = `<p>${o.name}</p> <select setting="${o.id}">${selectData.map(x => `<option value="${x.id || x}">${x.name || x}</option>`)}</select>`; break;
        }
        if (optionData) $('#gameImportSettings').append(`<div class="setting">${optionData}</div>`)
    })

    $('#loadingMenu').hide()
    $('#gameImportConfig').show()
}

function invalidGameChart(error) {
    $('#loadingMenu').hide()
    alert("Error!\n" + error)
}

// validate if it's actually a chart for that game (wip)
function validateGameChart(data) {
    if (!data || !data.game || !data.file) return

    let reader = new FileReader()

    reader.onload = function() {
        let chartData = reader.result.replace(/(\r|\0)/g, "") // remove return chars and null chars
        switch (data.game) {
            case "rd":
                // remove trailing commas from rdlevel file
                chartData = chartData
                .replace(/,(\s+)},/g, "$1},")
                .replace(/},(\n?\s+")/g, "},$1")
                .replace(/,(\n?\s+])/g, "$1")
                .replace(/,\s*?}/g, " }")
                .replace(/(\n|\t|\r|\\n)/g, " ")
                .replace(/, ?"text":(.|\n)+?},/g, "},") // just delete floating text, like entirely
                .replace(/(\d) "ease"/g, '$1, "ease"') // easing sometimes has missing commas?
               // .trim()

                try { return validGameChart(data.game, JSON.parse(chartData), data.file.name) }
                catch(e) { console.log(chartData); console.error(e); return invalidGameChart("Invalid JSON")
            }
    
            case "fnf":
                try { return validGameChart(data.game, JSON.parse(chartData), data.file.name) }
                catch(e) { console.error(e); return invalidGameChart("Invalid JSON") }

            case "sm":
                let foundDifficulties = chartData.match(new RegExp(smDifficultyRegex, "g"))
                if (!foundDifficulties || !foundDifficulties.length) return invalidGameChart("No difficulties found!")
                foundDifficulties = foundDifficulties.map(x => x.match(smDifficultyRegex)).map(x => ({ id: x[2], name: `${x[2]}${x[1].trim().length ? ` (${x[1].trim()})` : ""}` }))
                return validGameChart(data.game, chartData, data.file.name, {difficulties: foundDifficulties})
        }
    }

    reader.readAsText(data.file)
}

function confirmGameImport() {
    let songFile = $('#gameImportSong').prop("files")[0]
    if (!songFile) importGameChart()
    else {
        let songReader = new FileReader()
        songReader.onload = function() { importGameChart({data: songReader.result.replace("data:video", "data:audio"), name: songFile.name}) }
        songReader.readAsDataURL(songFile)
    }
}

function importGameChart(providedSong={}) {
    $('#loadingMenu').show()
    $('#gameImportConfig').hide()
    $('#gameImportSong').val("")
    $('#gameImportSongName').text($('#gameImportSongName').attr("default"))

    try { // when in doubt lmao

    let gameData = gameImportData.find(x => x.id == gameChart.game)
    let chartSettings = {}

    $('#gameImportSettings').find(".setting *[setting]").each(function() {
        let setting = $(this).attr('setting')
        let data = gameData.settings.find(x => x.id == setting)
        switch (data.type) {
            case "bool":
                chartSettings[setting] = $(this).prop('checked'); break;
            case "number":
                let val = Number($(this).val() || data.default)
                if (!isNaN(data.min) && val < data.min) val = data.min
                else if (!isNaN(data.max) && val > data.max) val = data.max
                chartSettings[setting] = val
                break;
            case "select":
                chartSettings[setting] = $(this).val(); break;
        }
    })

    let chart = { metadata: {}, notes: [], actions: [] }

    function addNote(beat, arrow="o", auto) {
        beat = toSafe(beat)

        let noteObj = { beat, arrow }
        if (auto) noteObj.auto = auto

        let foundBeat = chart.notes.find(x => x.beat == beat && !x.auto == !auto) // breaks if auto isn't inverted
        if (!foundBeat) chart.notes.push(noteObj)
        else {
            if (foundBeat.arrow == arrow) return
            foundBeat.arrow = foundBeat.arrow + arrow
        }
    }

    switch (gameChart.game) {
        case "rd":

            // get total beat number (from bar and beat)
            function getTotalBeat(beat, beatBar) {
                let totalBeats = beat
                for (bar=1; bar < beatBar; bar++) {
                    let timeSig = sigs.find(c => c.bar <= bar)
                    totalBeats += timeSig ? timeSig.crotchetsPerBar : 8
                }
                return totalBeats
            }

            let rdLevel = gameChart.chart
            let startBPM = 100
            let bombBeatsEnabled = rdLevel.settings.mods && rdLevel.settings.mods.includes("bombBeats")

            let sigs = rdLevel.events.filter(x => x.active !== false && x.type == "SetCrotchetsPerBar").sort(function(a, b){return b.bar - a.bar});
            let song = rdLevel.events.filter(x => x.active !== false && x.type == "PlaySong").sort(function(a, b){return a.bar - b.bar})[0]
            if (song && song.bar > 1) {
                alert("This level doesn't have its Play Song event on beat 1! You may have to raise the chart's song offset.")
                let songTotalBeat = getTotalBeat(song.beat, song.bar)
                let firstBPMChange = rdLevel.events.find(x => x.active !== false && x.type == "SetBeatsPerMinute" && x.beat == 1 && x.bar == 1)
                startBPM = firstBPMChange ? +firstBPMChange.beatsPerMinute : startBPM
                song.offset -= (60 / startBPM * (songTotalBeat-1) * 1000)
                chart.actions.push({beat: songTotalBeat, type: "bpm", val: song.bpm})
            }
            else if (!song) song = { bpm: startBPM, offset: 0, volume: 100 }
            else startBPM = song.bpm

            // player row changes
            let rowChanges = rdLevel.events.filter(x => x.active !== false && x.playerMode == ( chartSettings.twoPlayer ? "TwoPlayer" : "OnePlayer") && x.type == "ChangePlayersRows")
            rowChanges.forEach(x => x.trueBeat = getTotalBeat(x.beat, x.bar))
            rowChanges = rowChanges.sort(function(a, b){return b.trueBeat - a.trueBeat});

            // check which player hits the beat
            function checkPlayerBeat(row, beat) {
                let foundRow = rdLevel.rows.find(x => x.row == row)
                if (!foundRow) return "P1"
                let initialRow = foundRow.player
                let foundChange = rowChanges.find(c => (c.trueBeat <= beat) && c.players[row] != "NoChange")
                return foundChange ? foundChange.players[row] : initialRow
            }

            // silent (x) beats
            let silentBeats = []
            let specialPatterns = { "ThreeBeat": "-xx-xx", "FourBeat": "-x-x-x" }
            rdLevel.events.filter(x => x.active !== false && x.type == "SetRowXs").forEach(x => { // haha x get it
                silentBeats.push({ beat: getTotalBeat(x.beat, x.bar), row: x.row, pattern: x.pattern.split("") })
            })
            rdLevel.events.filter(x => x.active !== false && x.type == "AddClassicBeat" && x.setXs && specialPatterns[x.setXs]).forEach(x => { // held beats can change the X pattern too!
                silentBeats.push({ beat: getTotalBeat(x.beat, x.bar), row: x.row, pattern: specialPatterns[x.setXs].split("") })
            })
            silentBeats = silentBeats.sort(function(a, b){return b.beat - a.beat});
            
            // check for silent beat
            function checkSilentBeat(row, beat, pulse) {
                if (pulse >= 6) return false
                let foundXPattern = silentBeats.find(x => x.row == row && x.beat <= beat)
                return (foundXPattern && foundXPattern.pattern[pulse] == "x")
            }

            chart.metadata = {
                "name": rdLevel.settings.song || gameChart.filename.replace(/.\w+$/, ""),
                "filename": providedSong.name || "",
                "bpm": startBPM,
                "subdivision": 4,
                "offset": song.offset,
                "volume": song.volume
            }

            if (chartSettings.cpupulses && (chartSettings.classicpulses || chartSettings.oneshotpulses)) {
                chart.metadata.cpuClap = "shaker";
            }

            let freetimes = []

            rdLevel.events.filter(x => x.active !== false).forEach(x => { 
                let trueBeat = toSafe(getTotalBeat(x.beat, x.bar)) // round to nearest 192nd

                function addRDNote(pos, pulse) {
                    let isPulse = (pulse !== undefined && pulse < 6)
                    if (isPulse && pulse >= 0 && checkSilentBeat(x.row, pos, pulse)) return
                    let playerBeat = checkPlayerBeat(x.row, pos)
                    let noteType = (chartSettings.twoPlayer && playerBeat == "P2") ? "+" : "o"
                    let isCPUHit = playerBeat == "CPU" || (chartSettings.cpupulses && isPulse)
                    if (isCPUHit && isPulse) {
                        if (!chartSettings.twoPlayer) noteType = ">"
                        else noteType = playerBeat == "P2" ? ">" : "<"
                    }
                    return addNote(pos, noteType, isCPUHit)
                }

                switch (x.type) {
                    
                    case "AddOneshotBeat":
                        let loopCount = (x.loops || 0) + 1
                        if (!x.tick) x.tick = 0

                        for (let loop=0; loop < loopCount; loop++) {

                            let oneshotBeat = trueBeat + (loop * (x.interval || 0))

                            // freezeshot
                            if (x.interval > 0 && x.delay > 0) {
                                addRDNote(oneshotBeat + x.interval)
                                if (chartSettings.oneshotpulses) addRDNote(oneshotBeat + (x.interval - x.tick - x.delay), -1) // whoa
                            }

                            // normal oneshot
                            else {
                                addRDNote(oneshotBeat + x.tick)
                                if (chartSettings.oneshotpulses) addRDNote(oneshotBeat, -1)
                            }
                        }
                        break;

                    case "AddClassicBeat":
                        // for each pulse (or just last if classicpulses is off)
                        for (let i=(chartSettings.classicpulses ? 0 : 6); i<=6; i++) {
                            let pulseBeat = trueBeat + (x.tick * i)
                            if ([1, 3, 5].includes(i) && x.swing > 0) pulseBeat += (x.tick - Math.min(x.swing, x.tick * 2))
                            addRDNote(pulseBeat, i)               
                            if (x.hold > 0 && chartSettings.releases) addRDNote(pulseBeat + x.hold, i)
                        }   
                        break;

                    case "AddFreeTimeBeat":
                        let shouldChart = chartSettings.classicpulses || x.pulse == 6
                        if (shouldChart) bombBeatsEnabled && x.pulse == 6 ? addNote(trueBeat, "x") : addRDNote(trueBeat, x.pulse)
                        if (x.hold > 0 && chartSettings.releases && shouldChart) addRDNote(trueBeat + x.hold, x.pulse)
                        if (x.pulse < 6) freetimes.push({ row: x.row, pulse: x.pulse })
                        break;

                    case "PulseFreeTimeBeat":
                        if (x.action == "Remove") return freetimes = freetimes.filter(f => f.row != x.row)
                        freetimes.forEach(f => {
                            if (f.row != x.row) return
                            switch (x.action) {
                                case "Increment": f.pulse += 1; break;
                                case "Decrement": f.pulse -= 1; break;
                                case "Custom": f.pulse = x.customPulse; break;
                            }
                            let shouldChartPulse = chartSettings.classicpulses || f.pulse >= 6
                            if (shouldChartPulse) addRDNote(trueBeat, f.pulse)
                            if (f.hold > 0 && chartSettings.releases && shouldChartPulse) addRDNote(trueBeat + f.hold, f.pulse)
                            if (f.pulse < 0) f.pulse = 0
                        })
                        freetimes = freetimes.filter(f => f.pulse < 6)
                        break;

                    case "SetBeatsPerMinute":
                        chart.actions.push({beat: trueBeat, type: "bpm", val: x.beatsPerMinute})
                }
            })
            break;


        case "fnf":
            let fnfChart = gameChart.chart.song
            let bpm = fnfChart.bpm // todo: support changes
            let offset = +chartSettings.offset || 0

            chart.metadata = {
                "name": gameChart.filename.replace(/.\w+$/, ""),
                "filename": providedSong.name || "",
                "bpm": bpm,
                "subdivision": 8,
                "offset": offset
            }

            let currentBPM = bpm
            let currentStepBeat = 1

            fnfChart.notes.forEach(x => { 

                let isAuto = !x.mustHitSection

                if (x.changeBPM) {
                    currentBPM = x.bpm
                    chart.actions.push({ "beat": currentStepBeat, "type": "bpm", "val": x.bpm })
                }
                currentStepBeat += (x.lengthInSteps / 4)
            
                x.sectionNotes.forEach(note => {
                    let [noteTime, noteIndex, holdTime] = note
                    let autoNote = isAuto

                    // if index is > 3, invert cpu/player??
                    while (noteIndex > 3) {
                        autoNote = !autoNote
                        noteIndex -= 4
                    }

                    let barLength = 60 / currentBPM
                    let noteSecs = (noteTime - offset) / 1000
                    let beat = (noteSecs / barLength) + 1
                    beat = toSafe(beat, 4)
            
                    let arrow = chartSettings.useclaps ? "o" : arrowDirections[noteIndex]
                    if (chartSettings.nocpu) autoNote = false
                    addNote(beat, arrow, autoNote)

                    if (chartSettings.releases && holdTime > 0) {
                        let releaseBeat = ((noteSecs + (holdTime / 1000)) / barLength) + 1
                        releaseBeat = toSafe(releaseBeat, 4)
                        if (releaseBeat != beat) addNote(releaseBeat, arrow, autoNote)
                    }
                })
            })

            break;
        

        case "sm":
            let smChart = gameChart.chart
            let bpmChanges = smChart.match(/#BPMS:((.|\n)+?);/)[1]
            if (!bpmChanges) throw new Error("No BPM!")
            bpmChanges = bpmChanges.replace(/\s/g, "").split(",").map(x => x.split("=")).map(n => ({beat: +n[0], bpm: +n[1]}))
            bpmChanges.forEach(x => {
                if (x.beat > 0) chart.actions.push({ "beat": x.beat, "type": "bpm", "val": x.bpm })
            })

            chart.metadata = {
                "name": (smChart.match(/^#TITLE:(.+?);$/m) || [])[1],
                "filename": providedSong.name || "",
                "bpm": bpmChanges.find(x => x.beat == 0).bpm,
                "subdivision": 8,
                "offset": Number(smChart.match(/^#OFFSET:(.+?);$/m)[1]) * -1000
            }

            let smDifficulties = smChart.split("#NOTES").slice(1)
            let noteInfo = smDifficulties.find(x => ("#NOTES" + x).match(smDifficultyRegex)[2] == chartSettings.difficulty)
            if (!noteInfo) throw new Error("Invalid difficulty!")
            else noteInfo = noteInfo.split(":")

            let noteData = noteInfo[noteInfo.length - 1].split(",").map(x => x.split("\n").map(x => x.trim()).filter(x => x.length > 2 && !x.startsWith("//")))
            
            noteData.forEach((m, measureNumber) => {
                let totalNotes = m.length
                if (totalNotes % 4 > 0) return
                let subdivSize = totalNotes / 4
                m.forEach((notes, index) => {
                    let beatNumber = Math.floor(index / subdivSize)
                    let subBeat = (index - (subdivSize * beatNumber)) / subdivSize
                    beatNumber = toSafe((measureNumber * 4) + beatNumber + subBeat + 1)
                    notes.split("").forEach((n, p) => {
                        let arrow = chartSettings.useclaps ? "o" : arrowDirections[p]
                        switch (n) {
                            case "1": addNote(beatNumber, arrow); break;
                            case "2": addNote(beatNumber, arrow); break;
                            case "3": if (chartSettings.releases) addNote(beatNumber, arrow); break;
                            case "4": addNote(beatNumber, arrow); break;
                            case "M": addNote(beatNumber, "x", true); break;
                            case "F": addNote(beatNumber, arrow, true); break;
                        }
                    })
                })
            })
            break;
    }
    
    chart.notes = chart.notes.filter(x => !x.auto || (x.auto && !chart.notes.find(z => !z.auto && z.beat == x.beat)) ) // remove auto overlaps
    
    let subdivCounter = {}
    chart.notes.forEach(x => {
        let foundSubdiv = commonSubdivBeats[toSafe((x.beat) - Math.floor(x.beat))]
        if (foundSubdiv) {
            if (!subdivCounter[foundSubdiv]) subdivCounter[foundSubdiv] = 1
            else subdivCounter[foundSubdiv]++
        }
    })

    let foundLargest = Object.keys(subdivCounter).sort((a, b) => b - a).find(x => subdivCounter[x] / chart.notes.length > 0.05) // pick largest subdiv that >5% of notes use
    if (foundLargest) chart.metadata.subdivision = +foundLargest  

    game = game = newGame(chart, providedSong.data)
    gameChart = null

    } // end of try

    catch(e) {
        console.error(e)
        alert("There was an error while trying to convert this chart!\n" + e)
        $('#loadingMenu').hide()
        gameChart = null
    }

}

// there's DEFINITELY a better, more mathematical way to do this
// but i don't know what it is
// please @ me on twitter if you have a better solution and also yell at me for being stupid
let commonSubdivBeats = {0: 2, 1: 2}
let commonSubdivs = [2, 3, 4, 6, 8, 12, 16, 32]
commonSubdivs.forEach(s => {
    for (let n=1; n<s; n++) {
        let amount = toSafe(n / s)
        if (!commonSubdivBeats[amount]) commonSubdivBeats[amount] = s
    }
})