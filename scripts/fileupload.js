$("#chartFile").on("change", function (e) {
    if (!e.target.files.length) return
    loadFromZip(e.target.files[0])
    $(this).val("")
})

$("#songUpload").on("change", function (e) {
    if (!e.target.files.length) return
    game.editor.setSong(e.target.files[0])
    $(this).val("")
})

$('.dragBox').on('dragover dragenter', function(e) {
    $('.dragBox').addClass('dragOver')
    e.preventDefault();
    e.stopPropagation();
})

$('.dragBox').on('dragleave dragend drop', function(e) {
    $('.dragBox').removeClass('dragOver')
    e.preventDefault();
    e.stopPropagation();
})

$('#zipUpload').on('drop', function(e){
    if (e.originalEvent.dataTransfer){
        if (e.originalEvent.dataTransfer.files.length) {
            e.preventDefault();
            e.stopPropagation();
            loadFromZip(e.originalEvent.dataTransfer.files[0])
        }   
    }
});

function progress(msg) {
    $('#loadingStatus').text(msg)
    // console.log(msg)
}

function oopsie(err) {
    alert("Error!")
    progress("Error!")
    console.error(err)
}

function loadFromZip(zipFile) {
    progress("Unzipping...")
    $("#uploadPopup").hide()
    $("#loadingMenu").show()
    JSZip.loadAsync(zipFile).then(zip => {
        progress("Preparing JSON...")
        let foundChart = zip.file(/.+\.(json|urlx)/gi)
        if (!foundChart.length) return oopsie("No JSON")
        else foundChart[0].async("string").then(json => {
            try {
                json = JSON.parse(json)
                let foundSong = zip.file(json.metadata.filename)
                progress("Preparing music...")
                if (!foundSong) return oopsie("No song")
                else foundSong.async("base64").then(song => {
                    progress("Loading music...")
                    let dataURL = `data:audio/ogg;base64,${song}`
                    game = newGame(json, dataURL)
                    $('.popup').hide()
                })
            }
            catch(e) { return oopsie(err) }
        })

    }).catch(err => {
        oopsie(err)
    })
}

function loadFromFolder() {
    if (!browserDoesntSuck) return alert("Your browser doesn't support folder loading! Switch to a supported browser (Chrome, Edge, etc) or load from a zip file.")
    let openOptions = {types: [{description: "JSON Chart file", accept: {"application/json": [".urlx", ".json"]}}, {description: "Zip file", accept: {"application/zip": [".urlzip", ".zip"]}}] }
    
    window.showDirectoryPicker().then(async chartDir => {

        $("#uploadPopup").hide()
        $("#loadingMenu").show()

        let urlevel = await window.showOpenFilePicker(openOptions)
        let chart = urlevel[0]
        if (!chart) return
        let dirStuff = await chartDir.resolve(chart);
        if (!dirStuff || dirStuff[0] != chart.name) return alert("Error! Chart not in directory!") // check if file is actually in directory

        let chartData = await chart.getFile()
        
        if (chart.name.match(/\.(url)?zip$/)) return loadFromZip(chartData) // if zip file is selected for some reason

        let reader = new FileReader()
        reader.onload = async function() {
            let chartJSON = JSON.parse(reader.result)
            let foundSong = await chartDir.getFileHandle(chartJSON.metadata.filename).catch(() => {})

            if (foundSong) {
                let songData = await foundSong.getFile()
                let songReader = new FileReader()
                songReader.onload = async function() {
                    game = newGame(chartJSON, songReader.result.replace("data:video", "data:audo"), chartDir)
                }
                songReader.readAsDataURL(songData)
            }
            else game = newGame(chartJSON, null, chartDir)

            $('.popup').hide()
        }
        reader.readAsText(chartData)
    }).catch(() => {})
}