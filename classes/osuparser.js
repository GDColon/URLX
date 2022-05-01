/*
 * Not an actual osu parser, just for the URLX
 * based on https://github.com/nojhamster/osu-parser/
 */

/**
 * @typedef {Object} OsuData
 *
 *
 * @property {String} title title of the song
 * @property {String} artist
 * @property {String} creator creator of the song
 * @property {String} difficulty
 *
 * @property {String} audioFilename
 * @property {("osu!"|"osu!taiko"|"osu!catch"|"osu!mania")} mode
 */

/**
 * @typedef {Object} HitObject
 * @property {Number} time position in seconds
 */

/**
 * Hit object typedef for in-class use
 * @typedef {Object} HitObjectPriv
 * @property {Number} time position in miliseconds
 *
 * Position is to do, I was thinking about something like:
 * If position is at the top then it will be up arrow
 * If position is close to the center then it will be space
 * But I don't have time for that shit :)
 * @property {Number} x x position of the object (in-game range is 0-640)
 * @property {Number} y x position of the object (in-game range is 0-480)
 */

/**
 * @typedef {Object} TimingPoint
 */

/**
 * Timing point typedef for in-class use
 * @typedef {Object} TimingPointPriv
 * @property {Number} time position in miliseconds
 * @property {Number} beatLength
 */

const sectionReg = /^\[([a-zA-Z0-9]+)\]$/;
const keyValReg = /^([a-zA-Z0-9]+)[ ]*:[ ]*(.+)$/;
class OsuParser {
    /**
     * @public
     * Parses osu string and gives you nice js object (I mean, what could I write here)
     *
     * @param {String} osuString osu string to parse
     * @returns {OsuData} parsed osu data
     */
    static Parse(osuString) {
        const parser = new OsuParser();

        osuString.split(/[\n\r]+/).forEach((line) => {
            parser.readLine(line);
        });

        return parser.data();
    }

    /**
     * @private
     * Gets the actual data from class
     *
     * @returns {OsuData}
     */
    data() {
        let mode = "osu!";
        switch (this.otherValues.general?.Mode) {
            case "0":
                mode = "osu!";
                break;
            case "1":
                mode = "osu!taiko";
                break;
            case "2":
                mode = "osu!catch";
                break;
            case "3":
                mode = "osu!mania";
                break;
        }

        return {
            title: this.otherValues.metadata?.Title,
            artist: this.otherValues.metadata?.Artist,
            creator: this.otherValues.metadata?.Creator,
            difficulty: this.otherValues.metadata?.Version,
            audioFilename: this.otherValues.general?.AudioFilename,
            mode: mode,
        };
    }

    /**
     * @private
     * Parses hit object line and adds it to list
     *
     * @param {String} line
     */
    parseHitObject(line) {
        const splitted = line.split(",");
        const hitObject = {
            x: parseInt(splitted[0]),
            y: parseInt(splitted[1]),
            time: parseInt(splitted[2]),
        };

        this.hitObjects.push(hitObject);
    }

    /**
     * @private
     * Parses timing point line and adds it to list
     *
     * @param {String} line
     */
    parseTimingPoint(line) {
        const splitted = line.split(",");
        const timingPoint = {
            time: parseInt(splitted[0]),
            beatLength: parseFloat(splitted[1]),
            timingChange: splitted[6] == 1,
        };

        if (!isNaN(timingPoint.beatLength) && timingPoint.beatLength !== 0) {
            if (timingPoint.beatLength > 0) {
            } else {
                // If negative, beatLength is a velocity factor
                timingPoint.velocity = Math.abs(100 / timingPoint.beatLength);
            }
        }

        this.timingObjects.push(timingPoint);
    }

    /**
     * @private
     * Reads line from osu file
     *
     * @param {String} line line to read
     */
    readLine(line) {
        line = line.trim();
        if (!line) return;

        const match = sectionReg.exec(line);
        if (match) {
            this.section = match[1].toLowerCase();
            if (!(this.section in this.otherValues)) {
                this.otherValues[this.section] = {};
            }
            return;
        }

        switch (this.section) {
            case "hitobjects":
                this.parseHitObject(line);
                break;
            case "timingpoints":
                this.parseTimingPoint(line);
                break;

            default:
                const dMatch = keyValReg.exec(line);
                if (dMatch) {
                    if (this.section in this.otherValues)
                        this.otherValues[this.section][dMatch[1]] = dMatch[2];
                    else this.otherValues[dMatch[1]] = dMatch[2];
                }
        }
    }

    /**
     * @private
     * Osu section (like "General" or "Metadata")
     *
     * @type {String}
     */
    section;

    /**
     * @private
     * @type {HitObjectPriv[]}
     */
    hitObjects = [];

    /**
     * @private
     * @type {TimingPointPriv[]}
     */
    timingObjects = [];

    /**
     * @private
     */
    otherValues = {};
}
