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
import log from "../../../log";
import getLastPositionFromAdaptation from "./get_last_time_from_adaptation";
/**
 * @param {Object} manifest
 * @returns {number | undefined}
 */
export default function getMaximumPosition(manifest) {
    for (var i = manifest.periods.length - 1; i >= 0; i--) {
        var periodAdaptations = manifest.periods[i].adaptations;
        var firstAudioAdaptationFromPeriod = periodAdaptations.audio == null ?
            undefined :
            periodAdaptations.audio[0];
        var firstVideoAdaptationFromPeriod = periodAdaptations.video == null ?
            undefined :
            periodAdaptations.video[0];
        if (firstAudioAdaptationFromPeriod != null ||
            firstVideoAdaptationFromPeriod != null) {
            // null == no segment
            var maximumAudioPosition = null;
            var maximumVideoPosition = null;
            if (firstAudioAdaptationFromPeriod != null) {
                var lastPosition = getLastPositionFromAdaptation(firstAudioAdaptationFromPeriod);
                if (lastPosition === undefined) {
                    return undefined;
                }
                maximumAudioPosition = lastPosition;
            }
            if (firstVideoAdaptationFromPeriod != null) {
                var lastPosition = getLastPositionFromAdaptation(firstVideoAdaptationFromPeriod);
                if (lastPosition === undefined) {
                    return undefined;
                }
                maximumVideoPosition = lastPosition;
            }
            if ((firstAudioAdaptationFromPeriod != null && maximumAudioPosition === null) ||
                (firstVideoAdaptationFromPeriod != null && maximumVideoPosition === null)) {
                log.info("DASH Parser: found Period with no segment. ", "Going to previous one to calculate last position");
                return undefined;
            }
            if (maximumVideoPosition != null) {
                if (maximumAudioPosition != null) {
                    return Math.min(maximumAudioPosition, maximumVideoPosition);
                }
                return maximumVideoPosition;
            }
            if (maximumAudioPosition != null) {
                return maximumAudioPosition;
            }
        }
    }
}
