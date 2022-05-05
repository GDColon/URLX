// TODO adofai json fixer

/**
 * @typedef {Object} Action
 * @property {"SetSpeed"|"Twirl"} eventType
 * @property {Number} floor
 * 
 * SPEED
 * @property {"Multiplier"|"Bpm"} speedType
 * @property {Number} beatsPerMinute
 * @property {Number} bpmMultiplier
 */

/**
 * @typedef {Object} Settings
 * @property {String} song
 * @property {Number} bpm
 */

/**
 * @typedef {Object} AdofaiLevel
 * @property {?Number[]} angleData
 * @property {?String} pathData
 * @property {Settings} settings
 * @property {Action[]} actions
 */

/**
 * @typedef {Object} AdofaiEvent
 * @property {Number} time time in miliseconds
 * @property {Number} angleChange angle difference to previous beat
 * @property {?Number} bpm If it's not null, then it's bpm change
 */

/**
 * @typedef {Object} AdofaiData
 * @property {AdofaiEvent[]} events
 * @property {Settings} settings
 */

/**
 * Reads adofai string
 *
 * @param {String} adofaiString adofai string
 * @returns {AdofaiData}
 */
const ReadAfodaiString = (adofaiString) => {
    const angles = {
        U: 90,
        R: 180,
        L: 360,
        D: 270,
        E: 135,
        C: 225,
        Q: 45,
        Z: 315,
        H: 30,
        G: 60,
        T: 120,
        J: 150,
        M: 210,
        B: 240,
        F: 300,
        N: 330
    };

    /**
     * @type {AdofaiLevel}
     * @returns {Number} times in miliseconds
     */
    const data = JSON.parse(adofaiString);

    let prevAngle = 0;
    let bpm = data.settings.bpm;

    if (!data.angleData) {
        const pathData = data.pathData.split("");
        data.angleData = pathData.map(val => angles[val]);
    }

    const events = data.angleData.map((angle, index) => {
        let wasBpmChanged = false;
        let angleChange = Math.abs(prevAngle - angle + 540) % 360;

        const supportedActions = ["SetSpeed", "Twirl"];
        data.actions.filter(action => action.floor === index && supportedActions.includes(action.eventType)).forEach(action => {
            switch(action.eventType) {
                case "SetSpeed": {
                    wasBpmChanged = true;
                    if (!action.speedType || action.speedType === "Bpm") {
                        bpm = action.beatsPerMinute;
                        break;
                    }
                    bpm *= action.bpmMultiplier;
                    break;
                }
                case "Twirl": {
                    angleChange = 360 - angleChange;
                    break;
                }
            }
        });
        if (angleChange == 0) angleChange = 360;

        const milis = (1000 * angleChange) / (3 * bpm);

        prevAngle = angle;
        return {
            time: milis,
            angleChange,
            bpm: wasBpmChanged ? bpm : null
        };
    });

    return {
        events,
        settings: data.settings
    }
};
