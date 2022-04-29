function keyDown(e) {
    if (!e.key || $('input').is(":focus")) return // cancel if focused on textbox
    let key = e.key.toLowerCase()

    if (e.repeat) return key == " " ? e.preventDefault() : null // ignore holding keys down, also prevent space scrolling
    let activePopup = $('.popup:visible').length

    if (key == "enter" && !activePopup && (game.paused || !game.active)) game.start(game.editor.firstSelected() || 1) // editor playtest
    else if (game.active && ["enter", "escape", "p"].includes(key)) return game.restart() // editor reset
    else if (key == "escape") return activePopup ? $('.popup:not(.importantPopup)').hide() : game.editor.deselectAll()
    else if (e.ctrlKey && key == "s") { e.preventDefault(); $(e.shiftKey ? '#exportBtn' : '#saveBtn').trigger('click'); return false }
    else if (e.ctrlKey && key == "o") { e.preventDefault(); $('#uploadButton').trigger('click'); return false }

    // trigger notes and other stuff
    switch (key.toLowerCase()) {
        case "arrowup": return presskey(e, "^")
        case "arrowright": return presskey(e, ">")
        case "arrowleft": return presskey(e, "<")
        case "arrowdown": return presskey(e, "v")
        case " ": case ".": case ",": return presskey(e, "o")
        case "x": return presskey(e, "x", true)
        case "=": return presskey(e, "+", true)
        case "+": return presskey(e, "+o", true)

        case "delete": case "backspace": return presskey(e, "-", true)
        case "a": return $('#toggleAutoplay').trigger('click')
        case "m": return $('#toggleMetronome').trigger('click')
        case "b": return activePopup ? null : $('.bpmShortcut:visible').focus()
        case "d": return activePopup ? null : $('.divideShortcut:visible').focus()
        case "e": return toggleChartVisiblity()
    }
}

// do stuff on cetain key presses
function presskey(e, key, editorOnly) {
    let gameRunning = game.active && !game.paused
    e.preventDefault();
    if (!CONFIG.autoplay && !editorOnly && gameRunning) game.checkHit(key)
    else if (!gameRunning && game.editor.selectedBeats.length) game.editor.setManyNotes(key)

    if (e.ctrlKey && gameRunning) {
        // live charting
        let currentSecs = game.conductor.getBeatFromSecs(game.conductor.songPos() - 0.1)
        game.editor.setNote(key, currentSecs, true)
    }
}

// trigger input handler
document.addEventListener('keydown', function(e) { keyDown(e) });