/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import log from "../../log";
import arrayFind from "../../utils/array_find";
import arrayIncludes from "../../utils/array_includes";
import normalizeLanguage from "../../utils/languages";
import SortedList from "../../utils/sorted_list";
import takeFirstSet from "../../utils/take_first_set";
function normalizeAudioTracks(tracks) {
    return tracks.map(function (t) { return t == null ?
        t :
        { normalized: normalizeLanguage(t.language),
            audioDescription: t.audioDescription }; });
}
function normalizeTextTracks(tracks) {
    return tracks.map(function (t) { return t == null ?
        t :
        { normalized: normalizeLanguage(t.language),
            closedCaption: t.closedCaption }; });
}
/**
 * Manage audio and text tracks for all active periods.
 * Chose the audio and text tracks for each period and record this choice.
 * @class TrackManager
 */
var TrackManager = /** @class */ (function () {
    /**
     * @param {BehaviorSubject<Array.<Object|null>>} preferredAudioTracks - Array
     * of audio track preferences
     * @param {BehaviorSubject<Array.<Object|null>>} preferredAudioTracks - Array
     * of text track preferences
     */
    function TrackManager(defaults) {
        var preferredAudioTracks = defaults.preferredAudioTracks, preferredTextTracks = defaults.preferredTextTracks;
        this._periods = new SortedList(function (a, b) { return a.period.start - b.period.start; });
        this._audioChoiceMemory = new WeakMap();
        this._textChoiceMemory = new WeakMap();
        this._videoChoiceMemory = new WeakMap();
        this._preferredAudioTracks = preferredAudioTracks;
        this._preferredTextTracks = preferredTextTracks;
    }
    /**
     * Add Subject to choose Adaptation for new "audio" or "text" Period.
     * @param {string} bufferType - The concerned buffer type
     * @param {Period} period - The concerned Period.
     * @param {Subject.<Object|null>} adaptation$ - A subject through which the
     * choice will be given
     */
    TrackManager.prototype.addPeriod = function (bufferType, period, adaptation$) {
        var _a;
        var periodItem = getPeriodItem(this._periods, period);
        var adaptations = period.adaptations[bufferType];
        if (adaptations == null) {
            adaptations = [];
        }
        if (periodItem != null) {
            if (periodItem[bufferType] != null) {
                log.warn("TrackManager: " + bufferType + " already added for period", period);
                return;
            }
            else {
                periodItem[bufferType] = { adaptations: adaptations, adaptation$: adaptation$ };
            }
        }
        else {
            this._periods.add((_a = { period: period }, _a[bufferType] = { adaptations: adaptations, adaptation$: adaptation$, }, _a));
        }
    };
    /**
     * Remove Subject to choose an "audio", "video" or "text" Adaptation for a
     * Period.
     * @param {string} bufferType - The concerned buffer type
     * @param {Period} period - The concerned Period.
     */
    TrackManager.prototype.removePeriod = function (bufferType, period) {
        var periodIndex = findPeriodIndex(this._periods, period);
        if (periodIndex == null) {
            log.warn("TrackManager: " + bufferType + " not found for period", period);
            return;
        }
        var periodItem = this._periods.get(periodIndex);
        if (periodItem[bufferType] == null) {
            log.warn("TrackManager: " + bufferType + " already removed for period", period);
            return;
        }
        delete periodItem[bufferType];
        if (periodItem.audio == null &&
            periodItem.text == null &&
            periodItem.video == null) {
            this._periods.removeElement(periodItem);
        }
    };
    TrackManager.prototype.resetPeriods = function () {
        while (this._periods.length() > 0) {
            this._periods.pop();
        }
    };
    /**
     * Update the choice of all added Periods based on:
     *   1. What was the last chosen adaptation
     *   2. If not found, the preferences
     */
    TrackManager.prototype.update = function () {
        this._updateAudioTrackChoices();
        this._updateTextTrackChoices();
        this._updateVideoTrackChoices();
    };
    /**
     * Emit initial audio Adaptation through the given Subject based on:
     *   - the preferred audio tracks
     *   - the last choice for this period, if one
     * @param {Period} period - The concerned Period.
     */
    TrackManager.prototype.setInitialAudioTrack = function (period) {
        var periodItem = getPeriodItem(this._periods, period);
        var audioInfos = periodItem != null ? periodItem.audio :
            null;
        if (audioInfos == null || periodItem == null) {
            throw new Error("TrackManager: Given Period not found.");
        }
        var preferredAudioTracks = this._preferredAudioTracks.getValue();
        var audioAdaptations = period.adaptations.audio === undefined ?
            [] :
            period.adaptations.audio;
        var chosenAudioAdaptation = this._audioChoiceMemory.get(period);
        if (chosenAudioAdaptation === null) {
            // If the Period was previously without audio, keep it that way
            audioInfos.adaptation$.next(null);
        }
        else if (chosenAudioAdaptation === undefined ||
            !arrayIncludes(audioAdaptations, chosenAudioAdaptation)) {
            // Find the optimal audio Adaptation
            var normalizedTracks = normalizeAudioTracks(preferredAudioTracks);
            var optimalAdaptation = findFirstOptimalAudioAdaptation(audioAdaptations, normalizedTracks);
            this._audioChoiceMemory.set(period, optimalAdaptation);
            audioInfos.adaptation$.next(optimalAdaptation);
        }
        else {
            audioInfos.adaptation$.next(chosenAudioAdaptation); // set last one
        }
    };
    /**
     * Emit initial text Adaptation through the given Subject based on:
     *   - the preferred text tracks
     *   - the last choice for this period, if one
     * @param {Period} period - The concerned Period.
     */
    TrackManager.prototype.setInitialTextTrack = function (period) {
        var periodItem = getPeriodItem(this._periods, period);
        var textInfos = periodItem != null ? periodItem.text :
            null;
        if (textInfos == null || periodItem == null) {
            throw new Error("TrackManager: Given Period not found.");
        }
        var preferredTextTracks = this._preferredTextTracks.getValue();
        var textAdaptations = period.adaptations.text === undefined ?
            [] :
            period.adaptations.text;
        var chosenTextAdaptation = this._textChoiceMemory.get(period);
        if (chosenTextAdaptation === null) {
            // If the Period was previously without text, keep it that way
            textInfos.adaptation$.next(null);
        }
        else if (chosenTextAdaptation === undefined ||
            !arrayIncludes(textAdaptations, chosenTextAdaptation)) {
            // Find the optimal text Adaptation
            var normalizedTracks = normalizeTextTracks(preferredTextTracks);
            var optimalAdaptation = findFirstOptimalTextAdaptation(textAdaptations, normalizedTracks);
            this._textChoiceMemory.set(period, optimalAdaptation);
            textInfos.adaptation$.next(optimalAdaptation);
        }
        else {
            textInfos.adaptation$.next(chosenTextAdaptation); // set last one
        }
    };
    /**
     * Emit initial video Adaptation through the given Subject based on:
     *   - the preferred video tracks
     *   - the last choice for this period, if one
     * @param {Period} period - The concerned Period.
     */
    TrackManager.prototype.setInitialVideoTrack = function (period) {
        var periodItem = getPeriodItem(this._periods, period);
        var videoInfos = periodItem != null ? periodItem.video :
            null;
        if (videoInfos == null || periodItem == null) {
            throw new Error("TrackManager: Given Period not found.");
        }
        var videoAdaptations = period.adaptations.video === undefined ?
            [] :
            period.adaptations.video;
        var chosenVideoAdaptation = this._videoChoiceMemory.get(period);
        if (chosenVideoAdaptation === null) {
            // If the Period was previously without video, keep it that way
            videoInfos.adaptation$.next(null);
        }
        else if (chosenVideoAdaptation === undefined ||
            !arrayIncludes(videoAdaptations, chosenVideoAdaptation)) {
            var optimalAdaptation = videoAdaptations[0];
            this._videoChoiceMemory.set(period, optimalAdaptation);
            videoInfos.adaptation$.next(optimalAdaptation);
        }
        else {
            videoInfos.adaptation$.next(chosenVideoAdaptation); // set last one
        }
    };
    /**
     * Set audio track based on the ID of its adaptation for a given added Period.
     * @param {Period} period - The concerned Period.
     * @param {string} wantedId - adaptation id of the wanted track
     */
    TrackManager.prototype.setAudioTrackByID = function (period, wantedId) {
        var periodItem = getPeriodItem(this._periods, period);
        var audioInfos = periodItem != null ? periodItem.audio :
            null;
        if (audioInfos == null) {
            throw new Error("TrackManager: Given Period not found.");
        }
        var wantedAdaptation = arrayFind(audioInfos.adaptations, function (_a) {
            var id = _a.id;
            return id === wantedId;
        });
        if (wantedAdaptation === undefined) {
            throw new Error("Audio Track not found.");
        }
        var chosenAudioAdaptation = this._audioChoiceMemory.get(period);
        if (chosenAudioAdaptation === wantedAdaptation) {
            return;
        }
        this._audioChoiceMemory.set(period, wantedAdaptation);
        audioInfos.adaptation$.next(wantedAdaptation);
    };
    /**
     * Set text track based on the ID of its adaptation for a given added Period.
     * @param {Period} period - The concerned Period.
     * @param {string} wantedId - adaptation id of the wanted track
     */
    TrackManager.prototype.setTextTrackByID = function (period, wantedId) {
        var periodItem = getPeriodItem(this._periods, period);
        var textInfos = periodItem != null ? periodItem.text :
            null;
        if (textInfos == null) {
            throw new Error("TrackManager: Given Period not found.");
        }
        var wantedAdaptation = arrayFind(textInfos.adaptations, function (_a) {
            var id = _a.id;
            return id === wantedId;
        });
        if (wantedAdaptation === undefined) {
            throw new Error("Text Track not found.");
        }
        var chosenTextAdaptation = this._textChoiceMemory.get(period);
        if (chosenTextAdaptation === wantedAdaptation) {
            return;
        }
        this._textChoiceMemory.set(period, wantedAdaptation);
        textInfos.adaptation$.next(wantedAdaptation);
    };
    /**
     * Set video track based on the ID of its adaptation for a given added Period.
     * @param {Period} period - The concerned Period.
     * @param {string} wantedId - adaptation id of the wanted track
     *
     * @throws Error - Throws if the period given has not been added
     * @throws Error - Throws if the given id is not found in any video adaptation
     * of the given Period.
     */
    TrackManager.prototype.setVideoTrackByID = function (period, wantedId) {
        var periodItem = getPeriodItem(this._periods, period);
        var videoInfos = periodItem != null ? periodItem.video :
            null;
        if (videoInfos == null) {
            throw new Error("LanguageManager: Given Period not found.");
        }
        var wantedAdaptation = arrayFind(videoInfos.adaptations, function (_a) {
            var id = _a.id;
            return id === wantedId;
        });
        if (wantedAdaptation === undefined) {
            throw new Error("Video Track not found.");
        }
        var chosenVideoAdaptation = this._videoChoiceMemory.get(period);
        if (chosenVideoAdaptation === wantedAdaptation) {
            return;
        }
        this._videoChoiceMemory.set(period, wantedAdaptation);
        videoInfos.adaptation$.next(wantedAdaptation);
    };
    /**
     * Disable the current text track for a given period.
     *
     * @param {Period} period - The concerned Period.
     *
     * @throws Error - Throws if the period given has not been added
     */
    TrackManager.prototype.disableTextTrack = function (period) {
        var periodItem = getPeriodItem(this._periods, period);
        var textInfos = periodItem != null ? periodItem.text :
            null;
        if (textInfos == null) {
            throw new Error("TrackManager: Given Period not found.");
        }
        var chosenTextAdaptation = this._textChoiceMemory.get(period);
        if (chosenTextAdaptation === null) {
            return;
        }
        this._textChoiceMemory.set(period, null);
        textInfos.adaptation$.next(null);
    };
    /**
     * Returns an object describing the chosen audio track for the given audio
     * Period.
     *
     * Returns null is the the current audio track is disabled or not
     * set yet.
     *
     * @param {Period} period - The concerned Period.
     * @returns {Object|null} - The audio track chosen for this Period
     */
    TrackManager.prototype.getChosenAudioTrack = function (period) {
        var periodItem = getPeriodItem(this._periods, period);
        var audioInfos = periodItem != null ? periodItem.audio :
            null;
        if (audioInfos == null) {
            return null;
        }
        var chosenAudioAdaptation = this._audioChoiceMemory.get(period);
        if (chosenAudioAdaptation == null) {
            return null;
        }
        return {
            language: takeFirstSet(chosenAudioAdaptation.language, ""),
            normalized: takeFirstSet(chosenAudioAdaptation.normalizedLanguage, ""),
            audioDescription: chosenAudioAdaptation.isAudioDescription === true,
            id: chosenAudioAdaptation.id,
        };
    };
    /**
     * Returns an object describing the chosen text track for the given text
     * Period.
     *
     * Returns null is the the current text track is disabled or not
     * set yet.
     *
     * @param {Period} period - The concerned Period.
     * @returns {Object|null} - The text track chosen for this Period
     */
    TrackManager.prototype.getChosenTextTrack = function (period) {
        var periodItem = getPeriodItem(this._periods, period);
        var textInfos = periodItem != null ? periodItem.text :
            null;
        if (textInfos == null) {
            return null;
        }
        var chosenTextAdaptation = this._textChoiceMemory.get(period);
        if (chosenTextAdaptation == null) {
            return null;
        }
        return {
            language: takeFirstSet(chosenTextAdaptation.language, ""),
            normalized: takeFirstSet(chosenTextAdaptation.normalizedLanguage, ""),
            closedCaption: chosenTextAdaptation.isClosedCaption === true,
            id: chosenTextAdaptation.id,
        };
    };
    /**
     * Returns an object describing the chosen video track for the given video
     * Period.
     *
     * Returns null is the the current video track is disabled or not
     * set yet.
     *
     * @param {Period} period - The concerned Period.
     * @returns {Object|null} - The video track chosen for this Period
     */
    TrackManager.prototype.getChosenVideoTrack = function (period) {
        var periodItem = getPeriodItem(this._periods, period);
        var videoInfos = periodItem != null ? periodItem.video :
            null;
        if (videoInfos == null) {
            return null;
        }
        var chosenVideoAdaptation = this._videoChoiceMemory.get(period);
        if (chosenVideoAdaptation == null) {
            return null;
        }
        return { id: chosenVideoAdaptation.id,
            representations: chosenVideoAdaptation.representations
                .map(parseVideoRepresentation) };
    };
    /**
     * Returns all available audio tracks for a given Period, as an array of
     * objects.
     *
     * @returns {Array.<Object>}
     */
    TrackManager.prototype.getAvailableAudioTracks = function (period) {
        var periodItem = getPeriodItem(this._periods, period);
        var audioInfos = periodItem != null ? periodItem.audio :
            null;
        if (audioInfos == null) {
            return [];
        }
        var chosenAudioAdaptation = this._audioChoiceMemory.get(period);
        var currentId = chosenAudioAdaptation != null ? chosenAudioAdaptation.id :
            null;
        return audioInfos.adaptations
            .map(function (adaptation) { return ({
            language: takeFirstSet(adaptation.language, ""),
            normalized: takeFirstSet(adaptation.normalizedLanguage, ""),
            audioDescription: adaptation.isAudioDescription === true,
            id: adaptation.id,
            active: currentId == null ? false : currentId === adaptation.id,
        }); });
    };
    /**
     * Returns all available text tracks for a given Period, as an array of
     * objects.
     *
     * @param {Period} period
     * @returns {Array.<Object>}
     */
    TrackManager.prototype.getAvailableTextTracks = function (period) {
        var periodItem = getPeriodItem(this._periods, period);
        var textInfos = periodItem != null ? periodItem.text :
            null;
        if (textInfos == null) {
            return [];
        }
        var chosenTextAdaptation = this._textChoiceMemory.get(period);
        var currentId = chosenTextAdaptation != null ? chosenTextAdaptation.id :
            null;
        return textInfos.adaptations
            .map(function (adaptation) { return ({
            language: takeFirstSet(adaptation.language, ""),
            normalized: takeFirstSet(adaptation.normalizedLanguage, ""),
            closedCaption: adaptation.isClosedCaption === true,
            id: adaptation.id,
            active: currentId == null ? false :
                currentId === adaptation.id,
        }); });
    };
    /**
     * Returns all available video tracks for a given Period, as an array of
     * objects.
     *
     * @returns {Array.<Object>}
     */
    TrackManager.prototype.getAvailableVideoTracks = function (period) {
        var periodItem = getPeriodItem(this._periods, period);
        var videoInfos = periodItem != null ? periodItem.video :
            null;
        if (videoInfos == null) {
            return [];
        }
        var chosenVideoAdaptation = this._videoChoiceMemory.get(period);
        var currentId = chosenVideoAdaptation != null ? chosenVideoAdaptation.id :
            null;
        return videoInfos.adaptations
            .map(function (adaptation) {
            return {
                id: adaptation.id,
                active: currentId === null ? false :
                    currentId === adaptation.id,
                representations: adaptation.representations.map(parseVideoRepresentation),
            };
        });
    };
    TrackManager.prototype._updateAudioTrackChoices = function () {
        var _this = this;
        var preferredAudioTracks = this._preferredAudioTracks.getValue();
        var normalizedTracks = normalizeAudioTracks(preferredAudioTracks);
        var recursiveUpdateAudioTrack = function (index) {
            if (index >= _this._periods.length()) {
                // we did all audio Buffers, exit
                return;
            }
            var periodItem = _this._periods.get(index);
            if (periodItem.audio == null) {
                // No audio Buffer for this period, check next one
                recursiveUpdateAudioTrack(index + 1);
                return;
            }
            var period = periodItem.period, audioItem = periodItem.audio;
            var audioAdaptations = period.adaptations.audio === undefined ?
                [] :
                period.adaptations.audio;
            var chosenAudioAdaptation = _this._audioChoiceMemory.get(period);
            if (chosenAudioAdaptation === null ||
                (chosenAudioAdaptation !== undefined &&
                    arrayIncludes(audioAdaptations, chosenAudioAdaptation))) {
                // Already best audio for this Buffer, check next one
                recursiveUpdateAudioTrack(index + 1);
                return;
            }
            var optimalAdaptation = findFirstOptimalAudioAdaptation(audioAdaptations, normalizedTracks);
            _this._audioChoiceMemory.set(period, optimalAdaptation);
            audioItem.adaptation$.next(optimalAdaptation);
            // previous "next" call could have changed everything, start over
            recursiveUpdateAudioTrack(0);
        };
        recursiveUpdateAudioTrack(0);
    };
    TrackManager.prototype._updateTextTrackChoices = function () {
        var _this = this;
        var preferredTextTracks = this._preferredTextTracks.getValue();
        var normalizedTracks = normalizeTextTracks(preferredTextTracks);
        var recursiveUpdateTextTrack = function (index) {
            if (index >= _this._periods.length()) {
                // we did all text Buffers, exit
                return;
            }
            var periodItem = _this._periods.get(index);
            if (periodItem.text == null) {
                // No text Buffer for this period, check next one
                recursiveUpdateTextTrack(index + 1);
                return;
            }
            var period = periodItem.period, textItem = periodItem.text;
            var textAdaptations = period.adaptations.text === undefined ?
                [] :
                period.adaptations.text;
            var chosenTextAdaptation = _this._textChoiceMemory.get(period);
            if (chosenTextAdaptation === null ||
                (chosenTextAdaptation !== undefined &&
                    arrayIncludes(textAdaptations, chosenTextAdaptation))) {
                // Already best text for this Buffer, check next one
                recursiveUpdateTextTrack(index + 1);
                return;
            }
            var optimalAdaptation = findFirstOptimalTextAdaptation(textAdaptations, normalizedTracks);
            _this._textChoiceMemory.set(period, optimalAdaptation);
            textItem.adaptation$.next(optimalAdaptation);
            // previous "next" call could have changed everything, start over
            recursiveUpdateTextTrack(0);
        };
        recursiveUpdateTextTrack(0);
    };
    TrackManager.prototype._updateVideoTrackChoices = function () {
        var _this = this;
        var recursiveUpdateVideoTrack = function (index) {
            if (index >= _this._periods.length()) {
                // we did all video Buffers, exit
                return;
            }
            var periodItem = _this._periods.get(index);
            if (periodItem.video == null) {
                // No video Buffer for this period, check next one
                recursiveUpdateVideoTrack(index + 1);
                return;
            }
            var period = periodItem.period, videoItem = periodItem.video;
            var videoAdaptations = period.adaptations.video === undefined ?
                [] :
                period.adaptations.video;
            var chosenVideoAdaptation = _this._videoChoiceMemory.get(period);
            if (chosenVideoAdaptation === null ||
                (chosenVideoAdaptation !== undefined &&
                    arrayIncludes(videoAdaptations, chosenVideoAdaptation))) {
                // Already best video for this Buffer, check next one
                recursiveUpdateVideoTrack(index + 1);
                return;
            }
            var optimalAdaptation = videoAdaptations[0];
            _this._videoChoiceMemory.set(period, optimalAdaptation);
            videoItem.adaptation$.next(optimalAdaptation);
            // previous "next" call could have changed everything, start over
            recursiveUpdateVideoTrack(0);
        };
        recursiveUpdateVideoTrack(0);
    };
    return TrackManager;
}());
export default TrackManager;
/**
 * Find an optimal audio adaptation given their list and the array of preferred
 * audio tracks sorted from the most preferred to the least preferred.
 *
 * null if the most optimal audio adaptation is no audio adaptation.
 * @param {Array.<Adaptation>} audioAdaptations
 * @returns {Adaptation|null}
 */
function findFirstOptimalAudioAdaptation(audioAdaptations, preferredAudioTracks) {
    if (audioAdaptations.length === 0) {
        return null;
    }
    var _loop_1 = function (i) {
        var preferredAudioTrack = preferredAudioTracks[i];
        if (preferredAudioTrack === null) {
            return { value: null };
        }
        var foundAdaptation = arrayFind(audioAdaptations, function (audioAdaptation) {
            return takeFirstSet(audioAdaptation.normalizedLanguage, "") === preferredAudioTrack.normalized &&
                (preferredAudioTrack.audioDescription ?
                    audioAdaptation.isAudioDescription === true :
                    audioAdaptation.isAudioDescription !== true);
        });
        if (foundAdaptation !== undefined) {
            return { value: foundAdaptation };
        }
    };
    for (var i = 0; i < preferredAudioTracks.length; i++) {
        var state_1 = _loop_1(i);
        if (typeof state_1 === "object")
            return state_1.value;
    }
    // no optimal adaptation, just return the first one
    return audioAdaptations[0];
}
/**
 * Find an optimal text adaptation given their list and the array of preferred
 * text tracks sorted from the most preferred to the least preferred.
 *
 * null if the most optimal text adaptation is no text adaptation.
 * @param {Array.<Adaptation>} audioAdaptations
 * @returns {Adaptation|null}
 */
function findFirstOptimalTextAdaptation(textAdaptations, preferredTextTracks) {
    if (textAdaptations.length === 0) {
        return null;
    }
    var _loop_2 = function (i) {
        var preferredTextTrack = preferredTextTracks[i];
        if (preferredTextTrack === null) {
            return { value: null };
        }
        var foundAdaptation = arrayFind(textAdaptations, function (textAdaptation) {
            return takeFirstSet(textAdaptation.normalizedLanguage, "") === preferredTextTrack.normalized &&
                (preferredTextTrack.closedCaption ? textAdaptation.isClosedCaption === true :
                    textAdaptation.isClosedCaption !== true);
        });
        if (foundAdaptation !== undefined) {
            return { value: foundAdaptation };
        }
    };
    for (var i = 0; i < preferredTextTracks.length; i++) {
        var state_2 = _loop_2(i);
        if (typeof state_2 === "object")
            return state_2.value;
    }
    // no optimal adaptation
    return null;
}
function findPeriodIndex(periods, period) {
    for (var i = 0; i < periods.length(); i++) {
        var periodI = periods.get(i);
        if (periodI.period.id === period.id) {
            return i;
        }
    }
}
function getPeriodItem(periods, period) {
    for (var i = 0; i < periods.length(); i++) {
        var periodI = periods.get(i);
        if (periodI.period.id === period.id) {
            return periodI;
        }
    }
}
/**
 * Parse video Representation into a ITMVideoRepresentation.
 * @param {Object} representation
 * @returns {Object}
 */
function parseVideoRepresentation(_a) {
    var id = _a.id, bitrate = _a.bitrate, frameRate = _a.frameRate, width = _a.width, height = _a.height, codec = _a.codec;
    return { id: id,
        bitrate: bitrate,
        frameRate: frameRate,
        width: width,
        height: height,
        codec: codec };
}
